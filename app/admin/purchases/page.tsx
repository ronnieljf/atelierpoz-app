'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPurchases, createPurchase, cancelPurchase } from '@/lib/services/purchases';
import { getVendors } from '@/lib/services/vendors';
import { getFinanceCategories } from '@/lib/services/financeCategories';
import type { Purchase, PurchaseItem } from '@/types/purchase';
import type { Vendor } from '@/types/vendor';
import type { FinanceCategory } from '@/types/expense';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import {
  ShoppingCart,
  Plus,
  Loader2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  completed: { label: 'Completada', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  refunded: { label: 'Reembolsada', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  cancelled: { label: 'Cancelada', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

export default function PurchasesPage() {
  const { state: authState } = useAuth();
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    if (authState.stores.length === 1 && !storeId) setStoreId(authState.stores[0].id);
  }, [authState.stores, storeId]);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Purchase | null>(null);

  // Create form
  const [createVendorId, setCreateVendorId] = useState('');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createPaymentMethod, setCreatePaymentMethod] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<PurchaseItem[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [creating, setCreating] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getPurchases(storeId, {
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        vendorId: vendorFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setPurchases(result.purchases);
      setTotal(result.total);
    } catch {
      setPurchases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter, categoryFilter, vendorFilter, page]);

  const fetchVendors = useCallback(async () => {
    if (!storeId) return;
    try {
      const r = await getVendors(storeId, { limit: 500 });
      setVendors(r.vendors);
    } catch { setVendors([]); }
  }, [storeId]);

  const fetchCategories = useCallback(async () => {
    if (!storeId) return;
    try {
      const cats = await getFinanceCategories('expense', storeId);
      setCategories(cats);
    } catch { setCategories([]); }
  }, [storeId]);

  useEffect(() => {
    fetchPurchases();
    fetchVendors();
    fetchCategories();
  }, [fetchPurchases, fetchVendors, fetchCategories]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setCreateItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === 'description') item.description = value as string;
      else if (field === 'quantity') item.quantity = Math.max(1, Number(value) || 1);
      else if (field === 'unitPrice') item.unitPrice = Math.max(0, Number(value) || 0);
      item.total = item.quantity * item.unitPrice;
      next[index] = item;
      return next;
    });
  };

  const addItem = () => setCreateItems((p) => [...p, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const removeItem = (i: number) => setCreateItems((p) => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);

  const grandTotal = createItems.reduce((sum, it) => sum + it.total, 0);

  const handleCreate = async () => {
    if (!storeId) return;
    const validItems = createItems.filter((it) => it.description.trim() && it.total > 0);
    if (validItems.length === 0) { alert('Agrega al menos un ítem con descripción y monto'); return; }
    setCreating(true);
    try {
      await createPurchase({
        storeId,
        vendorId: createVendorId || undefined,
        categoryId: createCategoryId || undefined,
        description: createDescription.trim() || undefined,
        items: validItems,
        total: grandTotal,
        currency: createCurrency || 'USD',
        paymentMethod: createPaymentMethod.trim() || undefined,
        notes: createNotes.trim() || undefined,
      });
      setShowCreateModal(false);
      resetCreateForm();
      fetchPurchases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear compra');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateVendorId('');
    setCreateCategoryId('');
    setCreateDescription('');
    setCreateCurrency('USD');
    setCreatePaymentMethod('');
    setCreateNotes('');
    setCreateItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleCancel = async (purchase: Purchase) => {
    if (!confirm('¿Cancelar esta compra?')) return;
    setCancellingId(purchase.id);
    try {
      await cancelPurchase(purchase.id, storeId);
      fetchPurchases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setCancellingId(null);
    }
  };

  const inputClass =
    'h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
        {authState.stores.length === 0 ? (
          <div className="text-sm text-neutral-400">No tienes acceso a ninguna tienda</div>
        ) : (
          <select
            value={storeId}
            onChange={(e) => { setStoreId(e.target.value); setPage(0); }}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
          >
            <option value="">Selecciona una tienda...</option>
            {authState.stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {!storeId ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <ShoppingCart className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            {authState.stores.length === 0 ? 'No tienes tiendas' : 'Selecciona una tienda'}
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            {authState.stores.length === 0 ? 'Crea una tienda primero para gestionar compras' : 'Elige una tienda arriba para ver sus compras'}
          </p>
        </div>
      ) : (<>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-100 sm:text-2xl">Compras</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Registro de compras al contado</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          <span className="ml-1.5">Nueva compra</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="h-10 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none">
          <option value="">Todos los estados</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); setPage(0); }} className="h-10 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none">
          <option value="">Todos los proveedores</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name || v.phone || v.id.slice(0, 8)}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} className="h-10 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>
      ) : purchases.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">No hay compras registradas</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {purchases.map((p) => {
              const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.completed;
              return (
                <div key={p.id} className="rounded-xl border border-neutral-700/80 bg-neutral-800/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-100">
                        #{p.purchaseNumber} {p.vendorName ? `· ${p.vendorName}` : ''}
                      </p>
                      {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">{p.description}</p>}
                      {p.categoryName && (
                        <span className="mt-1 inline-block rounded-full bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-300">
                          {p.categoryName}
                        </span>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-red-400">{p.total.toFixed(2)} {p.currency}</p>
                      <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs', st.bgColor, st.color)}>{st.label}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-700/80 pt-3">
                    <button type="button" onClick={() => setShowDetailModal(p)} className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800/60 py-2 text-center text-sm text-neutral-200 hover:bg-neutral-700/60">
                      <Eye className="mr-1 inline h-3.5 w-3.5" /> Detalle
                    </button>
                    {p.status === 'completed' && (
                      <button type="button" onClick={() => handleCancel(p)} disabled={cancellingId === p.id} className="rounded-lg border border-red-600 bg-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50">
                        <X className="mr-1 inline h-3.5 w-3.5" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 text-left text-neutral-400">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Proveedor</th>
                    <th className="pb-3 pr-4">Descripción</th>
                    <th className="pb-3 pr-4">Categoría</th>
                    <th className="pb-3 pr-4">Total</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3 pr-4">Fecha</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.completed;
                    return (
                      <tr key={p.id} className="border-b border-neutral-800/80">
                        <td className="py-3 pr-4 font-medium text-neutral-100">{p.purchaseNumber}</td>
                        <td className="py-3 pr-4 text-neutral-300">{p.vendorName || '—'}</td>
                        <td className="max-w-[200px] truncate py-3 pr-4 text-neutral-400">{p.description || '—'}</td>
                        <td className="py-3 pr-4">
                          {p.categoryName ? <span className="rounded-full bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-300">{p.categoryName}</span> : '—'}
                        </td>
                        <td className="py-3 pr-4 font-medium text-red-400">{p.total.toFixed(2)} {p.currency}</td>
                        <td className="py-3 pr-4"><span className={cn('rounded-full px-2 py-0.5 text-xs', st.bgColor, st.color)}>{st.label}</span></td>
                        <td className="py-3 pr-4 text-neutral-500">{new Date(p.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setShowDetailModal(p)} className="text-primary-400 hover:underline text-sm">Ver</button>
                            {p.status === 'completed' && (
                              <button type="button" onClick={() => handleCancel(p)} disabled={cancellingId === p.id} className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50">Cancelar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border border-neutral-700 p-2 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-neutral-400">Página {page + 1} de {totalPages} · {total} compras</span>
              <button type="button" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-neutral-700 p-2 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-12"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-medium text-neutral-100">Nueva compra</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Proveedor</label>
                    <select value={createVendorId} onChange={(e) => setCreateVendorId(e.target.value)} className={inputClass}>
                      <option value="">Sin proveedor</option>
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name || v.phone}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Categoría</label>
                    <select value={createCategoryId} onChange={(e) => setCreateCategoryId(e.target.value)} className={inputClass}>
                      <option value="">Sin categoría</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Descripción general</label>
                  <input type="text" placeholder="Ej: Compra de insumos" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} className={inputClass} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Moneda</label>
                    <select value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} className={inputClass}>
                      <option value="USD">USD</option><option value="VES">VES</option><option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Método de pago</label>
                    <input type="text" placeholder="Efectivo, transferencia..." value={createPaymentMethod} onChange={(e) => setCreatePaymentMethod(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Notas</label>
                    <input type="text" placeholder="Opcional" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} className={inputClass} />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-400">Ítems de la compra</label>
                    <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300">
                      <Plus className="h-3.5 w-3.5" /> Agregar ítem
                    </button>
                  </div>
                  <div className="space-y-2 rounded-xl border border-neutral-700/50 bg-neutral-800/30 p-3">
                    {createItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text" placeholder="Descripción" value={item.description}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          className={cn(inputClass, 'flex-1')}
                        />
                        <input
                          type="number" placeholder="Cant" min={1} value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          className={cn(inputClass, 'w-20 text-center')}
                        />
                        <input
                          type="number" placeholder="P.U." min={0} step="0.01" value={item.unitPrice || ''}
                          onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          className={cn(inputClass, 'w-28 text-right')}
                        />
                        <span className="w-24 text-right text-sm font-medium text-neutral-200">{item.total.toFixed(2)}</span>
                        {createItems.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="shrink-0 rounded-lg p-1 text-neutral-500 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-neutral-100">
                    Total: <span className="text-red-400">{grandTotal.toFixed(2)} {createCurrency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating || grandTotal <= 0}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  <span className="ml-1.5">Registrar compra</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Detail modal */}
      {showDetailModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-medium text-neutral-100">
                Compra #{showDetailModal.purchaseNumber}
              </h2>
              <div className="space-y-2 text-sm">
                <p className="text-neutral-300"><span className="text-neutral-500">Proveedor:</span> {showDetailModal.vendorName || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Descripción:</span> {showDetailModal.description || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Categoría:</span> {showDetailModal.categoryName || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Método de pago:</span> {showDetailModal.paymentMethod || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Total:</span> <span className="font-medium text-red-400">{showDetailModal.total.toFixed(2)} {showDetailModal.currency}</span></p>
                <p className="text-neutral-300"><span className="text-neutral-500">Estado:</span> {STATUS_LABELS[showDetailModal.status]?.label}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Fecha:</span> {new Date(showDetailModal.createdAt).toLocaleString('es')}</p>
                {showDetailModal.createdByName && (
                  <p className="text-neutral-300"><span className="text-neutral-500">Creado por:</span> {showDetailModal.createdByName}</p>
                )}
                {showDetailModal.notes && (
                  <p className="text-neutral-300"><span className="text-neutral-500">Notas:</span> {showDetailModal.notes}</p>
                )}
              </div>

              {showDetailModal.items && showDetailModal.items.length > 0 && (
                <div className="mt-4 border-t border-neutral-700 pt-4">
                  <h3 className="mb-2 text-sm font-medium text-neutral-200">Ítems</h3>
                  <div className="space-y-1">
                    {showDetailModal.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2 text-sm">
                        <span className="text-neutral-300">{item.description || `Ítem ${i + 1}`}</span>
                        <span className="text-neutral-400">
                          {item.quantity} × {(item.unitPrice ?? 0).toFixed(2)} = <span className="font-medium text-neutral-200">{(item.total ?? 0).toFixed(2)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDetailModal(null)}>Cerrar</Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>)}
    </div>
  );
}
