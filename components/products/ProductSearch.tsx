'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { type Product } from '@/types/product';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { PackageSearch, Search, X, Check, Tag, ChevronDown, ChevronUp, SlidersHorizontal, DollarSign, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getRecentProducts, getStoreProducts, type ProductsResponse } from '@/lib/services/products';
import { getCategoriesByStore, type Category } from '@/lib/services/categories';
import { trackSearch } from '@/lib/analytics/gtag';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductSearchProps {
  storeId?: string; // Si se proporciona, carga productos de esa tienda
  storeName?: string; // Nombre de la tienda (para analytics)
  dict: Dictionary;
  initialProducts?: Product[]; // Productos iniciales (opcional, para SSR)
  /** Slug de categoría desde la URL (ej. /tienda-id/category/ropa) para filtrar y sincronizar estado */
  initialCategorySlug?: string;
}

const PRODUCTS_PER_PAGE = 20;
const STORAGE_KEY = 'productSearchState';

// Función helper para guardar estado en localStorage
function saveSearchState(page: number, search: string, storeId?: string) {
  if (typeof window === 'undefined') return;
  
  const state = {
    page,
    search,
    storeId: storeId || null,
    timestamp: Date.now(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Función helper para cargar estado desde localStorage
function loadSearchState(storeId?: string): { page: number; search: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    
    // Solo usar el estado guardado si es del mismo storeId (o ambos son null)
    if (state.storeId === (storeId || null)) {
      // El estado es válido por 30 minutos
      const maxAge = 30 * 60 * 1000; // 30 minutos
      if (Date.now() - state.timestamp < maxAge) {
        return {
          page: state.page || 1,
          search: state.search || '',
        };
      }
    }
  } catch (error) {
    console.error('Error loading search state:', error);
  }
  
  return null;
}

export function ProductSearch({ storeId, storeName, dict, initialProducts = [], initialCategorySlug }: ProductSearchProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const storePath = pathname.includes('/category/') ? pathname.replace(/\/category\/[^/]+$/, '') : pathname;
  
  // Restaurar búsqueda desde URL o localStorage (página siempre empieza en 1 por scroll infinito)
  const urlSearch = searchParams.get('search') || '';
  const savedState = loadSearchState(storeId);
  
  const [searchTerm, setSearchTerm] = useState(urlSearch || savedState?.search || '');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(initialProducts.length === PRODUCTS_PER_PAGE);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const priceDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);

  // Filtros
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [debouncedPriceMin, setDebouncedPriceMin] = useState('');
  const [debouncedPriceMax, setDebouncedPriceMax] = useState('');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q)));
  }, [categories, categorySearch]);

  /** Solo envía min/max al endpoint cuando ambos tienen valor y pasan validación: ambos >= 0, min < max */
  const validPriceFilter = useMemo(() => {
    const minStr = debouncedPriceMin.trim();
    const maxStr = debouncedPriceMax.trim();
    if (!minStr || !maxStr) return { minPrice: undefined as number | undefined, maxPrice: undefined as number | undefined, error: null as string | null };
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (Number.isNaN(min) || Number.isNaN(max)) return { minPrice: undefined, maxPrice: undefined, error: 'Ingresa valores numéricos válidos' };
    if (min < 0 || max < 0) return { minPrice: undefined, maxPrice: undefined, error: 'Los precios deben ser mayor o igual a 0' };
    if (min >= max) return { minPrice: undefined, maxPrice: undefined, error: 'El precio mínimo debe ser menor al máximo' };
    return { minPrice: min, maxPrice: max, error: null };
  }, [debouncedPriceMin, debouncedPriceMax]);

  // Solo en página de tienda: cargar categorías de la tienda para el filtro
  useEffect(() => {
    if (storeId) {
      getCategoriesByStore(storeId).then(setCategories).catch(() => setCategories([]));
    } else {
      setCategories([]);
    }
  }, [storeId]);

  // Sincronizar categoryId desde la URL (initialCategorySlug) cuando las categorías estén cargadas
  useEffect(() => {
    if (!initialCategorySlug?.trim() || categories.length === 0) return;
    const cat = categories.find((c) => c.slug === initialCategorySlug.trim());
    if (cat) setCategoryId(cat.id);
  }, [initialCategorySlug, categories]);

  // Debounce para precios (500ms); solo aplicamos filtro cuando ambos tienen valor y son válidos
  useEffect(() => {
    if (priceDebounceTimerRef.current) clearTimeout(priceDebounceTimerRef.current);
    priceDebounceTimerRef.current = setTimeout(() => {
      setDebouncedPriceMin(priceMin);
      setDebouncedPriceMax(priceMax);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (priceDebounceTimerRef.current) clearTimeout(priceDebounceTimerRef.current);
    };
  }, [priceMin, priceMax]);

  // Función para cargar productos desde el backend (precio solo se envía cuando ambos min/max tienen valor y son válidos)
  // page === 1: reemplaza la lista; page > 1: añade al final (scroll infinito)
  const loadProducts = useCallback(async (
    searchQuery: string = '',
    page: number = 1,
    filterCategoryId?: string,
    filterMinPrice?: number,
    filterMaxPrice?: number
  ) => {
    if (searchQuery?.trim() && page === 1) {
      trackSearch(searchQuery.trim(), storeId, storeName);
    }
    const isFirstPage = page === 1;
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const offset = (page - 1) * PRODUCTS_PER_PAGE;
      let result: ProductsResponse;

      if (storeId) {
        result = await getStoreProducts(storeId, PRODUCTS_PER_PAGE, offset, searchQuery || undefined, {
          categoryId: filterCategoryId?.trim() || undefined,
          minPrice: filterMinPrice,
          maxPrice: filterMaxPrice,
        });
      } else {
        result = await getRecentProducts(PRODUCTS_PER_PAGE, offset, searchQuery || undefined, {
          categoryId: filterCategoryId?.trim() || undefined,
          minPrice: filterMinPrice,
          maxPrice: filterMaxPrice,
        });
      }

      if (isFirstPage) {
        setProducts(result.products);
      } else {
        setProducts((prev) => [...prev, ...result.products]);
      }
      setHasMoreProducts(result.products.length === PRODUCTS_PER_PAGE);
    } catch (err: unknown) {
      console.error('Error cargando productos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      if (isFirstPage) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [storeId, storeName]);

  // Estado para el término de búsqueda con debounce
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce para la búsqueda
  useEffect(() => {
    // Limpiar el timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Si el término de búsqueda está vacío, actualizar inmediatamente
    if (searchTerm === '') {
      setDebouncedSearchTerm('');
      setCurrentPage(1);
      return;
    }

    // Esperar 500ms antes de actualizar el término de búsqueda con debounce
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Resetear a la primera página cuando se busca
    }, 500);

    // Limpiar el timer al desmontar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Guardar estado cuando cambia la página o búsqueda
  useEffect(() => {
    saveSearchState(currentPage, debouncedSearchTerm, storeId);
  }, [currentPage, debouncedSearchTerm, storeId]);

  // Actualizar URL solo con búsqueda (no página; scroll infinito no persiste página)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const newUrl = debouncedSearchTerm
      ? `${pathname}?search=${encodeURIComponent(debouncedSearchTerm)}`
      : pathname;
    window.history.replaceState({}, '', newUrl);
  }, [debouncedSearchTerm, pathname]);

  // En vista de tienda: cuando cambian los filtros (categoría o precio), volver a página 1 y limpiar lista para que la paginación sea sobre los resultados filtrados
  const effectiveCategoryId = storeId ? (categoryId || undefined) : undefined;
  const filtersChangedRef = useRef(false);
  useEffect(() => {
    if (!filtersChangedRef.current) {
      filtersChangedRef.current = true;
      return;
    }
    setCurrentPage(1);
    setProducts([]);
    setHasMoreProducts(false);
  }, [effectiveCategoryId, debouncedPriceMin, debouncedPriceMax]);

  // Cargar productos cuando cambia la página, storeId, búsqueda o filtros (precio solo si ambos tienen valor y son válidos)
  useEffect(() => {
    if (initialProducts.length > 0 && !hasInitialized.current && currentPage === 1 && debouncedSearchTerm === '' && !effectiveCategoryId && !debouncedPriceMin && !debouncedPriceMax) {
      hasInitialized.current = true;
      return;
    }
    const minPrice = validPriceFilter.error == null ? validPriceFilter.minPrice : undefined;
    const maxPrice = validPriceFilter.error == null ? validPriceFilter.maxPrice : undefined;
    loadProducts(debouncedSearchTerm, currentPage, effectiveCategoryId, minPrice, maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, storeId, debouncedSearchTerm, effectiveCategoryId, debouncedPriceMin, debouncedPriceMax, validPriceFilter.error, validPriceFilter.minPrice, validPriceFilter.maxPrice]);

  // Scroll infinito: cargar más cuando el sentinel entra en vista
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel || !hasMoreProducts || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setCurrentPage((prev) => prev + 1);
      },
      { root: null, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreProducts, loading, loadingMore]);

  const hasSearchResults = products.length > 0;
  const displayProducts = products;

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Barra de búsqueda */}
      <div className="sticky top-16 sm:top-20 z-40 -mx-4 sm:-mx-6 bg-neutral-950/95 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-4 rounded-b-2xl md:static md:mx-0 md:px-0 md:py-0 md:rounded-none space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 max-w-4xl mx-auto">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={dict.search.placeholder}
            className="flex-1 w-full"
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border py-3 px-4 text-sm font-medium transition-all duration-200 shrink-0',
              showFilters
                ? 'border-primary-500/60 bg-primary-500/10 text-primary-300'
                : 'border-neutral-700/80 bg-neutral-800/40 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/60',
              (effectiveCategoryId || priceMin || priceMax) && 'ring-1 ring-primary-500/30'
            )}
            aria-expanded={showFilters}
            aria-controls="product-filters-panel"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span>Filtros</span>
            {(effectiveCategoryId || priceMin || priceMax) && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-primary-500/30 text-primary-200 text-xs flex items-center justify-center" aria-hidden>
                •
              </span>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Panel de filtros (visible solo al hacer clic en Filtros) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              id="product-filters-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-800/80 bg-neutral-900/40 px-4 sm:px-5 py-4 sm:py-5 shadow-inner shadow-black/20 mt-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {storeId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium tracking-wide text-neutral-400">Categoría</label>
              <button
                type="button"
                onClick={() => setShowCategoryDialog(true)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-xl border py-3 px-3.5 text-sm text-left transition-all duration-200',
                  'border-neutral-700/80 bg-neutral-800/40 text-neutral-100',
                  'hover:border-neutral-600 hover:bg-neutral-800/60',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/60'
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Tag className="h-4 w-4 flex-shrink-0 text-neutral-500" />
                  <span className="truncate font-medium">
                    {categoryId ? (categories.find((c) => c.id === categoryId)?.name ?? 'Categoría') : 'Todas las categorías'}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-neutral-500" />
              </button>
            </div>
            )}
            <div className="space-y-1.5">
              <label className="mb-1.5 block text-xs font-medium tracking-wide text-neutral-400">Precio mínimo</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== '' && !Number.isNaN(parseFloat(v)) && parseFloat(v) < 0) setPriceMin('0');
                  }}
                  placeholder="0"
                  className={cn(
                    'price-input w-full rounded-xl border py-3 pl-10 pr-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
                    validPriceFilter.error ? 'border-amber-500/60 bg-amber-950/10 focus:border-amber-500' : 'border-neutral-700/80 bg-neutral-800/40 focus:border-primary-500/60'
                  )}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="mb-1.5 block text-xs font-medium tracking-wide text-neutral-400">Precio máximo</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== '' && !Number.isNaN(parseFloat(v)) && parseFloat(v) < 0) setPriceMax('0');
                  }}
                  placeholder="100"
                  className={cn(
                    'price-input w-full rounded-xl border py-3 pl-10 pr-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40',
                    validPriceFilter.error ? 'border-amber-500/60 bg-amber-950/10 focus:border-amber-500' : 'border-neutral-700/80 bg-neutral-800/40 focus:border-primary-500/60'
                  )}
                />
              </div>
            </div>
            {validPriceFilter.error && (debouncedPriceMin.trim() || debouncedPriceMax.trim()) && (
              <p className="text-xs text-amber-400/90 col-span-full flex items-center gap-1.5" role="alert">
                {validPriceFilter.error}
              </p>
            )}
            {(effectiveCategoryId || priceMin || priceMax) && (
              <div className="flex items-end lg:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                    setDebouncedPriceMin('');
                    setDebouncedPriceMax('');
                    setCurrentPage(1);
                    if (storeId && categoryId) {
                      router.push(storePath);
                    } else {
                      setCategoryId('');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-600/80 bg-neutral-800/30 py-3 px-3.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-200"
                >
                  <FilterX className="h-4 w-4" />
                  Limpiar filtros
                </button>
              </div>
            )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

          {/* Diálogo de categorías con buscador */}
          {typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
              {showCategoryDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                  onClick={() => { setShowCategoryDialog(false); setCategorySearch(''); }}
                >
                  <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" aria-hidden />
                  <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md max-h-[88vh] flex flex-col rounded-2xl border border-neutral-700/50 bg-neutral-900/95 shadow-xl shadow-black/30 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/60">
                      <h3 className="text-sm font-medium tracking-wide text-neutral-200">
                        Elegir categoría
                      </h3>
                      <button
                        type="button"
                        onClick={() => { setShowCategoryDialog(false); setCategorySearch(''); }}
                        className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors duration-200"
                        aria-label="Cerrar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="px-4 pt-3 pb-3 border-b border-neutral-800/50">
                      <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-neutral-400 transition-colors duration-200" />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder="Buscar categoría..."
                          className="w-full min-h-[42px] pl-10 pr-4 py-2.5 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 bg-neutral-800/40 border border-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all duration-200"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="category-dialog-scroll flex-1 overflow-y-auto overscroll-contain min-h-0 p-4">
                      {filteredCategories.length === 0 && !categorySearch.trim() ? (
                        <p className="text-sm text-neutral-500 text-center py-10">
                          No hay categorías disponibles.
                        </p>
                      ) : filteredCategories.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-10">
                          Ninguna categoría coincide con &quot;{categorySearch.trim()}&quot;.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCategoryDialog(false);
                                setCategorySearch('');
                                if (storeId) {
                                  router.push(storePath);
                                } else {
                                  setCategoryId('');
                                  setCurrentPage(1);
                                }
                              }}
                              className={cn(
                                'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200',
                                !categoryId
                                  ? 'bg-primary-500/10 border border-primary-500/20 text-primary-200'
                                  : 'bg-neutral-800/20 border border-transparent text-neutral-300 hover:bg-neutral-800/40 hover:border-neutral-700/50'
                              )}
                            >
                              <span className="font-medium text-sm">Todas las categorías</span>
                              {!categoryId && <Check className="h-4 w-4 flex-shrink-0 text-primary-400/90" />}
                            </button>
                          </li>
                          {filteredCategories.map((cat) => {
                            const isSelected = categoryId === cat.id;
                            return (
                              <li key={cat.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCategoryDialog(false);
                                    setCategorySearch('');
                                    if (storeId) {
                                      router.push(`${storePath}/category/${encodeURIComponent(cat.slug)}`);
                                    } else {
                                      setCategoryId(cat.id);
                                      setCurrentPage(1);
                                    }
                                  }}
                                  className={cn(
                                    'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200',
                                    isSelected
                                      ? 'bg-primary-500/10 border border-primary-500/20 text-primary-200'
                                      : 'bg-neutral-800/20 border border-transparent text-neutral-300 hover:bg-neutral-800/40 hover:border-neutral-700/50'
                                  )}
                                >
                                  <span className="font-medium text-sm">{cat.name}</span>
                                  {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary-400/90" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        
        {/* Contador de resultados y toggle de columnas */}
        <div className="flex items-center justify-between">
          {searchTerm && (
            <div className="text-xs font-light text-neutral-500">
              {products.length === 0 ? (
                <span>{dict.search.noResults}</span>
              ) : (
                <span>
                  {products.length}{' '}
                  {products.length === 1
                    ? dict.search.result
                    : dict.search.results}
                </span>
              )}
            </div>
          )}
        </div>

      {/* Resultados: en móvil grid tipo Instagram (3 cols, sin gap, full-bleed) */}
      {loading && products.length === 0 ? (
        <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-none md:left-0 md:translate-x-0 md:w-full">
          <div className="grid grid-cols-2 gap-px sm:gap-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-8">
            {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
              <ProductCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      ) : loading && products.length > 0 ? (
        <>
          <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-none md:left-0 md:translate-x-0 md:w-full">
            <div className="grid grid-cols-2 gap-px sm:gap-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-8">
              {displayProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  dict={dict}
                  priority={index < 4}
                />
              ))}
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCardSkeleton key={`loading-skeleton-${index}`} />
              ))}
            </div>
          </div>
        </>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24">
          <PackageSearch className="mb-6 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-sm font-light text-red-400">
            Error al cargar productos
          </h3>
          <p className="text-xs font-light text-neutral-500">
            {error}
          </p>
        </div>
      ) : !hasSearchResults ? (
        <div className="flex flex-col items-center justify-center py-24">
          <PackageSearch className="mb-6 h-12 w-12 text-neutral-700" />
          <h3 className="mb-2 text-sm font-light text-neutral-400">
            {dict.search.noResults}
          </h3>
          <p className="text-xs font-light text-neutral-500">
            {dict.search.noResultsDescription}
          </p>
        </div>
      ) : (
        <>
          <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-none md:left-0 md:translate-x-0 md:w-full">
            <div className="grid grid-cols-2 gap-px sm:gap-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-8">
              {displayProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  dict={dict}
                  priority={index < 4}
                />
              ))}
            </div>
          </div>

          {/* Sentinel para scroll infinito: al entrar en vista se carga la siguiente página */}
          {hasMoreProducts && (
            <div
              ref={scrollSentinelRef}
              className="min-h-[1px] w-full"
              aria-hidden
            />
          )}

          {loadingMore && (
            <div className="flex justify-center py-8">
              <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-none md:left-0 md:translate-x-0 md:w-full">
                <div className="grid grid-cols-2 gap-px sm:gap-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-8 w-full">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <ProductCardSkeleton key={`more-skeleton-${index}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!hasMoreProducts && products.length > 0 && (
            <p className="text-center text-xs text-neutral-500 py-6">
              No hay más productos
            </p>
          )}
        </>
      )}
    </div>
  );
}
