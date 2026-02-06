'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAdminProducts, deleteProduct, setProductOutOfStock, updateProduct } from '@/lib/services/products';
import { getCategoriesForAdmin, type Category } from '@/lib/services/categories';
import { useAuth } from '@/lib/store/auth-store';
import { type Product } from '@/types/product';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, Package, Image as ImageIcon, Search, Loader2, XCircle, Eye, EyeOff, DollarSign, Ban } from 'lucide-react';
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
  const productsListRef = useRef<HTMLDivElement>(null);
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
        loadProducts();
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
      loadProducts();
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
      loadProducts();
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
      loadProducts();
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
      loadProducts();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar la categoría',
      });
    } finally {
      setUpdatingCategoryProductId(null);
    }
  };

  // Mostrar loading mientras se cargan las tiendas inicialmente
  if (authState.user && authState.stores.length === 0 && !message) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Cargando tiendas...</div>
      </div>
    );
  }

  // Full-page loading solo en la primera carga de la tienda. Luego mantener tabla o empty state y usar overlay.
  const initialLoad = loading && selectedStoreId && !hasLoadedOnce;
  if (initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">{dict.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
            {dict.admin.products.list.title}
          </h1>
          {selectedStoreId && (
            <p className="text-sm text-neutral-400">
              {products.length < total
                ? `${products.length} de ${total} ${total === 1 ? 'producto' : 'productos'}`
                : `${total} ${total === 1 ? 'producto' : 'productos'}`}
            </p>
          )}
        </div>
        <Link href="/admin/products/create" className="w-full sm:w-auto">
          <Button variant="primary" className="h-11 w-full justify-center sm:h-auto sm:w-auto">
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
        <div ref={productsListRef} className="relative bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-2xl sm:rounded-3xl overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/30 rounded-2xl sm:rounded-3xl pointer-events-none">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}
          {/* Desktop: cards con imagen grande arriba y orden */}
          <div className="hidden md:block p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {products.map((product, index) => {
                const currentPosition = (product.sortOrder != null ? product.sortOrder : index) + 1;
                return (
                <motion.article
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40 flex flex-col"
                >
                  {/* Imagen ocupa todo el ancho arriba para verla bien al ordenar */}
                  <div className="relative w-full aspect-square bg-neutral-800 border-b border-neutral-700 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0]}
                        alt={product.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                        unoptimized={product.images[0].startsWith('data:')}
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-neutral-600" />
                    )}
                  </div>
                  <div className="p-4 lg:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm lg:text-base font-medium leading-snug text-neutral-100 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Código <span className="font-mono text-neutral-400">{product.sku || '—'}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={getProductCategoryId(product)}
                        onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                        disabled={updatingCategoryProductId === product.id || categories.length === 0}
                        className={cn(
                          'min-w-0 max-w-full rounded-lg border bg-neutral-800/50 px-2 py-1.5 text-xs text-neutral-100',
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold tabular-nums text-neutral-100">
                        {product.currency} {product.basePrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Stock <span className="font-medium tabular-nums text-neutral-400">{product.stock}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-stretch border-t border-neutral-700/60">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="flex flex-1 min-w-0 items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 hover:text-primary-400 border-r border-neutral-700/60"
                    >
                      <Edit className="h-3.5 w-3.5 flex-shrink-0" />
                      {dict.admin.products.list.edit}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(product)}
                      className={cn(
                        'flex flex-1 min-w-0 items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium transition-colors border-r border-neutral-700/60',
                        product.visibleInStore
                          ? 'text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                          : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-300'
                      )}
                      title={product.visibleInStore ? 'Ocultar en tienda' : 'Mostrar en tienda'}
                    >
                      {product.visibleInStore ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span className="truncate">{product.visibleInStore ? 'Visible' : 'Oculto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHidePrice(product)}
                      disabled={updatingHidePriceProductId === product.id}
                      className={cn(
                        'flex flex-1 min-w-0 items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium transition-colors border-r border-neutral-700/60',
                        product.hidePrice === true
                          ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                          : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-300'
                      )}
                      title={product.hidePrice ? 'Mostrar precio en tienda' : 'Ocultar precio en tienda'}
                    >
                      {updatingHidePriceProductId === product.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-400" />
                      ) : product.hidePrice === true ? (
                        <Ban className="h-3.5 w-3.5" />
                      ) : (
                        <DollarSign className="h-3.5 w-3.5" />
                      )}
                      <span className="truncate">{product.hidePrice ? 'Precio oculto' : 'Precio visible'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOutOfStock(product.id)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium text-neutral-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400 border-r border-neutral-700/60"
                      title="Poner stock en 0"
                    >
                      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">Sin stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="flex flex-1 min-w-0 items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
                      {dict.admin.products.list.delete}
                    </button>
                  </div>
                </motion.article>
              );
              })}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 px-3 py-4 sm:px-4 sm:py-5">
            {products.map((product, index) => {
              const currentPosition = (product.sortOrder != null ? product.sortOrder : index) + 1;
              return (
              <motion.article
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40"
              >
                <div className="flex gap-4 p-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0]}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                        unoptimized={product.images[0].startsWith('data:')}
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-neutral-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-[15px] font-medium leading-snug text-neutral-100 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Código <span className="font-mono text-neutral-400">{product.sku}</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-base font-semibold tabular-nums text-neutral-100">
                        {product.currency} {product.basePrice.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={getProductCategoryId(product)}
                          onChange={(e) => handleCategoryChange(product.id, e.target.value)}
                          disabled={updatingCategoryProductId === product.id || categories.length === 0}
                          className="min-w-0 max-w-[140px] rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1 text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:opacity-50"
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
                    <p className="text-xs text-neutral-500">
                      Stock <span className="font-medium tabular-nums text-neutral-400">{product.stock}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col border-t border-neutral-700/60">
                  {/* Orden: input numérico */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-700/60">
                    <span className="text-xs font-medium text-neutral-400">Orden</span>
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
                        className="w-16 rounded-lg border border-neutral-600 bg-neutral-800/50 px-2 py-1.5 text-center text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 disabled:opacity-50"
                      />
                      {updatingSortOrderProductId === product.id && (
                        <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary-400" />
                      )}
                    </div>
                  </div>
                  {/* Primera fila: Editar y Visible/Oculto */}
                  <div className="flex">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 hover:text-primary-400 active:bg-neutral-700 border-r border-neutral-700/60"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(product)}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors active:bg-neutral-700/30 border-r border-neutral-700/60",
                        product.visibleInStore
                          ? "text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                          : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-300"
                      )}
                    >
                      {product.visibleInStore ? (
                        <>
                          <Eye className="h-4 w-4" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Oculto
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHidePrice(product)}
                      disabled={updatingHidePriceProductId === product.id}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors active:bg-neutral-700/30",
                        product.hidePrice === true
                          ? "text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                          : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-300"
                      )}
                    >
                      {updatingHidePriceProductId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
                      ) : product.hidePrice === true ? (
                        <>
                          <Ban className="h-4 w-4" />
                          Precio oculto
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Precio visible
                        </>
                      )}
                    </button>
                  </div>
                  {/* Segunda fila: Sin stock y Eliminar */}
                  <div className="flex border-t border-neutral-700/60">
                    <button
                      type="button"
                      onClick={() => handleOutOfStock(product.id)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400 active:bg-orange-500/15 border-r border-neutral-700/60"
                    >
                      <XCircle className="h-4 w-4" />
                      Sin stock
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400 active:bg-red-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.article>
            );
            })}
          </div>

          {/* Sentinel para scroll infinito */}
          {total > 0 && products.length < total && (
            <div
              ref={loadMoreSentinelRef}
              className="flex items-center justify-center py-6 border-t border-neutral-800"
            >
              {loadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
              )}
            </div>
          )}
          {total > 0 && products.length >= total && products.length > 0 && (
            <p className="py-4 text-center text-sm text-neutral-500 border-t border-neutral-800">
              Todos los productos cargados
            </p>
          )}
        </div>
      )}
    </div>
  );
}
