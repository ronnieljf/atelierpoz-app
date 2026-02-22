'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { getReceivables, getPendingTotal, updateReceivable, createReceivablePayment, getReceivablePayments, hasReceivablesWhatsAppReminderFeature, sendReceivableReminders, bulkUpdateReceivableStatus } from '@/lib/services/receivables';
import { getRequestById } from '@/lib/services/requests';
import type { Receivable, ReceivableStatus } from '@/types/receivable';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Receipt, Plus, Loader2, Eye, FileText, ShoppingBag, ChevronLeft, ChevronRight, Check, X, Download, Wallet, MessageCircle, CheckSquare, Square } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
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

interface ReceivableGroupByPhone {
  normalizedPhone: string;
  phone: string;
  receivables: Receivable[];
}

function normalizePhoneForGrouping(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  const withPlus = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  return withPlus.replace(/\s+/g, '');
}

function groupReceivablesByPhone(receivables: Receivable[]): {
  groups: ReceivableGroupByPhone[];
  missing: Receivable[];
} {
  const map = new Map<string, ReceivableGroupByPhone>();
  const missing: Receivable[] = [];

  for (const r of receivables) {
    const raw = r.customerPhone?.trim() || '';
    if (!raw) {
      missing.push(r);
      continue;
    }
    const normalized = normalizePhoneForGrouping(raw);
    if (!normalized) {
      missing.push(r);
      continue;
    }
    const existing = map.get(normalized);
    if (existing) {
      existing.receivables.push(r);
    } else {
      map.set(normalized, {
        normalizedPhone: normalized,
        phone: raw,
        receivables: [r],
      });
    }
  }

  return {
    groups: Array.from(map.values()),
    missing,
  };
}

export default function ReceivablesPage() {
  const { state: authState } = useAuth();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState('');
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
  const [filterTotalByCurrency, setFilterTotalByCurrency] = useState<Record<string, number>>({});

  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(new Set());
  const [loadingSelectAll, setLoadingSelectAll] = useState(false);

  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [whatsAppDialogGroups, setWhatsAppDialogGroups] = useState<ReceivableGroupByPhone[]>([]);
  const [whatsAppDialogMissing, setWhatsAppDialogMissing] = useState<Receivable[]>([]);
  const [checkingWhatsAppFeature, setCheckingWhatsAppFeature] = useState(false);
  const [sendingWhatsAppBulk, setSendingWhatsAppBulk] = useState(false);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState<'paid' | 'cancelled' | null>(null);

  const [bulkConfirmDialog, setBulkConfirmDialog] = useState<{
    open: boolean;
    action: 'paid' | 'cancelled' | null;
    pendingReceivables: Receivable[];
    skippedCount: number;
  }>({ open: false, action: null, pendingReceivables: [], skippedCount: 0 });

  useEffect(() => {
    if (authState.stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setCustomerSearchDebounced(customerSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [customerSearch]);

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
        search: customerSearchDebounced || undefined,
      });
      setReceivables(result.receivables);
      setTotal(result.total);
      setFilterTotalByCurrency(result.totalAmountByCurrency ?? {});
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
      setFilterTotalByCurrency({});
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, page, statusFilter, customerSearchDebounced]);

  useEffect(() => {
    if (selectedStoreId) loadReceivables();
    else {
      setReceivables([]);
      setTotal(0);
      setPendingTotalByCurrency({});
      setFilterTotalByCurrency({});
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

  const toggleReceivableSelection = (id: string) => {
    setSelectedReceivableIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectCurrentPage = () => {
    setSelectedReceivableIds((prev) => {
      const next = new Set(prev);
      receivables.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const selectAllMatchingFilter = async () => {
    if (!selectedStoreId || total === 0) return;
    setLoadingSelectAll(true);
    setMessage(null);
    try {
      const result = await getReceivables(selectedStoreId, {
        limit: total,
        offset: 0,
        status: statusFilter || undefined,
        search: customerSearchDebounced || undefined,
      });
      setSelectedReceivableIds(new Set(result.receivables.map((r) => r.id)));
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar la lista',
      });
    } finally {
      setLoadingSelectAll(false);
    }
  };

  const clearSelection = () => {
    setSelectedReceivableIds(new Set());
  };

  const handleSendReminderWhatsApp = async () => {
    if (!selectedStoreId || selectedReceivableIds.size === 0) return;
    setMessage(null);
    setCheckingWhatsAppFeature(true);

    try {
      const featureEnabled = await hasReceivablesWhatsAppReminderFeature(selectedStoreId);
      if (!featureEnabled) {
        setMessage({
          type: 'error',
          text: 'Esta tienda no tiene activo el envío de recordatorios por WhatsApp. Para activarlo, contáctanos por WhatsApp: +584120893949',
        });
        return;
      }

      const selected = receivables.filter((r) => selectedReceivableIds.has(r.id));
      if (selected.length === 0) {
        setMessage({
          type: 'error',
          text: 'No hay cuentas válidas seleccionadas.',
        });
        return;
      }

      const { groups, missing } = groupReceivablesByPhone(selected);

      if (groups.length === 0) {
        setMessage({
          type: 'error',
          text: 'Ninguna de las cuentas seleccionadas tiene número de teléfono.',
        });
        return;
      }

      setWhatsAppDialogGroups(groups);
      setWhatsAppDialogMissing(missing);
      setWhatsAppDialogOpen(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'No se pudo verificar la configuración de WhatsApp.',
      });
    } finally {
      setCheckingWhatsAppFeature(false);
    }
  };

  const confirmSendWhatsAppBulk = async () => {
    if (!selectedStoreId || !whatsAppDialogGroups.length) {
      setWhatsAppDialogOpen(false);
      return;
    }

    setSendingWhatsAppBulk(true);
    setMessage(null);

    try {
      const recipients = whatsAppDialogGroups
        .map((group) => {
          if (group.receivables.length === 0) return null;
          return {
            phone: group.normalizedPhone,
            receivableIds: group.receivables.map((r) => r.id),
          };
        })
        .filter((r): r is { phone: string; receivableIds: string[] } => r != null);

      const result = await sendReceivableReminders(selectedStoreId, recipients);

      const missingText = whatsAppDialogMissing.length
        ? ` ${whatsAppDialogMissing.length} cuenta(s) sin número no recibieron mensaje.`
        : '';
      if (result.failed === 0) {
        setMessage({
          type: 'success',
          text: `Se enviaron ${result.sent} recordatorio(s) por WhatsApp.${missingText}`,
        });
      } else {
        setMessage({
          type: result.sent > 0 ? 'success' : 'error',
          text: `Enviados: ${result.sent}. Fallaron: ${result.failed}.${missingText}${
            result.failedDetails?.length
              ? ` Detalles: ${result.failedDetails.map((f) => f.error).join('; ')}`
              : ''
          }`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al enviar recordatorios por WhatsApp.',
      });
    } finally {
      setSendingWhatsAppBulk(false);
      setWhatsAppDialogOpen(false);
    }
  };

  const openBulkConfirmDialog = (action: 'paid' | 'cancelled') => {
    const selected = receivables.filter((r) => selectedReceivableIds.has(r.id));
    const pending = selected.filter((r) => r.status === 'pending');
    const skipped = selected.length - pending.length;
    setBulkConfirmDialog({
      open: true,
      action,
      pendingReceivables: pending,
      skippedCount: skipped,
    });
  };

  const closeBulkConfirmDialog = () => {
    if (bulkUpdatingStatus) return;
    setBulkConfirmDialog({ open: false, action: null, pendingReceivables: [], skippedCount: 0 });
  };

  const confirmBulkUpdateStatus = async () => {
    if (!selectedStoreId || !bulkConfirmDialog.action || bulkConfirmDialog.pendingReceivables.length === 0) {
      closeBulkConfirmDialog();
      return;
    }
    setMessage(null);
    setBulkUpdatingStatus(bulkConfirmDialog.action);
    try {
      const ids = bulkConfirmDialog.pendingReceivables.map((r) => r.id);
      const result = await bulkUpdateReceivableStatus(selectedStoreId, ids, bulkConfirmDialog.action);
      closeBulkConfirmDialog();
      if (result.updated > 0) {
        await loadReceivables();
        setSelectedReceivableIds(new Set());
        const label = bulkConfirmDialog.action === 'paid' ? 'cobrada' : 'cancelada';
        const msg = result.skipped > 0
          ? `${result.updated} cuenta(s) marcada(s) como ${label}. ${result.skipped} omitida(s) (no estaban pendientes).`
          : `${result.updated} cuenta(s) marcada(s) como ${label}.`;
        setMessage({ type: 'success', text: msg });
      } else {
        setMessage({
          type: 'error',
          text: 'No se pudo actualizar el estado.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar el estado.',
      });
    } finally {
      setBulkUpdatingStatus(null);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: 'paid' | 'cancelled') => {
    if (!selectedStoreId || selectedReceivableIds.size === 0) return;
    openBulkConfirmDialog(newStatus);
  };

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
      const storeForPhone = authState.stores.find((s) => s.id === selectedStoreId);
      openWhatsAppForReceivable({
        ...rec,
        payments,
        totalPaid,
        orderItems,
        storeReplyPhoneNumber: storeForPhone?.phone_number?.trim() || undefined,
        storeName: storeForPhone?.name?.trim() || undefined,
        orderNumber: requestDetails?.orderNumber ?? undefined,
      });
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

  const openExportModal = () => {
    setShowExportModal(true);
    setExportError(null);
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - 364);
    const fromStr = fromDate.toISOString().slice(0, 10);
    setExportDateFrom(fromStr);
    setExportDateTo(toStr);
  };

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
        status: statusFilter || undefined,
        search: customerSearchDebounced || undefined,
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
          r.requestId ? (r.orderNumber != null ? `Pedido #${r.orderNumber}` : 'Pedido') : 'Manual',
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
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
              Cuentas por cobrar
            </h1>
            <Tooltip content="Registra y gestiona pagos pendientes de tus clientes. Puedes crear cuentas desde pedidos o manualmente." />
          </div>
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
              <Button variant="outline" size="sm" className="inline-flex items-center gap-2" title="Crear una cuenta por cobrar manualmente">
                <Plus className="h-4 w-4" />
                Nueva cuenta (manual)
              </Button>
            </Link>
            <Link href="/admin/receivables/create?from=request">
              <Button variant="primary" size="sm" className="inline-flex items-center gap-2" title="Crear cuenta desde un pedido existente">
                <ShoppingBag className="h-4 w-4" />
                Crear desde pedido
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={openExportModal}
              onTouchEnd={(e) => {
                e.preventDefault();
                openExportModal();
              }}
              className="inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center gap-2"
              title="Exportar cuentas a archivo Excel/CSV"
            >
              <Download className="h-4 w-4" />
              Descargar CSV
            </Button>
          </div>
        )}
      </div>

      {/* Modal exportar CSV (portal para correcta visualización en mobile) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showExportModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ minHeight: '100dvh' }}
                onClick={() => !exporting && setShowExportModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="export-csv-title"
                  className="my-auto w-full max-w-md shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
                >
              <h3 id="export-csv-title" className="mb-4 text-lg font-medium text-neutral-100">
                Exportar cuentas por cobrar a CSV
              </h3>
              <p className="mb-4 text-sm text-neutral-400">
                Elige el rango de fechas (por fecha de creación). Máximo 366 días. Se aplican también los filtros actuales (Estado y Cliente/número).
              </p>
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Desde fecha</label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="h-12 w-full min-w-0 appearance-none rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-11 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Hasta fecha</label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="h-12 w-full min-w-0 appearance-none rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-11 sm:text-sm"
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
          </AnimatePresence>,
          document.body
        )}

      {/* Modal registrar abono (portal para correcta visualización en mobile) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {paymentModalReceivable && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ minHeight: '100dvh' }}
                onClick={() => !addingPayment && (setPaymentModalReceivable(null), setPaymentAmount(''), setPaymentNotes(''))}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="my-auto w-full max-w-md shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
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
          </AnimatePresence>,
          document.body
        )}

      {/* Modal envío masivo de recordatorios por WhatsApp (portal para centrado en viewport) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {whatsAppDialogOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ minHeight: '100dvh' }}
                onClick={() => !sendingWhatsAppBulk && setWhatsAppDialogOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="my-auto w-full max-w-md shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
                >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-100 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-400" />
                  Enviar recordatorios por WhatsApp
                </h3>
                <button
                  type="button"
                  onClick={() => !sendingWhatsAppBulk && setWhatsAppDialogOpen(false)}
                  disabled={sendingWhatsAppBulk}
                  className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-3 text-sm text-neutral-300">
                Se enviará un recordatorio por WhatsApp a cada cliente con el detalle de sus cuentas pendientes seleccionadas.
              </p>
              <p className="mb-3 text-sm text-neutral-400">
                <strong>{whatsAppDialogGroups.length}</strong> contacto(s) recibirán el mensaje.
                {whatsAppDialogMissing.length > 0 && (
                  <>
                    {' '}
                    <span className="text-yellow-300">
                      {whatsAppDialogMissing.length} cuenta(s) sin teléfono no recibirán recordatorio.
                    </span>
                  </>
                )}
              </p>

              <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800/50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Detalle por destinatario
                </p>
                <ul className="space-y-3">
                  {whatsAppDialogGroups.map((group) => {
                    const byCurrency: Record<string, number> = {};
                    for (const r of group.receivables) {
                      const c = r.currency || 'USD';
                      byCurrency[c] = (byCurrency[c] ?? 0) + r.amount;
                    }
                    const totalText = Object.entries(byCurrency)
                      .map(([curr, amt]) => `${curr} ${amt.toFixed(2)}`)
                      .join(', ');
                    return (
                      <li key={group.normalizedPhone} className="border-b border-neutral-700/60 pb-3 last:border-0 last:pb-0">
                        <div className="font-medium text-neutral-200">
                          {group.receivables[0]?.customerName || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-neutral-500">{group.phone}</div>
                        <ul className="mt-1.5 space-y-0.5 pl-2 text-sm text-neutral-300">
                          {group.receivables.map((r) => (
                            <li key={r.id}>
                              {r.receivableNumber != null ? `Cuenta #${r.receivableNumber}` : 'Cuenta'} · {r.currency} {r.amount.toFixed(2)}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-1.5 pl-2 text-sm font-medium text-primary-400">
                          Total: {totalText}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {whatsAppDialogMissing.length > 0 && (
                <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-300">
                    Cuentas sin número
                  </p>
                  <ul className="max-h-32 space-y-1 overflow-auto text-xs text-neutral-200">
                    {whatsAppDialogMissing.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {r.customerName || 'Sin nombre'}
                          {r.receivableNumber != null && ` · Cuenta #${r.receivableNumber}`}
                        </span>
                        <span className="shrink-0 text-neutral-500">sin teléfono</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={confirmSendWhatsAppBulk}
                  disabled={sendingWhatsAppBulk}
                  className="inline-flex items-center gap-2"
                >
                  {sendingWhatsAppBulk ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Enviar recordatorios por WhatsApp
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => !sendingWhatsAppBulk && setWhatsAppDialogOpen(false)}
                  disabled={sendingWhatsAppBulk}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body
        )}

      {/* Modal confirmación Cobrar / Cancelar en lote */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {bulkConfirmDialog.open && bulkConfirmDialog.action && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ minHeight: '100dvh' }}
                onClick={closeBulkConfirmDialog}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="my-auto w-full max-w-lg shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-neutral-100 flex items-center gap-2">
                      {bulkConfirmDialog.action === 'paid' ? (
                        <>
                          <Wallet className="h-5 w-5 text-green-400" />
                          Confirmar: Marcar como cobradas
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-400" />
                          Confirmar: Cancelar cuentas
                        </>
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={closeBulkConfirmDialog}
                      disabled={!!bulkUpdatingStatus}
                      className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mb-3 text-sm text-neutral-300">
                    {bulkConfirmDialog.action === 'paid'
                      ? 'Se marcarán como cobradas las siguientes cuentas. Esta acción no se puede deshacer.'
                      : 'Se cancelarán las siguientes cuentas. El stock de pedidos vinculados se restaurará. Esta acción no se puede deshacer.'}
                  </p>
                  {bulkConfirmDialog.skippedCount > 0 && (
                    <p className="mb-3 text-sm text-yellow-300">
                      {bulkConfirmDialog.skippedCount} cuenta(s) no están pendientes y se omitirán.
                    </p>
                  )}
                  {bulkConfirmDialog.pendingReceivables.length === 0 ? (
                    <p className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-200">
                      Ninguna de las cuentas seleccionadas está pendiente. Solo se pueden cobrar o cancelar cuentas pendientes.
                    </p>
                  ) : (
                    <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800/50 p-3">
                      {bulkConfirmDialog.pendingReceivables.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-neutral-200">
                            {r.customerName || 'Sin nombre'}
                            {r.receivableNumber != null && (
                              <span className="ml-1 text-neutral-500">· Cuenta #{r.receivableNumber}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-medium tabular-nums text-neutral-100">
                            {r.currency} {r.amount.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={confirmBulkUpdateStatus}
                      disabled={!!bulkUpdatingStatus || bulkConfirmDialog.pendingReceivables.length === 0}
                      className="inline-flex items-center gap-2"
                    >
                      {bulkUpdatingStatus ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : bulkConfirmDialog.action === 'paid' ? (
                        <>
                          <Wallet className="h-4 w-4" />
                          Marcar como cobradas
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Cancelar cuentas
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={closeBulkConfirmDialog}
                      disabled={!!bulkUpdatingStatus}
                    >
                      Volver
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

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
              setFilterTotalByCurrency({});
              setPage(1);
              setStatusFilter('pending');
              setHasLoadedOnce(false);
              setSelectedReceivableIds(new Set());
            }}
            className="h-12 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
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
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Cliente o número</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Nombre, teléfono o Nro de cuenta"
                className="h-12 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-12 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
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
        <>
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
          {(statusFilter !== 'pending' || customerSearchDebounced) && (
            <div className="mb-4 rounded-2xl border border-neutral-700/80 bg-neutral-800/50 p-4 sm:mb-6 sm:rounded-3xl sm:p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Total del filtro ({total} {total === 1 ? 'cuenta' : 'cuentas'})
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {Object.keys(filterTotalByCurrency).length === 0 ? (
                  <span className="text-xl font-semibold tabular-nums text-neutral-300 sm:text-2xl">
                    0.00
                  </span>
                ) : (
                  Object.entries(filterTotalByCurrency).map(([currency, amount]) => (
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
        </>
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
            {statusFilter || customerSearchDebounced
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
        <div className="relative">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}

          {/* Barra de selección y acciones masivas (solo si la tienda tiene recordatorios por WhatsApp) */}
          {(() => {
            const currentStore = authState.stores.find((s) => s.id === selectedStoreId);
            const showSelectionUI = currentStore?.feature_send_reminder_receivables_whatsapp === true;
            const hasSelection = selectedReceivableIds.size > 0;
            const isBusy = checkingWhatsAppFeature || sendingWhatsAppBulk || !!bulkUpdatingStatus;
            if (!showSelectionUI) return null;
            return (
              <div
                className={cn(
                  'mb-6 rounded-2xl border p-4 transition-all sm:rounded-3xl sm:p-5',
                  hasSelection
                    ? 'border-primary-500/30 bg-primary-500/5 shadow-lg shadow-primary-500/5'
                    : 'border-neutral-700/60 bg-neutral-800/30'
                )}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Acciones en lote
                </p>
                {!hasSelection ? (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={selectCurrentPage}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-600 bg-neutral-800/80 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      <CheckSquare className="h-4 w-4 text-primary-400" />
                      Seleccionar página actual
                    </button>
                    <button
                      type="button"
                      onClick={selectAllMatchingFilter}
                      disabled={total === 0 || loadingSelectAll}
                      className="inline-flex items-center gap-2 rounded-xl border border-neutral-600 bg-neutral-800/80 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-700/60 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      {loadingSelectAll ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckSquare className="h-4 w-4 text-primary-400" />
                      )}
                      Seleccionar todos
                      <span className="rounded-md bg-neutral-700/80 px-2 py-0.5 text-xs tabular-nums text-neutral-300">
                        {total}
                      </span>
                    </button>
                    <span className="ml-1 text-xs text-neutral-500 sm:ml-0">
                      Selecciona cuentas para enviar recordatorio por WhatsApp o marcar como cobradas/canceladas.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-xl bg-primary-500/20 px-3 py-1.5 text-sm font-semibold text-primary-300">
                          <Check className="h-4 w-4" />
                          {selectedReceivableIds.size} {selectedReceivableIds.size === 1 ? 'cuenta seleccionada' : 'cuentas seleccionadas'}
                        </span>
                        <button
                          type="button"
                          onClick={clearSelection}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-700/60 hover:text-neutral-200 disabled:opacity-50"
                          title="Quitar selección"
                        >
                          <Square className="h-4 w-4" />
                          Limpiar
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-700/60 pt-4 sm:gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="!bg-green-600 !text-white hover:!bg-green-500 focus:ring-green-500/50 border-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
                        onClick={handleSendReminderWhatsApp}
                        disabled={isBusy}
                        title="Enviar recordatorio por WhatsApp a los clientes de las cuentas seleccionadas"
                      >
                        {checkingWhatsAppFeature || sendingWhatsAppBulk ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        Enviar por WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-2 rounded-xl border-green-500/50 px-4 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/10 focus:ring-green-500/50"
                        onClick={() => handleBulkUpdateStatus('paid')}
                        disabled={isBusy}
                        title="Marcar las cuentas seleccionadas como cobradas"
                      >
                        {bulkUpdatingStatus === 'paid' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wallet className="h-4 w-4" />
                        )}
                        Marcar cobradas
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-2 rounded-xl border-red-500/50 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 focus:ring-red-500/50"
                        onClick={() => handleBulkUpdateStatus('cancelled')}
                        disabled={isBusy}
                        title="Cancelar las cuentas seleccionadas (solo pendientes)"
                      >
                        {bulkUpdatingStatus === 'cancelled' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Cancelar cuentas
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Cards grid (desktop + mobile) */}
          {(() => {
            const currentStore = authState.stores.find((s) => s.id === selectedStoreId);
            const showSelectionUI = currentStore?.feature_send_reminder_receivables_whatsapp === true;
            return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {receivables.map((rec) => {
              const statusInfo = STATUS_LABELS[rec.status] || STATUS_LABELS.pending;
              const fromPedido = !!rec.requestId;
              const isSelected = showSelectionUI && selectedReceivableIds.has(rec.id);
              return (
                <motion.article
                  key={rec.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-neutral-800/40',
                    isSelected ? 'border-primary-500/50 ring-2 ring-primary-500/20' : 'border-neutral-700/60'
                  )}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        {showSelectionUI && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReceivableSelection(rec.id);
                          }}
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-neutral-500 bg-neutral-800 text-neutral-300 transition-colors hover:border-primary-500 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          aria-label={isSelected ? 'Quitar de selección' : 'Seleccionar'}
                        >
                          {isSelected ? (
                            <Check className="h-3 w-3 text-primary-400" />
                          ) : null}
                        </button>
                        )}
                        <div className="min-w-0 flex-1">
                        {rec.receivableNumber != null && (
                          <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">
                            Cuenta #{rec.receivableNumber}
                          </p>
                        )}
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
                    {rec.itemsCount != null && rec.itemsCount > 0 && (
                      <p className="text-xs text-neutral-500">
                        {rec.itemsCount} {rec.itemsCount === 1 ? 'producto' : 'productos'}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-500">Total</span>
                        <span className="text-base font-semibold tabular-nums text-neutral-100">
                          {rec.currency} {rec.amount.toFixed(2)}
                        </span>
                      </div>
                      {(rec.totalPaid != null && rec.totalPaid > 0) && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-500">Abonado</span>
                          <span className="text-sm tabular-nums text-green-400">
                            {rec.currency} {rec.totalPaid.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {rec.status === 'pending' && (
                        <div className="flex items-center justify-between gap-2 border-t border-neutral-700/60 pt-1.5">
                          <span className="text-xs font-medium text-neutral-400">Pendiente</span>
                          <span className="text-sm font-semibold tabular-nums text-amber-400">
                            {rec.currency} {Math.max(0, rec.amount - (rec.totalPaid ?? 0)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs',
                          fromPedido ? 'border-primary-500/30 bg-primary-500/10 text-primary-400' : 'border-neutral-600 bg-neutral-800/50 text-neutral-400'
                        )}
                      >
                        {fromPedido ? (
                          <>
                            <ShoppingBag className="h-3 w-3" />
                            {rec.orderNumber != null ? `Pedido #${rec.orderNumber}` : 'Pedido'}
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
                      {(rec.updatedByName ?? rec.createdByName) && (
                        <span className="text-neutral-400">{rec.updatedByName ?? rec.createdByName} · </span>
                      )}
                      {new Date(rec.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {/* Botones de acción organizados en bloques claros */}
                  <div className="flex flex-col border-t border-neutral-700/60">
                    {/* Ver detalle siempre visible */}
                    <Link
                      href={`/admin/receivables/${rec.id}?storeId=${encodeURIComponent(selectedStoreId)}`}
                      className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/10 active:bg-primary-500/15 border-b border-neutral-700/60"
                      title="Ver información completa y abonos"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver detalle completo</span>
                      <Tooltip content="Ver historial de abonos, información del cliente y más" />
                    </Link>
                    
                    {rec.status === 'pending' && (
                      <>
                        {/* Registrar abono */}
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentModalReceivable(rec);
                            setPaymentAmount('');
                            setPaymentNotes('');
                          }}
                          className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/10 active:bg-blue-500/15 border-b border-neutral-700/60"
                          title="Registrar un pago parcial o total"
                        >
                          <Wallet className="h-4 w-4" />
                          <span>Registrar abono</span>
                          <Tooltip content="Registra un pago parcial. Si completa el monto, la cuenta se marca como cobrada automáticamente" />
                        </button>
                        
                        {/* Acciones finales */}
                        <div className="grid grid-cols-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(rec.id, 'paid')}
                            disabled={updatingId === rec.id}
                            className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/10 active:bg-green-500/15 disabled:opacity-50 border-r border-neutral-700/60"
                            title="Marcar como cobrada completamente"
                          >
                            {updatingId === rec.id && updatingStatus === 'paid' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            <span>Cobrada</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(rec.id, 'cancelled')}
                            disabled={updatingId === rec.id}
                            className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-50"
                            title="Cancelar esta cuenta por cobrar"
                          >
                            {updatingId === rec.id && updatingStatus === 'cancelled' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
            );
          })()}

          {total > PAGE_SIZE && (
            <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
