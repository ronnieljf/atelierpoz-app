'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { getReceivableById } from '@/lib/services/receivables';
import { getRequestById, type Request } from '@/lib/services/requests';
import { updateReceivableItems } from '@/lib/services/receivables';
import { searchProductsForPOS, getProductPOSOptions, type POSProduct } from '@/lib/services/sales';
import type { Receivable } from '@/types/receivable';
import type { CartItem } from '@/types/product';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { resolveImageUrl } from '@/lib/utils/image-url';
import { ArrowLeft, Loader2, Package, Plus, Trash2, Search, ShoppingBag, ChevronDown, X, Minus } from 'lucide-react';

function isHexColor(value: string | undefined): boolean {
  if (value == null || typeof value !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());
}

function posProductToCartItem(
  p: POSProduct,
  qty: number,
  storeId: string,
  storeName: string
): CartItem {
  const unitPrice = p.unitPrice;
  const totalPrice = unitPrice * qty;
  const displayName = p.displayName ?? p.productName;
  return {
    id: `${p.productId}_${p.combinationId ?? 'base'}_${Date.now()}`,
    productId: p.productId,
    productName: displayName,
    productImage: p.imageUrl ?? '',
    productSku: p.sku ?? '',
    basePrice: unitPrice,
    currency: p.currency,
    quantity: qty,
    selectedVariants: (p.selectedVariants ?? []).map((sv) => ({
      attributeId: sv.attributeId,
      attributeName: sv.attributeName,
      variantId: sv.variantId,
      variantName: sv.variantName,
      variantValue: sv.variantValue,
      priceModifier: p.priceModifier,
    })),
    totalPrice,
    storeId,
    storeName,
  };
}

export default function EditReceivableItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = use(params);
  const resolvedSearch = use(searchParams);
  const storeIdFromQuery = Array.isArray(resolvedSearch?.storeId)
    ? resolvedSearch.storeId[0]
    : resolvedSearch?.storeId ?? '';

  const router = useRouter();
  const { state: authState } = useAuth();
  const storeId = storeIdFromQuery || (authState.stores.length === 1 ? authState.stores[0].id : '');

  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [, setRequestDetails] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<CartItem[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<POSProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [variantChoiceModal, setVariantChoiceModal] = useState<{
    productName: string;
    options: POSProduct[];
  } | null>(null);
  const [loadingVariantOptionsForProductId, setLoadingVariantOptionsForProductId] = useState<string | null>(null);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + (typeof item.totalPrice === 'number' ? item.totalPrice : 0), 0);

  const loadData = useCallback(async () => {
    if (!storeId || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const [rec] = await Promise.all([
        getReceivableById(id, storeId),
        getRequestById(id, storeId).catch(() => null),
      ]);
      if (!rec) {
        setMessage({ type: 'error', text: 'Cuenta por cobrar no encontrada' });
        setReceivable(null);
        setRequestDetails(null);
        setItems([]);
        return;
      }
      setReceivable(rec);
      if (rec.requestId) {
        const requestData = await getRequestById(rec.requestId, storeId);
        setRequestDetails(requestData ?? null);
        setItems(Array.isArray(requestData?.items) ? [...requestData.items] : []);
      } else {
        setRequestDetails(null);
        setItems([]);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar',
      });
      setReceivable(null);
      setRequestDetails(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    if (storeId && id) loadData();
    else setLoading(false);
  }, [storeId, id, loadData]);

  useEffect(() => {
    if (!storeId) {
      setProductResults([]);
      return;
    }
    const q = productSearch.trim();
    if (!q) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchProductsForPOS(storeId, q, 30)
        .then(setProductResults)
        .catch(() => setProductResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [storeId, productSearch]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemQty = (index: number, delta: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const qty = Math.max(0, (item.quantity ?? 1) + delta);
      if (qty <= 0) return prev.filter((_, i) => i !== index);
      const unitPrice = (item.totalPrice ?? 0) / (item.quantity ?? 1);
      return prev.map((it, i) =>
        i === index ? { ...it, quantity: qty, totalPrice: unitPrice * qty } : it
      );
    });
  };

  const addToCart = (p: POSProduct, qty = 1) => {
    if (!storeId || !receivable) return;
    setMessage(null);
    const newItem = posProductToCartItem(p, qty, storeId, receivable.storeName ?? '');
    setItems((prev) => [...prev, newItem]);
    setVariantChoiceModal(null);
  };

  const handleProductClick = async (productId: string, options: POSProduct[]) => {
    const single = options.length === 1;
    const p = options[0]!;
    const productHasVariants = p.combinationId != null || (p.selectedVariants?.length ?? 0) > 0;
    const showVariantModal = !single ? true : productHasVariants;

    if (!showVariantModal) {
      addToCart(p);
      return;
    }
    if (!single && options.length > 0) {
      setVariantChoiceModal({ productName: p.productName, options });
      return;
    }
    if (storeId && single) {
      setLoadingVariantOptionsForProductId(productId);
      try {
        const allOptions = await getProductPOSOptions(storeId, productId);
        if (allOptions.length > 0) {
          setVariantChoiceModal({ productName: p.productName, options: allOptions });
        } else {
          addToCart(p);
        }
      } catch {
        addToCart(p);
      } finally {
        setLoadingVariantOptionsForProductId(null);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivable || !storeId || items.length === 0) {
      setMessage({ type: 'error', text: 'Debe haber al menos un producto' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        basePrice: item.basePrice,
        totalPrice: item.totalPrice,
        selectedVariants: item.selectedVariants ?? [],
      }));
      const result = await updateReceivableItems(id, storeId, payload, total);
      if (result) {
        setMessage({ type: 'success', text: 'Productos actualizados. El stock se ajustó correctamente.' });
        setTimeout(() => {
          router.push(`/admin/receivables/${id}?storeId=${encodeURIComponent(storeId)}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al guardar',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!storeId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-neutral-400">Selecciona una tienda.</p>
        <Link href={`/admin/receivables/${id}`} className="mt-4 inline-flex items-center gap-2 text-primary-400">
          <ArrowLeft className="h-4 w-4" />
          Volver a la cuenta
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!receivable || !receivable.requestId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-neutral-400">Esta cuenta no se creó desde un pedido, no se pueden cambiar productos.</p>
        <Link
          href={`/admin/receivables/${id}?storeId=${encodeURIComponent(storeId)}`}
          className="mt-4 inline-flex items-center gap-2 text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/receivables/${id}?storeId=${encodeURIComponent(storeId)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">Modificar productos</h1>
          <p className="text-sm text-neutral-400">
            Al guardar, el stock del producto viejo sube y el del nuevo baja.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-700/50 bg-green-500/10 text-green-300'
              : 'border-red-700/50 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Package className="h-4 w-4 text-primary-400" />
            Productos actuales
          </h2>
          {items.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500">No hay productos. Busca y agrega al menos uno.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => {
                const name = item.productName ?? 'Producto';
                const qty = typeof item.quantity === 'number' ? item.quantity : 1;
                const lineTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
                const imgUrl = resolveImageUrl(item.productImage) ?? item.productImage;
                const variantLabel =
                  Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0
                    ? item.selectedVariants
                        .map((v) =>
                          isHexColor(v.variantValue)
                            ? v.variantName || v.variantValue
                            : v.variantValue ?? v.variantName ?? ''
                        )
                        .filter(Boolean)
                        .join(', ')
                    : null;
                return (
                  <div
                    key={`${item.productId}-${item.id ?? index}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/40 px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => imgUrl && setEnlargedImageUrl(imgUrl)}
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-700 hover:ring-2 hover:ring-primary-500/50"
                    >
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ShoppingBag className="h-6 w-6 text-neutral-500" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-100 break-words">{name}</p>
                      {variantLabel && (
                        <p className="mt-0.5 text-xs text-neutral-400">{variantLabel}</p>
                      )}
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {qty} × {((lineTotal || 0) / qty).toFixed(2)} = {lineTotal.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateItemQty(index, -1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                        aria-label="Menos"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItemQty(index, 1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                        aria-label="Más"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400/80 hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-neutral-800 pt-4">
            <label className="mb-2 block text-xs font-medium text-neutral-400">
              Buscar y agregar productos
            </label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>

            {productSearch.trim() && (
              <div className="min-h-[160px] max-h-[280px] overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/40">
                {searching ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                  </div>
                ) : productResults.length === 0 ? (
                  <p className="py-8 text-center text-neutral-500 text-sm">Sin resultados</p>
                ) : (
                  <div className="divide-y divide-neutral-800/80">
                    {(() => {
                      const byProductId = new Map<string, POSProduct[]>();
                      for (const p of productResults) {
                        const list = byProductId.get(p.productId) ?? [];
                        list.push(p);
                        byProductId.set(p.productId, list);
                      }
                      const storeIva = authState.stores.find((s) => s.id === storeId)?.iva ?? 0;
                      return Array.from(byProductId.entries()).map(([productId, options]) => {
                        const single = options.length === 1;
                        const p = options[0]!;
                        const productHasVariants =
                          p.combinationId != null || (p.selectedVariants?.length ?? 0) > 0;
                        const showVariantModal = !single ? true : productHasVariants;
                        const effectiveIva = p.iva != null && p.iva > 0 ? p.iva : storeIva;
                        const priceDisplay = p.unitPrice * (1 + effectiveIva / 100);

                        return (
                          <div
                            key={productId}
                            className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                p.imageUrl &&
                                setEnlargedImageUrl(resolveImageUrl(p.imageUrl) ?? p.imageUrl ?? null)
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800 hover:ring-2 hover:ring-primary-500/50"
                            >
                              {(resolveImageUrl(p.imageUrl) ?? p.imageUrl) ? (
                                <img
                                  src={resolveImageUrl(p.imageUrl) ?? p.imageUrl ?? ''}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="h-5 w-5 text-neutral-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProductClick(productId, options)}
                              disabled={loadingVariantOptionsForProductId != null}
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 py-0 text-left transition-colors hover:bg-neutral-800/50 disabled:opacity-50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-neutral-100">
                                  {single && !productHasVariants ? p.displayName : p.productName}
                                </p>
                                {(!single || productHasVariants) && (
                                  <p className="mt-0.5 text-xs text-primary-400">
                                    {single
                                      ? 'Tiene variantes · Elegir cuál agregar'
                                      : `${options.length} variantes · Elegir cuál agregar`}
                                  </p>
                                )}
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {single ? (
                                    <>Stock: {p.stock}</>
                                  ) : (
                                    <>{options.filter((o) => o.stock > 0).length} con stock</>
                                  )}
                                </p>
                              </div>
                              {single && !showVariantModal ? (
                                <>
                                  <span className="shrink-0 text-sm text-neutral-400">
                                    {priceDisplay.toFixed(2)} {p.currency}
                                  </span>
                                  <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                                </>
                              ) : (
                                <>
                                  {loadingVariantOptionsForProductId === productId ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                                  )}
                                </>
                              )}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-lg font-medium text-neutral-100">
            Total: {receivable.currency} {total.toFixed(2)}
          </p>
          <div className="flex gap-2">
            <Link href={`/admin/receivables/${id}?storeId=${encodeURIComponent(storeId)}`}>
              <Button type="button" variant="outline" disabled={saving}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={saving || items.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Modal: imagen ampliada */}
      {enlargedImageUrl && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4"
            onClick={() => setEnlargedImageUrl(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Imagen ampliada"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedImageUrl(null);
              }}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800/90 text-white hover:bg-neutral-700"
              aria-label="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={enlargedImageUrl}
              alt=""
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}

      {/* Modal: elegir variante */}
      {variantChoiceModal && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-black/60 p-4 py-8">
            <div className="my-auto w-full max-w-md shrink-0 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl max-h-[85vh] flex flex-col">
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-100">
                  Elegir variante · {variantChoiceModal.productName}
                </h3>
                <button
                  type="button"
                  onClick={() => setVariantChoiceModal(null)}
                  className="rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-3 text-sm text-neutral-400">
                Selecciona la combinación que deseas agregar.
              </p>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {variantChoiceModal.options.map((opt) => {
                  const storeIvaForOpt = authState.stores.find((s) => s.id === storeId)?.iva ?? 0;
                  const effectiveIvaOpt = opt.iva != null && opt.iva > 0 ? opt.iva : storeIvaForOpt;
                  const priceDisplay = opt.unitPrice * (1 + effectiveIvaOpt / 100);
                  const isVariant = opt.combinationId != null || (opt.selectedVariants?.length ?? 0) > 0;
                  const displayTitle = (() => {
                    let title = opt.displayName;
                    if (opt.selectedVariants) {
                      for (const sv of opt.selectedVariants) {
                        if (isHexColor(sv.variantValue) && (sv.variantName ?? '').trim()) {
                          const escaped = sv.variantValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          title = title.replace(new RegExp(escaped, 'gi'), sv.variantName!);
                        }
                      }
                    }
                    return title;
                  })();
                  return (
                    <div
                      key={`${opt.productId}-${opt.combinationId ?? 'base'}`}
                      className="flex w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 transition-colors hover:bg-neutral-700/50"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          opt.imageUrl &&
                          setEnlargedImageUrl(resolveImageUrl(opt.imageUrl) ?? opt.imageUrl ?? null)
                        }
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-700 hover:ring-2 hover:ring-primary-500/50"
                      >
                        {(resolveImageUrl(opt.imageUrl) ?? opt.imageUrl) ? (
                          <img
                            src={resolveImageUrl(opt.imageUrl) ?? opt.imageUrl ?? ''}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="h-6 w-6 text-neutral-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => addToCart(opt)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-100">{displayTitle}</p>
                          {isVariant && opt.selectedVariants && opt.selectedVariants.length > 0 && (
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                              {opt.selectedVariants.map((sv) =>
                                isHexColor(sv.variantValue) ? (
                                  <span key={sv.attributeId} className="inline-flex items-center gap-1.5">
                                    <span
                                      className="h-4 w-4 shrink-0 rounded-full border border-neutral-600"
                                      style={{ backgroundColor: sv.variantValue }}
                                      title={`${sv.attributeName}: ${sv.variantName || sv.variantValue}`}
                                    />
                                    <span>
                                      {sv.attributeName}: {sv.variantName || sv.variantValue}
                                    </span>
                                  </span>
                                ) : (
                                  <span key={sv.attributeId}>
                                    {sv.attributeName}: {sv.variantValue}
                                  </span>
                                )
                              )}
                            </p>
                          )}
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                            {opt.sku && <span>Cód: {opt.sku}</span>}
                            <span>Stock: {opt.stock}</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-neutral-200">
                          {priceDisplay.toFixed(2)} {opt.currency}
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
