'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getReceivables, getPendingTotal, updateReceivable, createReceivablePayment, getReceivablePayments } from '@/lib/services/receivables';
import { getRequestById } from '@/lib/services/requests';
import type { Receivable, ReceivableStatus } from '@/types/receivable';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Receipt, Plus, Loader2, Eye, FileText, ShoppingBag, ChevronLeft, ChevronRight, Check, X, Download, Wallet, MessageCircle } from 'lucide-react';
import { openWhatsAppForReceivable } from '@/lib/utils/whatsapp';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  paid: {
    label: 'Cobrada',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export default function ReceivablesPage() {
  const { state: authState, loadStores } = useAuth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<ReceivableStatus | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [paymentModalReceivable, setPaymentModalReceivable] = useState<Receivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [openingWhatsAppId, setOpeningWhatsAppId] = useState<string | null>(null);

  const [pendingTotalByCurrency, setPendingTotalByCurrency] = useState<Record<string, number>>({});

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

  const loadReceivables = useCallback(async () => {
    if (!selectedStoreId) {
      setLoading(false);
      setReceivables([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await getReceivables(selectedStoreId, {
        limit: PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
      });
      setReceivables(result.receivables);
      setTotal(result.total);
      setHasLoadedOnce(true);
      const pending = await getPendingTotal(selectedStoreId);
      setPendingTotalByCurrency(pending.byCurrency);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar cuentas por cobrar',
      });
      setReceivables([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, page, statusFilter]);

  useEffect(() => {
    if (selectedStoreId) loadReceivables();
    else {
      setReceivables([]);
      setTotal(0);
      setPendingTotalByCurrency({});
      setLoading(false);
      setHasLoadedOnce(false);
    }
  }, [selectedStoreId, loadReceivables]);

  const goToPage = (p: number) => {
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setPage(Math.max(1, Math.min(p, maxPage)));
  };

  const handleStatusChange = async (receivableId: string, newStatus: ReceivableStatus) => {
    if (!selectedStoreId) return;
    setUpdatingId(receivableId);
    setUpdatingStatus(newStatus);
    setMessage(null);
    try {
      const updated = await updateReceivable(receivableId, { storeId: selectedStoreId, status: newStatus });
      if (updated) {
        setReceivables((prev) =>
          prev.map((r) => (r.id === receivableId ? updated : r))
        );
        setMessage({
          type: 'success',
          text: newStatus === 'paid' ? 'Marcada como cobrada' : 'Cuenta cancelada',
        });
        getPendingTotal(selectedStoreId).then((p) => setPendingTotalByCurrency(p.byCurrency));
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar el estado' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar',
      });
    } finally {
      setUpdatingId(null);
      setUpdatingStatus(null);
    }
  };

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleOpenWhatsApp = async (rec: Receivable) => {
    if (!rec.customerPhone?.trim() || !selectedStoreId) return;
    setOpeningWhatsAppId(rec.id);
    try {
      const [paymentsResult, requestDetails] = await Promise.all([
        getReceivablePayments(rec.id, selectedStoreId),
        rec.requestId ? getRequestById(rec.requestId, selectedStoreId) : Promise.resolve(null),
      ]);
      const payments = paymentsResult?.payments ?? [];
      const totalPaid = paymentsResult?.totalPaid ?? 0;
      const orderItems =
        requestDetails?.items?.map((item) => {
          const variantLabel =
            Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0
              ? item.selectedVariants
                  .map((v) => (v.variantValue ?? v.variantName ?? ''))
                  .filter(Boolean)
                  .join(', ')
              : null;
          return {
            productName: item.productName ?? 'Producto',
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : (item.basePrice ?? 0) * (typeof item.quantity === 'number' ? item.quantity : 1),
            variantLabel: variantLabel || null,
          };
        }) ?? undefined;
      openWhatsAppForReceivable({ ...rec, payments, totalPaid, orderItems });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo cargar el detalle para WhatsApp' });
    } finally {
      setOpeningWhatsAppId(null);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalReceivable || !selectedStoreId) return;
    const amountNum = parseFloat(paymentAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: 'error', text: 'El monto del abono debe ser mayor que 0' });
      return;
    }
    setAddingPayment(true);
    setMessage(null);
    try {
      const result = await createReceivablePayment(paymentModalReceivable.id, {
        storeId: selectedStoreId,
        amount: amountNum,
        currency: paymentModalReceivable.currency,
        notes: paymentNotes.trim() || undefined,
      });
      if (result) {
        setReceivables((prev) =>
          prev.map((r) => (r.id === paymentModalReceivable.id ? result.receivable : r))
        );
        setPaymentModalReceivable(null);
        setPaymentAmount('');
        setPaymentNotes('');
        setMessage({
          type: 'success',
          text: result.receivable.status === 'paid'
            ? 'Abono registrado. La cuenta ha sido marcada como cobrada.'
            : 'Abono registrado correctamente',
        });
        if (selectedStoreId) {
          getPendingTotal(selectedStoreId).then((p) => setPendingTotalByCurrency(p.byCurrency));
        }
      } else {
        setMessage({ type: 'error', text: 'No se pudo registrar el abono' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al registrar el abono',
      });
    } finally {
      setAddingPayment(false);
    }
  };

  const MAX_EXPORT_DAYS = 366;

  const handleExportCSV = async () => {
    if (!selectedStoreId) return;
    setExportError(null);
    const from = exportDateFrom.trim();
    const to = exportDateTo.trim();
    if (!from || !to) {
      setExportError('Indica desde qué fecha y hasta qué fecha.');
      return;
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setExportError('Fechas inválidas.');
      return;
    }
    if (fromDate > toDate) {
      setExportError('La fecha desde debe ser anterior o igual a la fecha hasta.');
      return;
    }
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > MAX_EXPORT_DAYS) {
      setExportError(`El rango máximo es de ${MAX_EXPORT_DAYS} días (1 año puede tener 365 o 366 días).`);
      return;
    }
    setExporting(true);
    try {
      const result = await getReceivables(selectedStoreId, {
        dateFrom: from,
        dateTo: to,
        limit: 50000,
      });
      const rows = result.receivables;
      const escapeCsv = (v: string | number | null | undefined): string => {
        const s = v == null ? '' : String(v);
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const statusLabel = (s: string) => (STATUS_LABELS[s]?.label ?? s);
      const formatDate = (v: string | null) =>
        v ? new Date(v).toLocaleString('es-ES') : '';
      const header = [
        'Cliente',
        'Tel',
        'Desc',
        'Monto',
        'Moneda',
        'Origen',
        'Estado',
        'Creado',
        'Cobro',
      ].join(',');
      const dataRows = rows.map((r) =>
        [
          escapeCsv(r.customerName),
          escapeCsv(r.customerPhone),
          escapeCsv(r.description),
          r.amount,
          r.currency,
          r.requestId ? 'Pedido' : 'Manual',
          statusLabel(r.status),
          escapeCsv(formatDate(r.createdAt)),
          escapeCsv(formatDate(r.paidAt)),
        ].join(',')
      );
      const csv = '\uFEFF' + header + '\n' + dataRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuentas-por-cobrar-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      setExportDateFrom('');
      setExportDateTo('');
      setMessage({ type: 'success', text: `Exportadas ${rows.length} cuentas a CSV` });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  if (authState.user && authState.stores.length === 0 && !message) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-neutral-400">Cargando tiendas...</div>
      </div>
    );
  }

  const initialLoad = loading && selectedStoreId && !hasLoadedOnce;
  if (initialLoad) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-neutral-400">Cargando cuentas por cobrar...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
            Cuentas por cobrar
          </h1>
          {selectedStoreId && (
            <p className="text-sm text-neutral-400">
              {total} {total === 1 ? 'cuenta' : 'cuentas'}
              {total > 0 && (
                <span className="text-neutral-500">
                  {' '}· pág. {page} de {maxPage}
                </span>
              )}
            </p>
          )}
        </div>
        {selectedStoreId && (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/receivables/create">
              <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva cuenta (manual)
              </Button>
            </Link>
            <Link href="/admin/receivables/create?from=request">
              <Button variant="primary" size="sm" className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Crear desde pedido
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowExportModal(true);
                setExportError(null);
                const today = new Date();
                const toStr = today.toISOString().slice(0, 10);
                const fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 364); // 365 días exactos: hoy - 364 hasta hoy
                const fromStr = fromDate.toISOString().slice(0, 10);
                setExportDateFrom(fromStr);
                setExportDateTo(toStr);
              }}
              className="inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar CSV
            </Button>
          </div>
        )}
      </div>

      {/* Modal exportar CSV */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !exporting && setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
            >
              <h3 className="mb-4 text-lg font-medium text-neutral-100">
                Exportar cuentas por cobrar a CSV
              </h3>
              <p className="mb-4 text-sm text-neutral-400">
                Elige el rango de fechas (por fecha de creación). Máximo 366 días.
              </p>
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Desde fecha</label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Hasta fecha</label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
              </div>
              {exportDateFrom && exportDateTo && (() => {
                const fromD = new Date(exportDateFrom);
                const toD = new Date(exportDateTo);
                const valid = !Number.isNaN(fromD.getTime()) && !Number.isNaN(toD.getTime());
                const diffMs = valid ? toD.getTime() - fromD.getTime() : 0;
                const diffDays = valid ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1 : 0;
                return valid && diffDays >= 1 ? (
                  <p className="mb-4 text-sm text-neutral-300">
                    Rango: <strong>{diffDays}</strong> {diffDays === 1 ? 'día' : 'días'}
                  </p>
                ) : null;
              })()}
              {exportError && (
                <p className="mb-4 text-sm text-red-400">{exportError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Exportar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !exporting && setShowExportModal(false)}
                  disabled={exporting}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal registrar abono */}
      <AnimatePresence>
        {paymentModalReceivable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !addingPayment && (setPaymentModalReceivable(null), setPaymentAmount(''), setPaymentNotes(''))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-100 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary-400" />
                  Registrar abono
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!addingPayment) {
                      setPaymentModalReceivable(null);
                      setPaymentAmount('');
                      setPaymentNotes('');
                    }
                  }}
                  disabled={addingPayment}
                  className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-neutral-400">
                {paymentModalReceivable.customerName || 'Sin nombre'}
                {paymentModalReceivable.customerPhone && (
                  <span className="ml-2 text-neutral-500">· {paymentModalReceivable.customerPhone}</span>
                )}
              </p>
              <p className="mb-4 text-sm text-neutral-500">
                Total a cobrar: <strong className="text-neutral-300">{paymentModalReceivable.currency} {paymentModalReceivable.amount.toFixed(2)}</strong>
              </p>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Monto del abono *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Notas (opcional)</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ej: Pago en efectivo"
                    maxLength={500}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={addingPayment || !paymentAmount.trim()}
                    className="inline-flex items-center gap-2"
                  >
                    {addingPayment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    Registrar abono
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!addingPayment) {
                        setPaymentModalReceivable(null);
                        setPaymentAmount('');
                        setPaymentNotes('');
                      }
                    }}
                    disabled={addingPayment}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selector de Tienda */}
      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
        {authState.stores.length === 0 ? (
          <div className="text-sm text-neutral-400">No tienes acceso a ninguna tienda</div>
        ) : (
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setReceivables([]);
              setTotal(0);
              setPage(1);
              setStatusFilter('');
              setHasLoadedOnce(false);
            }}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
          >
            <option value="">
              {authState.stores.length === 0 ? 'No hay tiendas disponibles' : 'Selecciona una tienda...'}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Cobrada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {selectedStoreId && (
        <div className="mb-4 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 sm:mb-6 sm:rounded-3xl sm:p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Total pendiente por cobrar
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {Object.keys(pendingTotalByCurrency).length === 0 ? (
              <span className="text-xl font-semibold tabular-nums text-neutral-300 sm:text-2xl">
                0.00
              </span>
            ) : (
              Object.entries(pendingTotalByCurrency).map(([currency, amount]) => (
                <span
                  key={currency}
                  className="text-xl font-semibold tabular-nums text-neutral-100 sm:text-2xl"
                >
                  {currency} {amount.toFixed(2)}
                </span>
              ))
            )}
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
          <Receipt className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Selecciona una tienda
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            Elige una tienda arriba para ver sus cuentas por cobrar
          </p>
        </div>
      ) : !loading && total === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            No hay cuentas por cobrar
          </h3>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">
            {statusFilter
              ? 'No hay cuentas con este filtro'
              : 'Crea una cuenta manual o a partir de un pedido'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/admin/receivables/create">
              <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Nueva cuenta (manual)
              </Button>
            </Link>
            <Link href="/admin/receivables/create?from=request">
              <Button variant="primary" size="sm" className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Crear desde pedido
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-neutral-950/30 sm:rounded-3xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}

          {/* Cards grid (desktop + mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5 lg:p-6">
            {receivables.map((rec) => {
              const statusInfo = STATUS_LABELS[rec.status] || STATUS_LABELS.pending;
              const fromPedido = !!rec.requestId;
              return (
                <motion.article
                  key={rec.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-medium text-neutral-100 leading-snug">
                          {rec.customerName || 'Sin nombre'}
                        </h3>
                        {rec.customerPhone && (
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-xs text-neutral-500">{rec.customerPhone}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(rec)}
                              disabled={openingWhatsAppId === rec.id}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-60"
                              title="Abrir WhatsApp"
                              aria-label="Abrir WhatsApp"
                            >
                              {openingWhatsAppId === rec.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MessageCircle className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded-lg border px-2 py-0.5 text-xs font-medium',
                          statusInfo.bgColor,
                          statusInfo.color,
                          statusInfo.borderColor
                        )}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    {rec.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2" title={rec.description}>
                        {rec.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold tabular-nums text-neutral-100">
                        {rec.currency} {rec.amount.toFixed(2)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs',
                          fromPedido ? 'border-primary-500/30 bg-primary-500/10 text-primary-400' : 'border-neutral-600 bg-neutral-800/50 text-neutral-400'
                        )}
                      >
                        {fromPedido ? (
                          <>
                            <ShoppingBag className="h-3 w-3" />
                            Pedido
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3" />
                            Manual
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {new Date(rec.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 border-t border-neutral-700/60">
                    <Link
                      href={`/admin/receivables/${rec.id}?storeId=${encodeURIComponent(selectedStoreId)}`}
                      className="flex min-w-0 items-center justify-center gap-2 py-3.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700/50 hover:text-primary-400 active:bg-neutral-700 border-b border-r border-neutral-700/60"
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      Ver
                    </Link>
                    {rec.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentModalReceivable(rec);
                            setPaymentAmount('');
                            setPaymentNotes('');
                          }}
                          className="flex min-w-0 items-center justify-center gap-2 py-3.5 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/10 active:bg-primary-500/15 border-b border-neutral-700/60"
                        >
                          <Wallet className="h-4 w-4 shrink-0" />
                          Abonar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rec.id, 'paid')}
                          disabled={updatingId === rec.id}
                          className="flex min-w-0 items-center justify-center gap-2 py-3.5 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/10 active:bg-green-500/15 disabled:opacity-50 border-b border-r border-neutral-700/60"
                        >
                          {updatingId === rec.id && updatingStatus === 'paid' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Cobrada
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rec.id, 'cancelled')}
                          disabled={updatingId === rec.id}
                          className="flex min-w-0 items-center justify-center gap-2 py-3.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-50 border-b border-neutral-700/60"
                        >
                          {updatingId === rec.id && updatingStatus === 'cancelled' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <div className="border-b border-neutral-700/60" aria-hidden />
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex flex-col gap-4 border-t border-neutral-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="order-2 text-center text-xs text-neutral-500 sm:order-1 sm:text-left sm:text-sm">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </p>
              <div className="order-1 grid grid-cols-2 gap-3 sm:order-2 sm:flex sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                  className="h-11 justify-center gap-1.5 sm:h-auto sm:min-w-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= maxPage}
                  onClick={() => goToPage(page + 1)}
                  className="h-11 justify-center gap-1.5 sm:h-auto sm:min-w-0"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
