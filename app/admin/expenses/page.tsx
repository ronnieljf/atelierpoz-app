'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getExpenses, createExpense, updateExpense, createExpensePayment, getExpensePayments, getPendingTotal } from '@/lib/services/expenses';
import { getFinanceCategories, createFinanceCategory } from '@/lib/services/financeCategories';
import { getVendors } from '@/lib/services/vendors';
import type { Expense, ExpenseStatus, ExpensePayment, FinanceCategory } from '@/types/expense';
import type { Vendor } from '@/types/vendor';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import {
  Wallet,
  Plus,
  Loader2,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Tag,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  paid: { label: 'Pagado', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

export default function ExpensesPage() {
  const { state: authState } = useAuth();
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    if (authState.stores.length === 1 && !storeId) setStoreId(authState.stores[0].id);
  }, [authState.stores, storeId]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('');

  const [pendingTotals, setPendingTotals] = useState<{ currency: string; total: number }[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Expense | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    vendorId: '',
    vendorName: '',
    vendorPhone: '',
    description: '',
    amount: '',
    currency: 'USD',
    categoryId: '',
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [payingExpense, setPayingExpense] = useState(false);

  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getExpenses(storeId, {
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setExpenses(result.expenses);
      setTotal(result.total);
    } catch {
      setExpenses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter, categoryFilter, page]);

  const fetchPendingTotals = useCallback(async () => {
    if (!storeId) return;
    try { setPendingTotals(await getPendingTotal(storeId)); } catch { setPendingTotals([]); }
  }, [storeId]);

  const fetchCategories = useCallback(async () => {
    if (!storeId) return;
    try { setCategories(await getFinanceCategories('expense', storeId)); } catch { setCategories([]); }
  }, [storeId]);

  const fetchVendors = useCallback(async () => {
    if (!storeId) return;
    try {
      const r = await getVendors(storeId, { limit: 500 });
      setVendors(r.vendors);
    } catch { setVendors([]); }
  }, [storeId]);

  useEffect(() => {
    fetchExpenses();
    fetchPendingTotals();
    fetchCategories();
    fetchVendors();
  }, [fetchExpenses, fetchPendingTotals, fetchCategories, fetchVendors]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCreate = async () => {
    if (!storeId || !createForm.amount) return;
    setCreating(true);
    try {
      await createExpense({
        storeId,
        vendorId: createForm.vendorId || null,
        vendorName: createForm.vendorName || null,
        vendorPhone: createForm.vendorPhone || null,
        description: createForm.description || null,
        amount: parseFloat(createForm.amount),
        currency: createForm.currency || 'USD',
        categoryId: createForm.categoryId || null,
        dueDate: createForm.dueDate || null,
      });
      setShowCreateModal(false);
      setCreateForm({ vendorId: '', vendorName: '', vendorPhone: '', description: '', amount: '', currency: 'USD', categoryId: '', dueDate: '' });
      fetchExpenses();
      fetchPendingTotals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear cuenta por pagar');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (expense: Expense, newStatus: ExpenseStatus) => {
    setUpdatingId(expense.id);
    try {
      await updateExpense(expense.id, { storeId, status: newStatus });
      fetchExpenses();
      fetchPendingTotals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePayment = async () => {
    if (!showPaymentModal || !paymentAmount) return;
    setPayingExpense(true);
    try {
      await createExpensePayment(showPaymentModal.id, {
        storeId,
        amount: parseFloat(paymentAmount),
        notes: paymentNotes || undefined,
      });
      setShowPaymentModal(null);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchExpenses();
      fetchPendingTotals();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setPayingExpense(false);
    }
  };

  const loadPayments = async (expense: Expense) => {
    setShowDetailModal(expense);
    setLoadingPayments(true);
    try { setPayments(await getExpensePayments(expense.id)); } catch { setPayments([]); } finally { setLoadingPayments(false); }
  };

  const handleCreateCategory = async () => {
    if (!storeId || !newCatName.trim()) return;
    setCreatingCat(true);
    try {
      await createFinanceCategory('expense', { storeId, name: newCatName.trim(), color: newCatColor || undefined });
      setNewCatName('');
      setNewCatColor('');
      fetchCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleVendorSelect = (vendorId: string) => {
    const v = vendors.find((x) => x.id === vendorId);
    setCreateForm((f) => ({
      ...f,
      vendorId,
      vendorName: v?.name || '',
      vendorPhone: v?.phone || '',
    }));
  };

  const inputClass =
    'h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50';

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
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
          <Wallet className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            {authState.stores.length === 0 ? 'No tienes tiendas' : 'Selecciona una tienda'}
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            {authState.stores.length === 0 ? 'Crea una tienda primero para gestionar gastos' : 'Elige una tienda arriba para ver sus gastos'}
          </p>
        </div>
      ) : (<>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">Cuentas por pagar</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Gestión de deudas y pagos a proveedores</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(true)} className="h-11 sm:h-auto">
            <Tag className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Categorías</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} className="h-11 sm:h-auto">
            <Plus className="h-4 w-4" />
            <span className="ml-1.5">Nueva cuenta</span>
          </Button>
        </div>
      </div>

      {pendingTotals.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 sm:rounded-3xl sm:p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">Total pendiente por pagar</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {pendingTotals.map((t) => (
              <span key={t.currency} className="text-xl font-semibold tabular-nums text-yellow-400 sm:text-2xl">
                {t.currency} {t.total.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Filtros</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-400">Estado</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm">
              <option value="">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="paid">Pagados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-400">Categoría</label>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm">
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-400">Proveedor</label>
            <select value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); setPage(0); }} className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm">
              <option value="">Todos</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name || v.phone || v.id.slice(0, 8)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>
      ) : expenses.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">No hay cuentas por pagar registradas</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {expenses.map((e) => {
              const st = STATUS_LABELS[e.status] ?? STATUS_LABELS.pending;
              return (
                <div key={e.id} className="rounded-xl border border-neutral-700/80 bg-neutral-800/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-100">
                        #{e.expenseNumber} {e.vendorName ? `· ${e.vendorName}` : ''}
                      </p>
                      {e.description && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">{e.description}</p>}
                      {e.categoryName && (
                        <span className="mt-1 inline-block rounded-full bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-300">{e.categoryName}</span>
                      )}
                      {e.dueDate && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                          <Calendar className="h-3 w-3" /> Vence: {new Date(e.dueDate).toLocaleDateString('es')}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        {new Date(e.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="space-y-0.5">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs text-neutral-500">Total</span>
                          <p className="text-lg font-semibold text-red-400">{e.currency} {e.amount.toFixed(2)}</p>
                        </div>
                        {(e.totalPaid != null && e.totalPaid > 0) && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-neutral-500">Abonado</span>
                            <p className="text-sm tabular-nums text-green-400">{e.currency} {e.totalPaid.toFixed(2)}</p>
                          </div>
                        )}
                        {e.status === 'pending' && (
                          <div className="flex flex-col items-end gap-0.5 border-t border-neutral-700/60 pt-1">
                            <span className="text-xs font-medium text-neutral-400">Pendiente</span>
                            <p className="text-sm font-semibold tabular-nums text-amber-400">
                              {e.currency} {Math.max(0, e.amount - (e.totalPaid ?? 0)).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                      <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs', st.bgColor, st.color)}>{st.label}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-700/80 pt-3">
                    <button type="button" onClick={() => loadPayments(e)} className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800/60 py-2 text-center text-sm text-neutral-200 hover:bg-neutral-700/60">
                      <Eye className="mr-1 inline h-3.5 w-3.5" /> Detalle
                    </button>
                    {e.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => setShowPaymentModal(e)} className="rounded-lg border border-primary-600 bg-primary-500/20 px-3 py-2 text-sm text-primary-400 hover:bg-primary-500/30">
                          <Wallet className="mr-1 inline h-3.5 w-3.5" /> Abonar
                        </button>
                        <button type="button" onClick={() => handleStatusChange(e, 'paid')} disabled={updatingId === e.id} className="rounded-lg border border-green-600 bg-green-500/20 px-3 py-2 text-sm text-green-400 hover:bg-green-500/30 disabled:opacity-50">
                          <Check className="mr-1 inline h-3.5 w-3.5" /> Pagado
                        </button>
                        <button type="button" onClick={() => handleStatusChange(e, 'cancelled')} disabled={updatingId === e.id} className="rounded-lg border border-red-600 bg-red-500/20 px-3 py-2 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50">
                          <X className="mr-1 inline h-3.5 w-3.5" /> Cancelar
                        </button>
                      </>
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
                    <th className="pb-3 pr-4">Abonado</th>
                    <th className="pb-3 pr-4">Pendiente</th>
                    <th className="pb-3 pr-4">Vencimiento</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3 pr-4">Fecha</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => {
                    const st = STATUS_LABELS[e.status] ?? STATUS_LABELS.pending;
                    return (
                      <tr key={e.id} className="border-b border-neutral-800/80">
                        <td className="py-3 pr-4 font-medium text-neutral-100">{e.expenseNumber}</td>
                        <td className="py-3 pr-4 text-neutral-300">{e.vendorName || '—'}</td>
                        <td className="max-w-[200px] truncate py-3 pr-4 text-neutral-400">{e.description || '—'}</td>
                        <td className="py-3 pr-4">
                          {e.categoryName ? <span className="rounded-full bg-neutral-700/50 px-2 py-0.5 text-xs text-neutral-300">{e.categoryName}</span> : '—'}
                        </td>
                        <td className="py-3 pr-4 font-medium text-red-400">{e.currency} {e.amount.toFixed(2)}</td>
                        <td className="py-3 pr-4 text-green-400">
                          {(e.totalPaid != null && e.totalPaid > 0) ? `${e.currency} ${e.totalPaid.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 pr-4 font-medium text-amber-400">
                          {e.status === 'pending' ? `${e.currency} ${Math.max(0, e.amount - (e.totalPaid ?? 0)).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-neutral-500">{e.dueDate ? new Date(e.dueDate).toLocaleDateString('es') : '—'}</td>
                        <td className="py-3 pr-4"><span className={cn('rounded-full px-2 py-0.5 text-xs', st.bgColor, st.color)}>{st.label}</span></td>
                        <td className="py-3 pr-4 text-neutral-500">{new Date(e.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => loadPayments(e)} className="text-primary-400 hover:underline text-sm">Ver</button>
                            {e.status === 'pending' && (
                              <>
                                <button type="button" onClick={() => setShowPaymentModal(e)} className="text-sm text-neutral-300 hover:text-neutral-100">Abonar</button>
                                <button type="button" onClick={() => handleStatusChange(e, 'paid')} disabled={updatingId === e.id} className="text-sm text-green-400 hover:text-green-300 disabled:opacity-50">Pagar</button>
                                <button type="button" onClick={() => handleStatusChange(e, 'cancelled')} disabled={updatingId === e.id} className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50">Cancelar</button>
                              </>
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

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-neutral-500 sm:text-left sm:text-sm">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))} className="h-11 justify-center gap-1.5 sm:h-auto">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(Math.min(totalPages - 1, page + 1))} className="h-11 justify-center gap-1.5 sm:h-auto">
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="my-auto w-full max-w-lg shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-lg font-medium text-neutral-100">Nueva cuenta por pagar</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Proveedor registrado</label>
                  <select value={createForm.vendorId} onChange={(e) => handleVendorSelect(e.target.value)} className={inputClass}>
                    <option value="">Seleccionar o escribir abajo</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name || v.phone}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Nombre proveedor</label>
                    <input type="text" placeholder="Nombre" value={createForm.vendorName} onChange={(e) => setCreateForm({ ...createForm, vendorName: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Teléfono</label>
                    <input type="text" placeholder="Teléfono" value={createForm.vendorPhone} onChange={(e) => setCreateForm({ ...createForm, vendorPhone: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Descripción</label>
                  <textarea placeholder="Concepto de la cuenta" rows={2} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className={cn(inputClass, 'h-auto resize-none py-2.5')} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Monto *</label>
                    <input type="text" inputMode="decimal" placeholder="0.00" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value.replace(/[^0-9.,]/g, '') })} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Moneda</label>
                    <select value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })} className={inputClass}>
                      <option value="USD">USD</option><option value="VES">VES</option><option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Categoría</label>
                    <select value={createForm.categoryId} onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })} className={inputClass}>
                      <option value="">Sin categoría</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-neutral-500">Fecha de vencimiento</label>
                    <input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} className={cn(inputClass, 'appearance-none')} />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating || !createForm.amount}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-1.5">Crear</span>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setShowDetailModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="my-auto w-full max-w-lg shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-lg font-medium text-neutral-100">Cuenta #{showDetailModal.expenseNumber}</h2>
              <div className="space-y-2 text-sm">
                <p className="text-neutral-300"><span className="text-neutral-500">Proveedor:</span> {showDetailModal.vendorName || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Descripción:</span> {showDetailModal.description || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Categoría:</span> {showDetailModal.categoryName || '—'}</p>
                <p className="text-neutral-300"><span className="text-neutral-500">Monto:</span> <span className="font-medium text-red-400">{showDetailModal.amount.toFixed(2)} {showDetailModal.currency}</span></p>
                <p className="text-neutral-300"><span className="text-neutral-500">Estado:</span> {STATUS_LABELS[showDetailModal.status]?.label}</p>
                {showDetailModal.dueDate && (
                  <p className="text-neutral-300"><span className="text-neutral-500">Vencimiento:</span> {new Date(showDetailModal.dueDate).toLocaleDateString('es')}</p>
                )}
                <p className="text-neutral-300"><span className="text-neutral-500">Creado:</span> {new Date(showDetailModal.createdAt).toLocaleString('es')}</p>
                {showDetailModal.createdByName && (
                  <p className="text-neutral-300"><span className="text-neutral-500">Por:</span> {showDetailModal.createdByName}</p>
                )}
              </div>
              <div className="mt-4 border-t border-neutral-700 pt-4">
                <h3 className="mb-2 text-sm font-medium text-neutral-200">Pagos registrados</h3>
                {loadingPayments ? (
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                ) : payments.length === 0 ? (
                  <p className="text-sm text-neutral-500">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-neutral-800/40 px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-green-400">{p.amount.toFixed(2)} {p.currency}</span>
                          {p.notes && <span className="ml-2 text-neutral-500">· {p.notes}</span>}
                        </div>
                        <span className="text-xs text-neutral-500">{new Date(p.createdAt).toLocaleDateString('es')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowDetailModal(null)}>Cerrar</Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Payment modal */}
      {showPaymentModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setShowPaymentModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="my-auto w-full max-w-md shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-lg font-medium text-neutral-100">Abonar a cuenta #{showPaymentModal.expenseNumber}</h2>
              <p className="mb-4 text-sm text-neutral-400">
                Total: <span className="font-medium text-neutral-200">{showPaymentModal.amount.toFixed(2)} {showPaymentModal.currency}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Monto del pago *</label>
                  <input type="text" inputMode="decimal" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9.,]/g, ''))} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Nota (opcional)</label>
                  <input type="text" placeholder="Referencia, método..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(null)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handlePayment} disabled={payingExpense || !paymentAmount}>
                  {payingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  <span className="ml-1.5">Registrar pago</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Category modal */}
      {showCategoryModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={() => setShowCategoryModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="my-auto w-full max-w-md shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-4 text-lg font-medium text-neutral-100">Categorías de egresos</h2>
              {categories.length === 0 ? (
                <p className="mb-4 text-sm text-neutral-500">No hay categorías creadas</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg bg-neutral-800/40 px-3 py-2">
                      {c.color && <span className="h-3 w-3 shrink-0 rounded-full border border-neutral-600" style={{ backgroundColor: c.color }} />}
                      <span className="text-sm text-neutral-200">{c.name}</span>
                      {c.description && <span className="text-xs text-neutral-500">· {c.description}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-neutral-700 pt-4">
                <p className="mb-2 text-sm font-medium text-neutral-300">Nueva categoría</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Nombre" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className={cn(inputClass, 'flex-1')} />
                  <input type="color" value={newCatColor || '#6366f1'} onChange={(e) => setNewCatColor(e.target.value)} className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/50 p-1" />
                  <Button variant="primary" size="sm" onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()} className="shrink-0">
                    {creatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(false)}>Cerrar</Button>
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
