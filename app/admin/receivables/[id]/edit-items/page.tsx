'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getReceivableById } from '@/lib/services/receivables';
import { getRequestById, type Request } from '@/lib/services/requests';
import { updateReceivableItems } from '@/lib/services/receivables';
import { getAdminProducts } from '@/lib/services/products';
import type { Receivable } from '@/types/receivable';
import type { Product } from '@/types/product';
import type { CartItem } from '@/types/product';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Loader2, Package, Plus, Trash2 } from 'lucide-react';

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
  const [requestDetails, setRequestDetails] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addProductId, setAddProductId] = useState('');
  const [addQuantity, setAddQuantity] = useState(1);
  const [addSelectedVariants, setAddSelectedVariants] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  const total = items.reduce((sum, item) => sum + (typeof item.totalPrice === 'number' ? item.totalPrice : 0), 0);

  const loadData = useCallback(async () => {
    if (!storeId || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const [rec, req] = await Promise.all([
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
    if (!storeId) return;
    setLoadingProducts(true);
    getAdminProducts(storeId, { limit: 200 })
      .then((res) => setProducts(res.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [storeId]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedProduct = addProductId ? products.find((p) => p.id === addProductId) : null;
  const productAttributes = selectedProduct?.attributes ?? [];

  const canAddItem = (): boolean => {
    if (!selectedProduct || addQuantity < 1) return false;
    const requiredAttrs = productAttributes.filter((a) => a.required);
    const allSelected = requiredAttrs.every((a) => addSelectedVariants[a.id]);
    return allSelected;
  };

  const buildNewItem = (): CartItem | null => {
    if (!selectedProduct || !storeId) return null;
    const qty = Math.max(1, addQuantity);
    let unitPrice = selectedProduct.basePrice ?? 0;
    const selectedVariantsArray: CartItem['selectedVariants'] = [];
    productAttributes.forEach((attr) => {
      const variantId = addSelectedVariants[attr.id];
      if (variantId) {
        const variant = attr.variants?.find((v) => v.id === variantId);
        if (variant) {
          const priceMod = typeof variant.price === 'number' ? variant.price : 0;
          unitPrice += priceMod;
          selectedVariantsArray.push({
            attributeId: attr.id,
            attributeName: attr.name,
            variantId: variant.id,
            variantName: variant.name ?? '',
            variantValue: variant.value ?? '',
            priceModifier: priceMod,
          });
        }
      }
    });
    const totalPrice = unitPrice * qty;
    return {
      id: `${selectedProduct.id}_${selectedVariantsArray.map((v) => `${v.attributeId}:${v.variantId}`).join('|')}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productImage: selectedProduct.images?.[0] ?? '',
      productSku: selectedProduct.sku ?? '',
      basePrice: selectedProduct.basePrice ?? 0,
      currency: selectedProduct.currency,
      quantity: qty,
      selectedVariants: selectedVariantsArray,
      totalPrice,
      storeId,
      storeName: receivable?.storeName ?? '',
    };
  };

  const handleAddItem = () => {
    const newItem = buildNewItem();
    if (!newItem) return;
    setItems((prev) => [...prev, newItem]);
    setAddProductId('');
    setAddQuantity(1);
    setAddSelectedVariants({});
    setAdding(false);
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
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">Cambiar productos</h1>
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
            <p className="py-4 text-sm text-neutral-500">No hay productos. Agrega al menos uno.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    <th className="pb-2 pr-4 pt-1">Producto</th>
                    <th className="pb-2 px-2 pt-1 text-center">Cant.</th>
                    <th className="pb-2 px-2 pt-1 text-right">Subtotal</th>
                    <th className="w-10 pb-2 pl-2 pt-1" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {items.map((item, index) => {
                    const name = item.productName ?? 'Producto';
                    const qty = typeof item.quantity === 'number' ? item.quantity : 1;
                    const lineTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
                    const variantLabel =
                      Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0
                        ? item.selectedVariants.map((v) => v.variantValue ?? v.variantName ?? '').filter(Boolean).join(', ')
                        : null;
                    return (
                      <tr key={`${item.productId}-${index}`} className="text-neutral-300">
                        <td className="py-2 pr-4">
                          <span className="font-medium text-neutral-100">{name}</span>
                          {variantLabel && (
                            <div className="mt-0.5 text-xs text-neutral-500">{variantLabel}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">{qty}</td>
                        <td className="px-2 py-2 text-right font-medium text-neutral-100">
                          {receivable.currency} {lineTotal.toFixed(2)}
                        </td>
                        <td className="pl-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-500/10 hover:text-red-400"
                            title="Quitar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-neutral-800 pt-4">
            {!adding ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-600 px-3 py-2 text-sm font-medium text-neutral-400 hover:border-primary-500/50 hover:text-primary-400"
              >
                <Plus className="h-4 w-4" />
                Agregar producto
              </button>
            ) : (
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-400">Producto</label>
                  <select
                    value={addProductId}
                    onChange={(e) => {
                      setAddProductId(e.target.value);
                      setAddSelectedVariants({});
                    }}
                    className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  >
                    <option value="">Seleccionar...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.currency} {Number(p.basePrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                {productAttributes.length > 0 && (
                  <div className="space-y-2">
                    {productAttributes.map((attr) => (
                      <div key={attr.id}>
                        <label className="mb-1 block text-xs font-medium text-neutral-400">
                          {attr.name} {attr.required ? '*' : ''}
                        </label>
                        <select
                          value={addSelectedVariants[attr.id] ?? ''}
                          onChange={(e) =>
                            setAddSelectedVariants((prev) => ({ ...prev, [attr.id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                        >
                          <option value="">Seleccionar...</option>
                          {(attr.variants || []).map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.value ?? v.name} {typeof v.price === 'number' && v.price > 0 ? `(+${v.price.toFixed(2)})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-400">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full max-w-[120px] rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={!canAddItem()}
                  >
                    Agregar
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
                    Cancelar
                  </Button>
                </div>
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
    </div>
  );
}
