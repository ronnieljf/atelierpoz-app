'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAdminProducts, deleteProduct, setProductOutOfStock, updateProduct } from '@/lib/services/products';
import { getCategoriesForAdmin, type Category } from '@/lib/services/categories';
import { useAuth } from '@/lib/store/auth-store';
import { type Product } from '@/types/product';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Search, Loader2, XCircle, Eye, EyeOff, DollarSign, Ban } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

const dict = getDictionary('es');

const DEFAULT_PAGE_SIZE = 20;

export default function ProductsListPage() {
  const { state: authState, loadStores } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingCategoryProductId, setUpdatingCategoryProductId] = useState<string | null>(null);
  const [updatingSortOrderProductId, setUpdatingSortOrderProductId] = useState<string | null>(null);
  const [updatingHidePriceProductId, setUpdatingHidePriceProductId] = useState<string | null>(null);
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [updatingPriceProductId, setUpdatingPriceProductId] = useState<string | null>(null);
  const productsListRef = useRef<HTMLDivElement>(null);

  /** Producto sin variantes (combinations): se puede editar el precio desde la lista */
  const canEditPrice = (p: Product) => !p.combinations || p.combinations.length === 0;
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

  useEffect(() => {
    if (authState.stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId]);

  useEffect(() => {
    if (!selectedStoreId) {
      setCategories([]);
      setCategoryId('');
      return;
    }
    setCategoryId('');
    getCategoriesForAdmin(selectedStoreId).then(setCategories).catch(() => setCategories([]));
  }, [selectedStoreId]);

  const loadProducts = useCallback(async () => {
    if (!selectedStoreId) {
      setLoading(false);
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const minPriceNum = priceMin.trim() ? parseFloat(priceMin) : undefined;
      const maxPriceNum = priceMax.trim() ? parseFloat(priceMax) : undefined;
      const res = await getAdminProducts(selectedStoreId, {
        limit: pageSize,
        offset: 0,
        search: search.trim() || undefined,
        categoryId: categoryId.trim() || undefined,
        minPrice: minPriceNum != null && !Number.isNaN(minPriceNum) ? minPriceNum : undefined,
        maxPrice: maxPriceNum != null && !Number.isNaN(maxPriceNum) ? maxPriceNum : undefined,
      });
      setProducts(res.products);
      setTotal(res.total);
      setHasLoadedOnce(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar productos',
      });
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, pageSize, search, categoryId, priceMin, priceMax]);

  const loadMore = useCallback(async () => {
    if (!selectedStoreId || loadingMore || products.length >= total || total === 0) return;
    setLoadingMore(true);
    setMessage(null);
    try {
      const minPriceNum = priceMin.trim() ? parseFloat(priceMin) : undefined;
      const maxPriceNum = priceMax.trim() ? parseFloat(priceMax) : undefined;
      const res = await getAdminProducts(selectedStoreId, {
        limit: pageSize,
        offset: products.length,
        search: search.trim() || undefined,
        categoryId: categoryId.trim() || undefined,
        minPrice: minPriceNum != null && !Number.isNaN(minPriceNum) ? minPriceNum : undefined,
        maxPrice: maxPriceNum != null && !Number.isNaN(maxPriceNum) ? maxPriceNum : undefined,
      });
      setProducts((prev) => [...prev, ...res.products]);
      setTotal(res.total);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar más productos',
      });
    } finally {
      setLoadingMore(false);
    }
  }, [selectedStoreId, pageSize, search, categoryId, priceMin, priceMax, products.length, total, loadingMore]);

  useEffect(() => {
    if (selectedStoreId) loadProducts();
    else {
      setProducts([]);
      setTotal(0);
      setLoading(false);
      setHasLoadedOnce(false);
    }
  }, [selectedStoreId, loadProducts]);

  // Scroll infinito: cargar más cuando el sentinel entra en vista
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || total === 0 || products.length >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !loadingMore && products.length < total) {
          loadMore();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [products.length, total, loadingMore, loadMore]);

  const handleSortOrderChange = async (productId: string, positionInput: number) => {
    if (!selectedStoreId || positionInput < 1) return;
    const sortOrder = positionInput - 1;
    setUpdatingSortOrderProductId(productId);
    setMessage(null);
    try {
      await updateProduct(productId, {
        storeId: selectedStoreId,
        sortOrder,
      });
      setMessage({ type: 'success', text: 'Orden actualizado' });
      // Actualizar solo en estado local para no recargar la lista ni perder scroll/paginación
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, sortOrder } : p))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar el orden',
      });
    } finally {
      setUpdatingSortOrderProductId(null);
    }
  };

  const handleFilterChange = () => {
  };

  const handleDelete = async (id: string) => {
    if (!confirm(dict.admin.products.list.deleteConfirm)) return;
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'No hay tienda seleccionada' });
      return;
    }
    try {
      const success = await deleteProduct(id, selectedStoreId);
      if (success) {
        setMessage({ type: 'success', text: dict.admin.products.list.deleteSuccess });
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        setMessage({ type: 'error', text: dict.admin.products.list.deleteError });
      }
    } catch {
      setMessage({ type: 'error', text: dict.admin.products.list.deleteError });
    }
  };

  const handleOutOfStock = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres poner el stock de este producto en 0?')) return;
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'No hay tienda seleccionada' });
      return;
    }
    try {
      await setProductOutOfStock(id, selectedStoreId);
      setMessage({ type: 'success', text: 'Stock del producto actualizado a 0' });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: 0 } : p)));
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar el stock del producto',
      });
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'No hay tienda seleccionada' });
      return;
    }
    try {
      const newVisibility = !product.visibleInStore;
      await updateProduct(product.id, {
        storeId: selectedStoreId,
        visibleInStore: newVisibility,
      });
      setMessage({
        type: 'success',
        text: `Producto ${newVisibility ? 'visible' : 'oculto'} en la tienda`,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, visibleInStore: newVisibility } : p))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar la visibilidad del producto',
      });
    }
  };

  const handleToggleHidePrice = async (product: Product) => {
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'No hay tienda seleccionada' });
      return;
    }
    setUpdatingHidePriceProductId(product.id);
    setMessage(null);
    try {
      const newHidePrice = !(product.hidePrice === true);
      await updateProduct(product.id, {
        storeId: selectedStoreId,
        hidePrice: newHidePrice,
      });
      setMessage({
        type: 'success',
        text: newHidePrice ? 'Precio oculto en la tienda' : 'Precio visible en la tienda',
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, hidePrice: newHidePrice } : p))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar la visibilidad del precio',
      });
    } finally {
      setUpdatingHidePriceProductId(null);
    }
  };

  /** Obtener el categoryId actual del producto (API puede devolver categoryId o solo category slug) */
  const getProductCategoryId = (product: Product): string => {
    const p = product as Product & { categoryId?: string };
    if (p.categoryId) return p.categoryId;
    const found = categories.find((c) => c.slug === product.category || c.id === product.category);
    return found?.id ?? '';
  };

  const handleCategoryChange = async (productId: string, newCategoryId: string) => {
    if (!selectedStoreId || !newCategoryId) return;
    setUpdatingCategoryProductId(productId);
    setMessage(null);
    try {
      await updateProduct(productId, {
        storeId: selectedStoreId,
        categoryId: newCategoryId,
      });
      setMessage({ type: 'success', text: 'Categoría actualizada' });
      const cat = categories.find((c) => c.id === newCategoryId);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, categoryId: newCategoryId, category: cat?.slug ?? cat?.name ?? p.category }
            : p
        )
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar la categoría',
      });
    } finally {
      setUpdatingCategoryProductId(null);
    }
  };

  const handlePriceSave = async (productId: string, newPriceStr: string, product: Product) => {
    if (!selectedStoreId) return;
    const num = parseFloat(newPriceStr.replace(',', '.'));
    if (Number.isNaN(num) || num < 0) {
      setMessage({ type: 'error', text: 'El precio debe ser un número mayor o igual a 0' });
      setEditingPriceProductId(null);
      return;
    }
    if (Math.abs(num - product.basePrice) < 0.005) {
      setEditingPriceProductId(null);
      return;
    }
    setEditingPriceProductId(null);
    setUpdatingPriceProductId(productId);
    setMessage(null);
    try {
      await updateProduct(productId, {
        storeId: selectedStoreId,
        basePrice: num,
      });
      setMessage({ type: 'success', text: 'Precio actualizado' });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, basePrice: num } : p))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar el precio',
      });
    } finally {
      setUpdatingPriceProductId(null);
    }
  };

  // Full-page loading solo en la primera carga de la tienda. Luego mantener tabla o empty state y usar overlay.
  const initialLoad = loading && selectedStoreId && !hasLoadedOnce;
  if (initialLoad) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" aria-hidden />
        <p className="text-sm font-light text-neutral-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
              {dict.admin.products.list.title}
            </h1>
            <Tooltip content="Gestiona todos los productos de tu tienda: edita precios, stock, visibilidad y más." />
          </div>
          {selectedStoreId && (
            <p className="text-sm text-neutral-400">
              {products.length < total
                ? `${products.length} de ${total} ${total === 1 ? 'producto' : 'productos'}`
                : `${total} ${total === 1 ? 'producto' : 'productos'}`}
            </p>
          )}
        </div>
        <Link href="/admin/products/create" className="w-full sm:w-auto">
          <Button variant="primary" className="h-11 w-full justify-center sm:h-auto sm:w-auto" title="Crear un nuevo producto">
            <Plus className="h-4 w-4 mr-2" />
            {dict.admin.navigation.createProduct}
          </Button>
        </Link>
      </div>

      {/* Selector de Tienda */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6 mb-4 sm:mb-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">
          Tienda
        </label>
        {authState.stores.length === 0 ? (
          <div className="text-sm text-neutral-400">
            No tienes acceso a ninguna tienda
          </div>
        ) : (
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setProducts([]);
              setTotal(0);
              setSearchInput('');
              setSearch('');
              setCategoryId('');
              setPriceMin('');
              setPriceMax('');
              setHasLoadedOnce(false);
            }}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
          >
            <option value="">
              {authState.stores.length === 0 
                ? 'No hay tiendas disponibles' 
                : 'Selecciona una tienda...'}
            </option>
            {authState.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedStoreId && (
        <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Filtros</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Nombre, código o categoría…"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 py-3 pl-10 pr-3 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:py-2.5 sm:pl-9 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); handleFilterChange(); }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Precio mínimo</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={priceMin}
                onChange={(e) => { setPriceMin(e.target.value); handleFilterChange(); }}
                placeholder="Ej: 0"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Precio máximo</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={priceMax}
                onChange={(e) => { setPriceMax(e.target.value); handleFilterChange(); }}
                placeholder="Ej: 100"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-4 rounded-xl border p-4 sm:mb-6',
              message.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedStoreId ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Package className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Selecciona una tienda
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            Elige una tienda arriba para ver sus productos
          </p>
        </div>
      ) : !loading && total === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Package className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            {search.trim() || categoryId || priceMin || priceMax ? 'No hay resultados' : dict.admin.products.list.empty}
          </h3>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">
            {search.trim() || categoryId || priceMin || priceMax
              ? 'Prueba otros filtros o limpia la búsqueda.'
              : dict.admin.products.list.emptyDescription}
          </p>
          {search.trim() || categoryId || priceMin || priceMax ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setCategoryId('');
                setPriceMin('');
                setPriceMax('');
              }}
              className="h-11 min-w-[140px] px-5"
            >
              Limpiar filtros
            </Button>
          ) : (
            <Link href="/admin/products/create">
              <Button variant="primary" className="h-11 min-w-[180px] gap-2 px-5">
                <Plus className="h-4 w-4" />
                {dict.admin.navigation.createProduct}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div ref={productsListRef} className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/50 pointer-events-none">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}
          {/* Desktop: cards con diseño uniforme */}
          <div className="hidden md:block">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {products.map((product, index) => {
                const currentPosition = (product.sortOrder != null ? product.sortOrder : index) + 1;
                return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40 flex flex-col h-full"
                >
                  {/* Imagen con aspect ratio fijo */}
                  <div className="relative w-full aspect-square bg-neutral-800 border-b border-neutral-700 flex items-center justify-center overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        unoptimized={product.images[0].startsWith('data:')}
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-neutral-600" />
                    )}
                  </div>
                  
                  {/* Información del producto con altura fija */}
                  <div className="p-4 lg:p-5 flex flex-col flex-1">
                    {/* Sección superior: nombre y orden */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm lg:text-base font-medium leading-snug text-neutral-100 line-clamp-2 min-h-[2.5rem]">
                            {product.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <label className="text-xs text-neutral-500 whitespace-nowrap">Orden</label>
                          <input
                            type="number"
                            min={1}
                            defaultValue={currentPosition}
                            disabled={updatingSortOrderProductId === product.id}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!Number.isNaN(v) && v >= 1 && v !== currentPosition) {
                                handleSortOrderChange(product.id, v);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="w-14 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1.5 text-center text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:opacity-50"
                          />
                          {updatingSortOrderProductId === product.id && (
                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Código y categoría */}
                      <p className="text-xs text-neutral-500 mb-2">
                        Código <span className="font-mono text-neutral-400">{product.sku || '—'}</span>
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={getProductCategoryId(product)}
                          onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                          disabled={updatingCategoryProductId === product.id || categories.length === 0}
                          className={cn(
                            'flex-1 rounded-lg border bg-neutral-800/50 px-2 py-1.5 text-xs text-neutral-100',
                            'border-neutral-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          <option value="">Sin categoría</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {updatingCategoryProductId === product.id && (
                          <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                        )}
                      </div>
                    </div>
                    
                    {/* Precio y stock - siempre en la misma posición; precio editable solo sin variantes */}
                    <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-neutral-700/40">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs text-neutral-500">Precio</span>
                        {canEditPrice(product) ? (
                          editingPriceProductId === product.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-neutral-500 text-xs">{product.currency}</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                defaultValue={product.basePrice}
                                disabled={updatingPriceProductId === product.id}
                                onBlur={(e) => handlePriceSave(product.id, e.target.value, product)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                }}
                                className="w-24 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                                autoFocus
                              />
                              {updatingPriceProductId === product.id && (
                                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingPriceProductId(product.id)}
                              disabled={updatingPriceProductId === product.id}
                              className="text-left font-semibold tabular-nums text-neutral-100 text-base hover:text-primary-400 transition-colors disabled:opacity-50"
                              title="Clic para editar precio"
                            >
                              {updatingPriceProductId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin inline-block" />
                              ) : (
                                `${product.currency} ${product.basePrice.toFixed(2)}`
                              )}
                            </button>
                          )
                        ) : (
                          <span className="font-semibold tabular-nums text-neutral-100 text-base">
                            {product.currency} {product.basePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs text-neutral-500">Stock</span>
                        <span className="font-medium tabular-nums text-neutral-400">{product.stock}</span>
                      </div>
                    </div>
                  </div>
                  {/* Botones de acción organizados en bloques claros */}
                  <div className="mt-auto flex flex-col border-t border-neutral-700/60">
                    {/* Fila 1: Editar (más prominente) */}
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/10 border-b border-neutral-700/60"
                      title="Editar toda la información del producto"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Editar producto</span>
                      <Tooltip content="Modifica nombre, precio, stock, imágenes y más" />
                    </Link>
                    
                    {/* Fila 2: Visibilidad y precio */}
                    <div className="grid grid-cols-2 border-b border-neutral-700/60">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(product)}
                        className={cn(
                          'flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-r border-neutral-700/60',
                          product.visibleInStore
                            ? 'text-blue-400 hover:bg-blue-500/10'
                            : 'text-neutral-400 hover:bg-neutral-700/50'
                        )}
                        title={product.visibleInStore ? 'Ocultar en la tienda pública' : 'Mostrar en la tienda pública'}
                      >
                        {product.visibleInStore ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        <span>{product.visibleInStore ? 'Visible' : 'Oculto'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleHidePrice(product)}
                        disabled={updatingHidePriceProductId === product.id}
                        className={cn(
                          'flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors disabled:opacity-50',
                          product.hidePrice === true
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-neutral-400 hover:bg-neutral-700/50'
                        )}
                        title={product.hidePrice ? 'Mostrar precio en tienda' : 'Ocultar precio (consultar)'}
                      >
                        {updatingHidePriceProductId === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
                        ) : product.hidePrice === true ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                        <span>{product.hidePrice ? 'Precio oculto' : 'Precio visible'}</span>
                      </button>
                    </div>
                    
                    {/* Fila 3: Acciones destructivas */}
                    <div className="grid grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleOutOfStock(product.id)}
                        className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/10 border-r border-neutral-700/60"
                        title="Poner el stock de este producto en 0"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Agotar stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        title="Eliminar permanentemente este producto"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
              })}
            </div>
          </div>

          {/* Mobile Cards con diseño uniforme */}
          <div className="md:hidden space-y-3">
            {products.map((product, index) => {
              const currentPosition = (product.sortOrder != null ? product.sortOrder : index) + 1;
              return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40 flex flex-col"
              >
                {/* Imagen con aspect ratio fijo */}
                <div className="relative w-full aspect-video bg-neutral-800 border-b border-neutral-700 flex items-center justify-center overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="100vw"
                      unoptimized={product.images[0].startsWith('data:')}
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-neutral-600" />
                  )}
                </div>
                
                {/* Información del producto */}
                <div className="p-4 flex flex-col">
                  {/* Nombre fijo de 2 líneas */}
                  <h3 className="text-[15px] font-medium leading-snug text-neutral-100 line-clamp-2 min-h-[2.6rem] mb-2">
                    {product.name}
                  </h3>
                  
                  {/* Código */}
                  <p className="text-xs text-neutral-500 mb-3">
                    Código <span className="font-mono text-neutral-400">{product.sku}</span>
                  </p>
                  
                  {/* Categoría */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <select
                      value={getProductCategoryId(product)}
                      onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                      disabled={updatingCategoryProductId === product.id || categories.length === 0}
                      className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1.5 text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:opacity-50"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {updatingCategoryProductId === product.id && (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                    )}
                  </div>
                  
                  {/* Precio y stock; precio editable solo sin variantes */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-700/40">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-xs text-neutral-500">Precio</span>
                      {canEditPrice(product) ? (
                        editingPriceProductId === product.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-500 text-xs">{product.currency}</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              defaultValue={product.basePrice}
                              disabled={updatingPriceProductId === product.id}
                              onBlur={(e) => handlePriceSave(product.id, e.target.value, product)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              className="w-24 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                              autoFocus
                            />
                            {updatingPriceProductId === product.id && (
                              <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingPriceProductId(product.id)}
                            disabled={updatingPriceProductId === product.id}
                            className="text-left text-base font-semibold tabular-nums text-neutral-100 hover:text-primary-400 transition-colors disabled:opacity-50"
                            title="Toca para editar precio"
                          >
                            {updatingPriceProductId === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin inline-block" />
                            ) : (
                              `${product.currency} ${product.basePrice.toFixed(2)}`
                            )}
                          </button>
                        )
                      ) : (
                        <span className="text-base font-semibold tabular-nums text-neutral-100">
                          {product.currency} {product.basePrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-neutral-500">Stock</span>
                      <span className="font-medium tabular-nums text-neutral-400">{product.stock}</span>
                    </div>
                  </div>
                </div>
                {/* Botones de acción organizados - Mobile */}
                <div className="flex flex-col border-t border-neutral-700/60">
                  {/* Orden: input numérico */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-700/60 bg-neutral-800/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-300">Orden de aparición</span>
                      <Tooltip content="Número que define en qué posición aparece este producto en la tienda" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        defaultValue={currentPosition}
                        disabled={updatingSortOrderProductId === product.id}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v) && v >= 1 && v !== currentPosition) {
                            handleSortOrderChange(product.id, v);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className="w-16 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1.5 text-center text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:opacity-50"
                      />
                      {updatingSortOrderProductId === product.id && (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Editar (más prominente) */}
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/10 active:bg-primary-500/15 border-b border-neutral-700/60"
                    title="Editar toda la información del producto"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar producto</span>
                  </Link>
                  
                  {/* Visibilidad y Precio */}
                  <div className="grid grid-cols-2 border-b border-neutral-700/60">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(product)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-r border-neutral-700/60",
                        product.visibleInStore
                          ? "text-blue-400 hover:bg-blue-500/10"
                          : "text-neutral-400 hover:bg-neutral-700/50"
                      )}
                      title={product.visibleInStore ? 'Ocultar en tienda' : 'Mostrar en tienda'}
                    >
                      {product.visibleInStore ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      <span>{product.visibleInStore ? 'Visible' : 'Oculto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHidePrice(product)}
                      disabled={updatingHidePriceProductId === product.id}
                      className={cn(
                        "flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors disabled:opacity-50",
                        product.hidePrice === true
                          ? "text-amber-400 hover:bg-amber-500/10"
                          : "text-neutral-400 hover:bg-neutral-700/50"
                      )}
                      title="Mostrar u ocultar precio"
                    >
                      {updatingHidePriceProductId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : product.hidePrice === true ? (
                        <>
                          <Ban className="h-4 w-4" />
                          Sin precio
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Con precio
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Acciones destructivas */}
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleOutOfStock(product.id)}
                      className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/10 active:bg-orange-500/15 border-r border-neutral-700/60"
                      title="Poner stock en 0"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Agotar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
                      title="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
            })}
          </div>

          {/* Sentinel para scroll infinito */}
          {total > 0 && products.length < total && (
            <div ref={loadMoreSentinelRef} className="flex items-center justify-center py-6">
              {loadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
              )}
            </div>
          )}
          {total > 0 && products.length >= total && products.length > 0 && (
            <p className="py-4 text-center text-sm text-neutral-500">
              Todos los productos cargados
            </p>
          )}
        </div>
      )}
    </div>
  );
}
