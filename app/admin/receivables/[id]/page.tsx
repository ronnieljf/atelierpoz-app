'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getReceivableById, updateReceivable, reopenReceivable, getReceivablePayments, createReceivablePayment, deleteReceivablePayment, getReceivableLogs, getReceivableAttachments, createReceivableAttachment, getReceivableAttachmentDownloadUrl, getReceivableReminders, getReceivableReminderDefaults, createReceivableReminder, updateReceivableReminder, deleteReceivableReminder, type ReceivableLogEntry } from '@/lib/services/receivables';
import { getStorePaymentOptions, type StorePaymentOption } from '@/lib/services/stores';
import { getRequestById, type Request } from '@/lib/services/requests';
import type { Receivable, ReceivableStatus, ReceivablePayment, ReceivableAttachment, ReceivableReminder } from '@/types/receivable';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import {
  Receipt,
  ArrowLeft,
  Loader2,
  FileText,
  ShoppingBag,
  Check,
  X,
  Save,
  Package,
  Wallet,
  Plus,
  MessageCircle,
  RotateCcw,
  Trash2,
  Clock,
  Paperclip,
  Download,
  Upload,
  Bell,
  Calendar,
  Edit3,
} from 'lucide-react';
import { openWhatsAppForReceivable } from '@/lib/utils/whatsapp';
import { formatContactPhone } from '@/lib/utils/phone';
import { formatDateOnly } from '@/lib/utils/date';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

const STATUS_LABELS: Record<ReceivableStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
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

export default function ReceivableDetailPage({
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
  const openReminderFromQuery = Array.isArray(resolvedSearch?.openReminder)
    ? resolvedSearch.openReminder[0]
    : resolvedSearch?.openReminder ?? '';

  const { state: authState } = useAuth();
  const router = useRouter();
  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ReceivableStatus | null>(null);
  const [reopening, setReopening] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [requestDetails, setRequestDetails] = useState<Request | null>(null);
  const [activityLogs, setActivityLogs] = useState<ReceivableLogEntry[]>([]);
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  const ACTION_LABELS: Record<string, string> = {
    created: 'Cuenta creada',
    paid_initial: 'Abono inicial registrado',
    items_updated: 'Productos actualizados',
    reopened: 'Cuenta reabierta',
    status_paid: 'Marcada como cobrada',
    status_cancelled: 'Marcada como cancelada',
    updated: 'Información actualizada',
    payment_added: 'Abono registrado',
    payment_deleted: 'Abono eliminado',
    reopened_after_payment_deleted: 'Reabierta tras eliminar abono',
    reminder_sent: 'Recordatorio enviado por WhatsApp',
  };

  function formatLogAction(log: ReceivableLogEntry): string {
    const label = ACTION_LABELS[log.action] ?? log.action;
    const d = log.details as Record<string, unknown> | null | undefined;
    if (!d || typeof d !== 'object') return label;
    if (log.action === 'payment_added' && typeof d.amount === 'number') {
      const curr = (d.currency as string) ?? 'USD';
      return `${label}: ${curr} ${d.amount.toFixed(2)}`;
    }
    if (log.action === 'reminder_sent' && d.phone) {
      return `${label} a ${String(d.phone)}`;
    }
    if (log.action === 'items_updated' && typeof d.newTotal === 'number') {
      return `${label} (total: ${d.newTotal.toFixed(2)})`;
    }
    if (log.action === 'created' && typeof d.amount === 'number') {
      const curr = (d.currency as string) ?? 'USD';
      const fromReq = d.fromRequest ? ' desde pedido' : '';
      return `${label}${fromReq}: ${curr} ${d.amount.toFixed(2)}`;
    }
    if (log.action === 'paid_initial' && typeof d.amount === 'number') {
      const curr = (d.currency as string) ?? 'USD';
      return `${label}: ${curr} ${d.amount.toFixed(2)}`;
    }
    if ((log.action === 'status_paid' || log.action === 'status_cancelled') && d.previousStatus && d.newStatus) {
      return `${label} (${String(d.previousStatus)} → ${String(d.newStatus)})`;
    }
    return label;
  }
  const [loadingRequest, setLoadingRequest] = useState(false);

  const [payments, setPayments] = useState<ReceivablePayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [addingPayment, setAddingPayment] = useState(false);

  const [attachments, setAttachments] = useState<ReceivableAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showUploadAfterPaidModal, setShowUploadAfterPaidModal] = useState(false);
  const [uploadAfterPaidFile, setUploadAfterPaidFile] = useState<File | null>(null);

  const [reminders, setReminders] = useState<ReceivableReminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReceivableReminder | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    customerName: '',
    storeName: '',
    invoiceOrAccount: '',
    fechaVencimiento: '',
    fechaEnvio: '',
    datosPagomovil: '',
    datosTransferencia: '',
    datosBinance: '',
    datosContacto: '',
    tipoRecordatorio: 'aviso' as 'aviso' | 'mora',
    repetirVeces: 1,
    repetirCadaDias: 0,
    interestCadaDias: '',
    interestTipo: '' as '' | 'fijo' | 'porcentaje',
    interestMonto: '',
  });
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  const reminderIsReadOnly = editingReminder != null && editingReminder.status !== 'pending';
  const [paymentOptions, setPaymentOptions] = useState<{ pagomovil: StorePaymentOption[]; transferencia: StorePaymentOption[]; binance: StorePaymentOption[] }>({
    pagomovil: [],
    transferencia: [],
    binance: [],
  });
  const storeId = storeIdFromQuery || (authState.stores.length === 1 ? authState.stores[0].id : '');

  const loadReceivable = useCallback(async () => {
    if (!storeId || !id) {
      setLoading(false);
      setReceivable(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const rec = await getReceivableById(id, storeId);
      setReceivable(rec);
      if (rec) {
        setCustomerName(rec.customerName ?? '');
        setCustomerPhone(rec.customerPhone ?? '');
        setDescription(rec.description ?? '');
        setAmount(String(rec.amount));
        setCurrency(rec.currency ?? 'USD');
        setDueDate(rec.dueDate ?? '');
        setInvoiceNumber(rec.invoiceNumber ?? '');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar la cuenta por cobrar',
      });
      setReceivable(null);
    } finally {
      setLoading(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    if (storeId && id) loadReceivable();
    else setLoading(false);
  }, [storeId, id, loadReceivable]);

  // Si venimos desde la lista con ?openReminder=1, abrir directamente el modal de nuevo recordatorio
  useEffect(() => {
    if (!receivable || !storeId) return;
    if (openReminderFromQuery !== '1') return;
    if (showReminderModal) return;
    // Reutilizar lógica del modal nuevo
    (async () => {
      try {
        setEditingReminder(null);
        setLoadingReminders(true);
        const [defaults, options] = await Promise.all([
          getReceivableReminderDefaults(id, storeId),
          getStorePaymentOptions(storeId),
        ]);
        setPaymentOptions(options);
        const loggedUserPhone = authState.stores.find((s) => s.id === storeId)?.phone_number?.trim() || '';
        const rawPhone = loggedUserPhone || defaults?.datosContacto || '';
        setReminderForm({
          customerName: defaults?.customerName ?? receivable.customerName ?? '',
          storeName: defaults?.storeName ?? receivable.storeName ?? '',
          invoiceOrAccount:
            defaults?.invoiceOrAccount ??
            (receivable.invoiceNumber
              ? String(receivable.invoiceNumber)
              : receivable.receivableNumber
                ? String(receivable.receivableNumber)
                : ''),
          fechaVencimiento: (receivable.dueDate && receivable.dueDate.trim()) ? receivable.dueDate : (defaults?.fechaVencimiento ?? ''),
          fechaEnvio: '',
          datosPagomovil: options.pagomovil.length > 0 ? options.pagomovil[options.pagomovil.length - 1].data : '',
          datosTransferencia: options.transferencia.length > 0 ? options.transferencia[options.transferencia.length - 1].data : '',
          datosBinance: options.binance.length > 0 ? options.binance[options.binance.length - 1].data : '',
          datosContacto: formatContactPhone(rawPhone) || rawPhone,
          tipoRecordatorio: 'aviso',
          repetirVeces: 1,
          repetirCadaDias: 0,
          interestCadaDias: defaults?.interestCadaDias != null ? String(defaults.interestCadaDias) : '',
          interestTipo: (defaults?.interestTipo === 'fijo' || defaults?.interestTipo === 'porcentaje') ? defaults.interestTipo : '',
          interestMonto: defaults?.interestMonto != null ? String(defaults.interestMonto) : '',
        });
        setShowReminderModal(true);
        // Limpiar el query openReminder de la URL para que no se vuelva a abrir en renderizados posteriores
        router.replace(
          `/admin/receivables/${id}?storeId=${encodeURIComponent(storeId)}`,
          { scroll: false }
        );
      } catch (error) {
        console.error('Error abriendo modal de recordatorio desde lista:', error);
      } finally {
        setLoadingReminders(false);
      }
    })();
  }, [openReminderFromQuery, receivable, storeId, id, authState.stores, showReminderModal, router]);

  const loadRequestDetails = useCallback(async () => {
    if (!receivable?.requestId || !storeId) {
      setRequestDetails(null);
      return;
    }
    setLoadingRequest(true);
    try {
      const req = await getRequestById(receivable.requestId, storeId);
      setRequestDetails(req ?? null);
    } catch {
      setRequestDetails(null);
    } finally {
      setLoadingRequest(false);
    }
  }, [receivable?.requestId, storeId]);

  useEffect(() => {
    if (receivable?.requestId && storeId) loadRequestDetails();
    else setRequestDetails(null);
  }, [receivable?.requestId, storeId, loadRequestDetails]);

  const loadPayments = useCallback(async () => {
    if (!id || !storeId) return;
    setLoadingPayments(true);
    try {
      const result = await getReceivablePayments(id, storeId);
      if (result) {
        setPayments(result.payments);
        setTotalPaid(result.totalPaid);
        if (result.receivable) setReceivable(result.receivable);
      }
    } catch {
      setPayments([]);
      setTotalPaid(0);
    } finally {
      setLoadingPayments(false);
    }
  }, [id, storeId]);

  // Cargar pagos cuando tengamos id y storeId (no depender de receivable para evitar ciclo: loadPayments hace setReceivable)
  useEffect(() => {
    if (id && storeId) loadPayments();
    else {
      setPayments([]);
      setTotalPaid(0);
    }
  }, [id, storeId, loadPayments]);

  const loadAttachments = useCallback(async () => {
    if (!id || !storeId) return;
    setLoadingAttachments(true);
    try {
      const list = await getReceivableAttachments(id, storeId);
      setAttachments(list);
    } catch {
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    if (id && storeId) loadAttachments();
    else setAttachments([]);
  }, [id, storeId, loadAttachments]);

  const loadReminders = useCallback(async () => {
    if (!id || !storeId) return;
    setLoadingReminders(true);
    try {
      const list = await getReceivableReminders(id, storeId);
      setReminders(list);
    } catch {
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    if (id && storeId) loadReminders();
    else setReminders([]);
  }, [id, storeId, loadReminders]);

  const openAddReminderModal = useCallback(async () => {
    setEditingReminder(null);
    const [defaults, options] = await Promise.all([
      id && storeId ? getReceivableReminderDefaults(id, storeId) : null,
      storeId ? getStorePaymentOptions(storeId) : { pagomovil: [], transferencia: [], binance: [] },
    ]);
    setPaymentOptions(options);
    // Teléfono del usuario logueado (store_user) como valor inicial; editable
    const loggedUserPhone = authState.stores.find((s) => s.id === storeId)?.phone_number?.trim() || '';
    const rawPhone = loggedUserPhone || defaults?.datosContacto || '';
    setReminderForm({
      customerName: defaults?.customerName ?? receivable?.customerName ?? '',
      storeName: defaults?.storeName ?? receivable?.storeName ?? '',
      invoiceOrAccount: defaults?.invoiceOrAccount ?? (receivable?.invoiceNumber ? String(receivable.invoiceNumber) : receivable?.receivableNumber ? String(receivable.receivableNumber) : ''),
      fechaVencimiento: (receivable?.dueDate && receivable.dueDate.trim()) ? receivable.dueDate : (defaults?.fechaVencimiento ?? ''),
      fechaEnvio: '',
      datosPagomovil: options.pagomovil.length > 0 ? options.pagomovil[options.pagomovil.length - 1].data : '',
      datosTransferencia: options.transferencia.length > 0 ? options.transferencia[options.transferencia.length - 1].data : '',
      datosBinance: options.binance.length > 0 ? options.binance[options.binance.length - 1].data : '',
      datosContacto: formatContactPhone(rawPhone) || rawPhone,
      tipoRecordatorio: 'aviso',
      repetirVeces: 1,
      repetirCadaDias: 0,
      interestCadaDias: defaults?.interestCadaDias != null ? String(defaults.interestCadaDias) : '',
      interestTipo: (defaults?.interestTipo === 'fijo' || defaults?.interestTipo === 'porcentaje') ? defaults.interestTipo : '',
      interestMonto: defaults?.interestMonto != null ? String(defaults.interestMonto) : '',
    });
    setShowReminderModal(true);
  }, [id, storeId, receivable, authState.stores]);

  const openEditReminderModal = useCallback(async (r: ReceivableReminder) => {
    setEditingReminder(r);
    const options = storeId ? await getStorePaymentOptions(storeId) : { pagomovil: [], transferencia: [], binance: [] };
    setPaymentOptions(options);
    const storeForPhone = authState.stores.find((s) => s.id === storeId);
    const rawPhone = storeForPhone?.phone_number?.trim() || r.datosContacto || '';
    setReminderForm({
      customerName: r.customerName ?? '',
      storeName: r.storeName ?? '',
      invoiceOrAccount: r.invoiceOrAccount ?? '',
      fechaVencimiento: r.fechaVencimiento ?? '',
      fechaEnvio: r.fechaEnvio ?? '',
      datosPagomovil: r.datosPagomovil ?? '',
      datosTransferencia: r.datosTransferencia ?? '',
      datosBinance: r.datosBinance ?? '',
      datosContacto: formatContactPhone(rawPhone) || rawPhone,
      tipoRecordatorio: (r.tipoRecordatorio === 'mora' || r.tipoRecordatorio === 'aviso') ? r.tipoRecordatorio : (r.esMora ? 'mora' : 'aviso'),
      repetirVeces: r.repetirVeces ?? 0,
      repetirCadaDias: r.repetirCadaDias ?? 0,
      interestCadaDias: r.interestCadaDias != null ? String(r.interestCadaDias) : '',
      interestTipo: (r.interestTipo === 'fijo' || r.interestTipo === 'porcentaje') ? r.interestTipo : '',
      interestMonto: r.interestMonto != null ? String(r.interestMonto) : '',
    });
    setShowReminderModal(true);
  }, [storeId, authState.stores]);

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReminder && editingReminder.status !== 'pending') {
      // Recordatorios enviados o cancelados no se pueden editar
      setShowReminderModal(false);
      setEditingReminder(null);
      return;
    }
    if (!receivable || !storeId || !id) return;
    if (!reminderForm.fechaEnvio.trim()) {
      setMessage({ type: 'error', text: 'La fecha de envío es requerida' });
      return;
    }
    if (!reminderForm.fechaVencimiento.trim()) {
      setMessage({ type: 'error', text: 'La fecha de vencimiento es requerida' });
      return;
    }
    const invoiceVal = reminderForm.invoiceOrAccount.trim();
    setSavingReminder(true);
    setMessage(null);
    try {
      if (editingReminder) {
        const updated = await updateReceivableReminder(id, editingReminder.id, {
          storeId,
          customerName: reminderForm.customerName.trim() || undefined,
          storeName: reminderForm.storeName.trim() || undefined,
          invoiceOrAccount: invoiceVal || undefined,
          fechaVencimiento: reminderForm.fechaVencimiento.trim() || undefined,
          fechaEnvio: reminderForm.fechaEnvio.trim(),
          datosPagomovil: reminderForm.datosPagomovil.trim() || undefined,
          datosTransferencia: reminderForm.datosTransferencia.trim() || undefined,
          datosBinance: reminderForm.datosBinance.trim() || undefined,
          datosContacto: formatContactPhone(reminderForm.datosContacto.trim()) || undefined,
          tipoRecordatorio: reminderForm.tipoRecordatorio,
          repetirVeces: reminderForm.repetirVeces || 0,
          repetirCadaDias: reminderForm.repetirCadaDias || 0,
          interestCadaDias: reminderForm.tipoRecordatorio === 'mora' && reminderForm.interestCadaDias ? Number(reminderForm.interestCadaDias) : undefined,
          interestTipo: reminderForm.tipoRecordatorio === 'mora' && (reminderForm.interestTipo === 'fijo' || reminderForm.interestTipo === 'porcentaje') ? reminderForm.interestTipo : undefined,
          interestMonto: reminderForm.tipoRecordatorio === 'mora' && reminderForm.interestMonto ? parseFloat(reminderForm.interestMonto) : undefined,
        });
        if (updated) {
          setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setShowReminderModal(false);
          setMessage({ type: 'success', text: 'Recordatorio actualizado' });
        }
      } else {
        const created = await createReceivableReminder(id, {
          storeId,
          fechaEnvio: reminderForm.fechaEnvio.trim(),
          fechaVencimiento: reminderForm.fechaVencimiento.trim(),
          customerName: reminderForm.customerName.trim() || undefined,
          storeName: reminderForm.storeName.trim() || undefined,
          invoiceOrAccount: invoiceVal || undefined,
          datosPagomovil: reminderForm.datosPagomovil.trim() || undefined,
          datosTransferencia: reminderForm.datosTransferencia.trim() || undefined,
          datosBinance: reminderForm.datosBinance.trim() || undefined,
          datosContacto: formatContactPhone(reminderForm.datosContacto.trim()) || undefined,
          tipoRecordatorio: reminderForm.tipoRecordatorio,
          repetirVeces: reminderForm.repetirVeces ?? 1,
          repetirCadaDias: reminderForm.repetirCadaDias ?? 0,
          interestCadaDias: reminderForm.tipoRecordatorio === 'mora' && reminderForm.interestCadaDias ? Number(reminderForm.interestCadaDias) : undefined,
          interestTipo: reminderForm.tipoRecordatorio === 'mora' && (reminderForm.interestTipo === 'fijo' || reminderForm.interestTipo === 'porcentaje') ? reminderForm.interestTipo : undefined,
          interestMonto: reminderForm.tipoRecordatorio === 'mora' && reminderForm.interestMonto ? parseFloat(reminderForm.interestMonto) : undefined,
        });
        if (created.length > 0) {
          setReminders((prev) => [...prev, ...created].sort((a, b) => (a.fechaEnvio ?? '').localeCompare(b.fechaEnvio ?? '')));
          setShowReminderModal(false);
          setMessage({ type: 'success', text: created.length === 1 ? 'Recordatorio creado' : `${created.length} recordatorios creados` });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSavingReminder(false);
    }
  };

  const handleSelectPaymentOption = useCallback(
    (type: 'pagomovil' | 'transferencia' | 'binance', optionId: string) => {
      const opts = paymentOptions[type];
      const opt = opts.find((o) => o.id === optionId);
      if (opt) {
        setReminderForm((f) => ({ ...f, [type === 'pagomovil' ? 'datosPagomovil' : type === 'transferencia' ? 'datosTransferencia' : 'datosBinance']: opt.data }));
      } else {
        setReminderForm((f) => ({ ...f, [type === 'pagomovil' ? 'datosPagomovil' : type === 'transferencia' ? 'datosTransferencia' : 'datosBinance']: '' }));
      }
    },
    [paymentOptions]
  );

  const handleDeleteReminder = async (reminderId: string) => {
    if (!id || !storeId) return;
    setDeletingReminderId(reminderId);
    try {
      const ok = await deleteReceivableReminder(id, reminderId, storeId);
      if (ok) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
        setMessage({ type: 'success', text: 'Recordatorio eliminado' });
        if (editingReminder?.id === reminderId) {
          setShowReminderModal(false);
          setEditingReminder(null);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar' });
    } finally {
      setDeletingReminderId(null);
    }
  };

  const loadActivityLogs = useCallback(async () => {
    if (!id || !storeId) return;
    setLoadingActivityLogs(true);
    try {
      const logs = await getReceivableLogs(id, storeId);
      setActivityLogs(logs ?? []);
    } catch {
      setActivityLogs([]);
    } finally {
      setLoadingActivityLogs(false);
    }
  }, [id, storeId]);

  useEffect(() => {
    if (id && storeId) loadActivityLogs();
    else setActivityLogs([]);
  }, [id, storeId, loadActivityLogs]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivable || !storeId) return;
    const amountNum = parseFloat(paymentAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: 'error', text: 'El monto del abono debe ser mayor que 0' });
      return;
    }
    setAddingPayment(true);
    setMessage(null);
    try {
      const result = await createReceivablePayment(receivable.id, {
        storeId,
        amount: amountNum,
        currency: receivable.currency,
        notes: paymentNotes.trim() || undefined,
        file: paymentFile ?? undefined,
      });
      if (result) {
        setPayments(result.payments);
        setTotalPaid(result.totalPaid);
        setReceivable(result.receivable);
        setPaymentAmount('');
        setPaymentNotes('');
        setPaymentFile(null);
        loadAttachments();
        setMessage({
          type: 'success',
          text: result.receivable.status === 'paid'
            ? 'Abono registrado. La cuenta ha sido marcada como cobrada.'
            : 'Abono registrado correctamente',
        });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivable || !storeId) return;
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setMessage({ type: 'error', text: 'El monto debe ser un número mayor o igual a 0' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateReceivable(receivable.id, {
        storeId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        description: description.trim() || undefined,
        amount: amountNum,
        currency,
        dueDate: dueDate || null,
        invoiceNumber: invoiceNumber.trim() || null,
      });
      if (updated) {
        setReceivable(updated);
        setEditMode(false);
        setMessage({ type: 'success', text: 'Cambios guardados correctamente' });
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

  const handleStatusChange = async (newStatus: ReceivableStatus) => {
    if (!receivable || !storeId) return;
    setUpdatingStatus(newStatus);
    setMessage(null);
    try {
      const updated = await updateReceivable(receivable.id, { storeId, status: newStatus });
      if (updated) {
        setReceivable(updated);
        setMessage({
          type: 'success',
          text: newStatus === 'paid' ? 'Marcada como cobrada' : newStatus === 'cancelled' ? 'Cuenta cancelada' : 'Estado actualizado',
        });
        if (newStatus === 'paid') setShowUploadAfterPaidModal(true);
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar el estado' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar estado',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleUploadAttachment = async (file: File, paymentId?: string | null) => {
    if (!receivable || !storeId) return;
    setUploadingAttachment(true);
    setMessage(null);
    try {
      const att = await createReceivableAttachment(receivable.id, storeId, file, paymentId);
      if (att) {
        setAttachments((prev) => [att, ...prev]);
        setMessage({ type: 'success', text: 'Comprobante subido correctamente' });
        setUploadAfterPaidFile(null);
        setShowUploadAfterPaidModal(false);
      } else {
        setMessage({ type: 'error', text: 'No se pudo subir el archivo' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al subir el comprobante',
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (att: ReceivableAttachment) => {
    try {
      const url = await getReceivableAttachmentDownloadUrl(receivable!.id, att.id, storeId);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setMessage({ type: 'error', text: 'No se pudo obtener el enlace de descarga' });
    }
  };

  const handleReopen = async () => {
    if (!receivable || !storeId) return;
    setReopening(true);
    setMessage(null);
    try {
      const updated = await reopenReceivable(receivable.id, storeId);
      if (updated) {
        setReceivable(updated);
        loadPayments();
        setMessage({
          type: 'success',
          text: 'Cuenta reabierta. Puedes corregir o agregar abonos si te equivocaste en el monto.',
        });
      } else {
        setMessage({ type: 'error', text: 'No se pudo reabrir la cuenta' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al reabrir la cuenta',
      });
    } finally {
      setReopening(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!receivable || !storeId) return;
    setDeletingPaymentId(paymentId);
    setMessage(null);
    try {
      const result = await deleteReceivablePayment(receivable.id, paymentId, storeId);
      if (result) {
        setPayments(result.payments);
        setTotalPaid(result.totalPaid);
        setReceivable(result.receivable);
        setMessage({
          type: 'success',
          text: 'Abono eliminado. La cuenta se actualizó correctamente.',
        });
      } else {
        setMessage({ type: 'error', text: 'No se pudo eliminar el abono' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al eliminar el abono',
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (!storeId && authState.stores.length > 1) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/admin/receivables"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a cuentas por cobrar
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-neutral-600" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl">Falta la tienda</h3>
          <p className="mb-6 text-sm text-neutral-400">
            Abre esta cuenta desde la lista de cuentas por cobrar seleccionando una tienda.
          </p>
          <Link href="/admin/receivables">
            <Button variant="outline" size="sm">
              Ir a la lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Loader2 className="h-10 w-10 animate-spin text-primary-400" />
          <span>Cargando cuenta por cobrar...</span>
        </div>
      </div>
    );
  }

  if (!receivable) {
    const createManualHref = storeId ? `/admin/receivables/create?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables/create';
    const createFromPedidoHref = storeId ? `/admin/receivables/create?from=request&storeId=${encodeURIComponent(storeId)}` : '/admin/receivables/create?from=request';
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables'}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a cuentas por cobrar
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={createManualHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Crear manual
              </Button>
            </Link>
            <Link href={createFromPedidoHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Crear desde pedido
              </Button>
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-neutral-600" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl">No encontrada</h3>
          <p className="mb-6 text-sm text-neutral-400">
            La cuenta por cobrar no existe o no tienes acceso.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables'}>
              <Button variant="outline" size="sm">
                Volver a la lista
              </Button>
            </Link>
            <Link href={createManualHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Crear manual
              </Button>
            </Link>
            <Link href={createFromPedidoHref}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Crear desde pedido
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[receivable.status];
  const fromPedido = !!receivable.requestId;
  const listHref = storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables';

  const createManualHref = storeId ? `/admin/receivables/create?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables/create';
  const createFromPedidoHref = storeId ? `/admin/receivables/create?from=request&storeId=${encodeURIComponent(storeId)}` : '/admin/receivables/create?from=request';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={listHref}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a cuentas por cobrar
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={createManualHref}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Crear manual
            </Button>
          </Link>
          <Link href={createFromPedidoHref}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              Crear desde pedido
            </Button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-6 rounded-xl border p-4',
              message.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light">
          Cuenta por cobrar
        </h1>
        <span
          className={cn(
            'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium',
            statusInfo.bgColor,
            statusInfo.color,
            statusInfo.borderColor
          )}
        >
          {statusInfo.label}
        </span>
        {fromPedido && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-primary-500/30 bg-primary-500/10 px-2.5 py-1 text-xs text-primary-400">
            <ShoppingBag className="h-3 w-3" />
            Desde pedido
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            loadActivityLogs();
            setShowActivityLogModal(true);
          }}
          title="Ver historial de actividades"
          aria-label="Ver historial de actividades"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-600/60 bg-neutral-800/50 text-neutral-400 transition-colors hover:border-primary-500/50 hover:bg-primary-500/10 hover:text-primary-400"
        >
          <Clock className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Datos de la cuenta (vista o formulario) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
          {editMode ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Nombre del cliente</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ej. María García"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Teléfono</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ej. +58 412 1234567"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-400">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Detalle de la cuenta por cobrar"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Monto</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Factura (opcional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="Ej. F-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-400">Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit" variant="primary" size="sm" disabled={saving} className="inline-flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditMode(false);
                    setCustomerName(receivable.customerName ?? '');
                    setCustomerPhone(receivable.customerPhone ?? '');
                    setDescription(receivable.description ?? '');
                    setAmount(String(receivable.amount));
                    setCurrency(receivable.currency ?? 'USD');
                    setDueDate(receivable.dueDate ?? '');
                    setInvoiceNumber(receivable.invoiceNumber ?? '');
                  }}
                  disabled={saving}
                >
                  Cancelar edición
                </Button>
              </div>
            </form>
          ) : (
            <>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Cliente</dt>
                  <dd className="mt-1 text-sm font-medium text-neutral-100">
                    {receivable.customerName || '—'}
                  </dd>
                  {receivable.customerPhone && (
                    <dd className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm text-neutral-400">{receivable.customerPhone}</span>
                      <button
                        type="button"
                        onClick={() => {
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
                          const storeForPhone = authState.stores.find((s) => s.id === storeId);
                          openWhatsAppForReceivable({
                            ...receivable,
                            payments,
                            totalPaid,
                            orderItems,
                            storeReplyPhoneNumber: storeForPhone?.phone_number?.trim() || undefined,
                            storeName: storeForPhone?.name?.trim() || undefined,
                            orderNumber: requestDetails?.orderNumber ?? undefined,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </button>
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Descripción</dt>
                  <dd className="mt-1 text-sm text-neutral-400">{receivable.description || '—'}</dd>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Monto</dt>
                    <dd className="mt-1 text-lg font-medium text-neutral-100">
                      {receivable.currency} {Number(receivable.amount).toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Origen</dt>
                    <dd className="mt-1">
                      {fromPedido ? (
                        <span className="inline-flex items-center gap-1 text-sm text-primary-400">
                          <ShoppingBag className="h-4 w-4" />
                          Desde pedido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-neutral-400">
                          <FileText className="h-4 w-4" />
                          Manual
                        </span>
                      )}
                    </dd>
                  </div>
                  {receivable.invoiceNumber && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Factura</dt>
                      <dd className="mt-1 text-sm text-neutral-400">{receivable.invoiceNumber}</dd>
                    </div>
                  )}
                  {receivable.dueDate && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Fecha de vencimiento</dt>
                      <dd className="mt-1 text-sm text-neutral-400">
                        {formatDateOnly(receivable.dueDate)}
                      </dd>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-6 border-t border-neutral-800 pt-4">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Creada</dt>
                    <dd className="mt-1 text-sm text-neutral-400">
                      {new Date(receivable.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Última actualización</dt>
                    <dd className="mt-1 text-sm text-neutral-400">
                      {new Date(receivable.updatedAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                  {receivable.paidAt && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">Fecha de cobro</dt>
                      <dd className="mt-1 text-sm text-green-400">
                        {new Date(receivable.paidAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </dd>
                    </div>
                  )}
                </div>
              </dl>
              {receivable.status === 'pending' && (
                <div className="mt-6 pt-4 border-t border-neutral-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-2"
                  >
                    Editar datos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Productos del pedido (solo si la cuenta viene de un pedido y tiene items) */}
        {fromPedido && (requestDetails?.items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Package className="h-4 w-4 text-primary-400" />
                Productos del pedido
              </h3>
              {receivable.status === 'pending' && storeId && (
                <Link
                  href={`/admin/receivables/${id}/edit-items?storeId=${encodeURIComponent(storeId)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary-500/40 bg-primary-500/10 px-2.5 py-1.5 text-xs font-medium text-primary-400 hover:bg-primary-500/20"
                >
                  Modificar productos
                </Link>
              )}
            </div>
            {loadingRequest ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-700 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      <th className="pb-2 pr-4 pt-1">Producto</th>
                      <th className="pb-2 px-2 pt-1 text-center">Cant.</th>
                      <th className="pb-2 px-2 pt-1 text-right">P. unit.</th>
                      <th className="pb-2 pl-2 pt-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {requestDetails!.items.map((item) => {
                      const name = item.productName ?? 'Producto';
                      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
                      const unitPrice = typeof item.basePrice === 'number' ? item.basePrice : 0;
                      const lineTotal = typeof item.totalPrice === 'number' ? item.totalPrice : unitPrice * qty;
                      const variantLabel =
                        Array.isArray(item.selectedVariants) && item.selectedVariants.length > 0
                          ? item.selectedVariants.map((v) => (v.variantValue ?? v.variantName ?? '')).filter(Boolean).join(', ')
                          : null;
                      return (
                        <tr key={item.id} className="text-neutral-300">
                          <td className="py-2 pr-4">
                            <span className="font-medium text-neutral-100">{name}</span>
                            {variantLabel && (
                              <div className="mt-0.5 text-xs text-neutral-500">{variantLabel}</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">{qty}</td>
                          <td className="px-2 py-2 text-right">
                            {receivable.currency} {unitPrice.toFixed(2)}
                          </td>
                          <td className="pl-2 py-2 text-right font-medium text-neutral-100">
                            {receivable.currency} {lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Comprobantes (archivos adjuntos de la cuenta) */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Paperclip className="h-4 w-4 text-primary-400" />
              Comprobantes
            </h3>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 hover:bg-neutral-700">
                <Upload className="h-3.5 w-3.5" />
                Añadir archivo
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f && receivable) {
                    await handleUploadAttachment(f);
                    e.target.value = '';
                  }
                }}
                disabled={uploadingAttachment}
              />
            </label>
          </div>
          {loadingAttachments ? (
            <p className="text-xs text-neutral-500">Cargando...</p>
          ) : attachments.length === 0 ? (
            <p className="text-xs text-neutral-500">Sin comprobantes. Puedes subir imágenes o PDF al registrar abonos o al marcar como cobrada.</p>
          ) : (
            <ul className="space-y-1.5">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-700/50 bg-neutral-800/50 px-2.5 py-2 text-sm"
                >
                  <span className="truncate text-neutral-300">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(att)}
                    className="shrink-0 rounded p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-primary-400"
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Abonos */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Wallet className="h-4 w-4 text-primary-400" />
            Abonos
          </h3>
          {loadingPayments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
            </div>
          ) : (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2">
                  <span className="text-neutral-500">Total a cobrar</span>
                  <p className="mt-0.5 font-medium text-neutral-100">
                    {receivable.currency} {Number(receivable.amount).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2">
                  <span className="text-neutral-500">Total abonado</span>
                  <p className="mt-0.5 font-medium text-green-400">
                    {receivable.currency} {totalPaid.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2">
                  <span className="text-neutral-500">Pendiente</span>
                  <p className="mt-0.5 font-medium text-neutral-100">
                    {receivable.status === 'paid'
                      ? '—'
                      : receivable.interestAmount != null && receivable.totalWithInterest != null
                        ? `${receivable.currency} ${receivable.totalWithInterest.toFixed(2)}`
                        : `${receivable.currency} ${Math.max(0, Number(receivable.amount) - totalPaid).toFixed(2)}`}
                  </p>
                  {receivable.status === 'pending' && receivable.interestAmount != null && receivable.interestAmount > 0 && (
                    <p className="mt-0.5 text-[11px] text-amber-400">
                      (incluye {receivable.currency} {receivable.interestAmount.toFixed(2)} de interés por mora)
                    </p>
                  )}
                </div>
              </div>
              {payments.length > 0 && (
                <div className="mb-4 overflow-x-auto rounded-xl border border-neutral-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        <th className="pb-2 pl-3 pr-2 pt-3">Fecha</th>
                        <th className="pb-2 px-2 pt-3 text-right">Monto</th>
                        <th className="pb-2 pr-3 pl-2 pt-3">Notas</th>
                        <th className="pb-2 pr-3 pl-2 pt-3 w-20">Comprobante</th>
                        <th className="pb-2 pr-3 pl-2 pt-3 w-12 text-right">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {payments.map((p) => {
                        const paymentAttachments = attachments.filter((a) => a.paymentId === p.id);
                        return (
                        <tr key={p.id} className="text-neutral-300">
                          <td className="py-2 pl-3 pr-2">
                            {new Date(p.createdAt).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-green-400">
                            {p.currency} {Number(p.amount).toFixed(2)}
                          </td>
                          <td className="pr-3 pl-2 py-2 text-neutral-400">{p.notes || '—'}</td>
                          <td className="pr-3 pl-2 py-2">
                            {paymentAttachments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {paymentAttachments.map((att) => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-400 hover:bg-primary-500/10"
                                    title={`Descargar ${att.fileName}`}
                                  >
                                    <Paperclip className="h-3.5 w-3.5" />
                                    <span className="truncate max-w-[80px]">{att.fileName}</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="pr-3 pl-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id)}
                              disabled={deletingPaymentId === p.id}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                              title="Eliminar abono"
                              aria-label="Eliminar abono"
                            >
                              {deletingPaymentId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {receivable.status === 'pending' && (
                <form onSubmit={handleAddPayment} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Monto del abono</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Notas (opcional)</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Ej: Pago parcial en efectivo"
                      maxLength={500}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Comprobante (opcional)</label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600">
                      <Paperclip className="h-4 w-4" />
                      <span>{paymentFile ? paymentFile.name : 'Subir imagen o PDF'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
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
                      <>
                        <Plus className="h-4 w-4" />
                        Registrar abono
                      </>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Recordatorios programables */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Bell className="h-4 w-4 text-primary-400" />
              Recordatorios
            </h3>
            {receivable.status === 'pending' && storeId && (
              <Button
                variant="outline"
                size="sm"
                onClick={openAddReminderModal}
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir recordatorio
              </Button>
            )}
          </div>
          {loadingReminders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
            </div>
          ) : reminders.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500">
              No hay recordatorios programados. Puedes añadir recordatorios con la fecha de envío y los datos del cliente para enviarlos automáticamente.
            </p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => {
                const tipo = (r.tipoRecordatorio === 'mora' || r.tipoRecordatorio === 'aviso') ? r.tipoRecordatorio : (r.esMora ? 'mora' : 'aviso');
                const borderClass = tipo === 'mora' ? 'border-amber-500/60 hover:border-amber-500/80' : 'border-cyan-500/50 hover:border-cyan-500/70';
                return (
                <div
                  key={r.id}
                  onClick={() => openEditReminderModal(r)}
                  className={cn('relative flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-neutral-800/50 p-3 cursor-pointer transition-colors', borderClass)}
                >
                  <span
                    className={cn(
                      'absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-medium',
                      tipo === 'mora' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                    )}
                  >
                    {tipo === 'mora' ? 'Por mora' : 'Aviso'}
                  </span>
                  <div className="min-w-0 flex-1 pl-14">
                    <p className="text-sm font-medium text-neutral-100 truncate">{r.customerName || '—'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Enviar: {formatDateOnly(r.fechaEnvio)}
                      </span>
                      {r.fechaVencimiento && (
                        <span>Venc: {formatDateOnly(r.fechaVencimiento)}</span>
                      )}
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-xs',
                          r.status === 'sent' && 'bg-green-500/20 text-green-400',
                          r.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                          r.status === 'cancelled' && 'bg-neutral-600 text-neutral-400'
                        )}
                      >
                        {r.status === 'sent' ? 'Enviado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                  {receivable.status === 'pending' && r.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditReminderModal(r);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-primary-400"
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReminder(r.id);
                        }}
                        disabled={deletingReminderId === r.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingReminderId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acciones de estado (solo si está pendiente) */}
        {receivable.status === 'pending' && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
            <h3 className="mb-3 text-sm font-medium text-neutral-300">Cambiar estado</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStatusChange('paid')}
                disabled={!!updatingStatus}
                className="inline-flex items-center gap-2"
              >
                {updatingStatus === 'paid' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Marcar como cobrada
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('cancelled')}
                disabled={!!updatingStatus}
                className="inline-flex items-center gap-2 text-red-400 hover:border-red-500/50 hover:bg-red-500/10"
              >
                {updatingStatus === 'cancelled' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancelar cuenta
              </Button>
            </div>
          </div>
        )}

        {/* Modal historial de actividades (portal para centrar en pantalla) */}
        {showActivityLogModal && typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4"
              onClick={() => setShowActivityLogModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="my-auto w-full max-w-lg shrink-0 max-h-[90dvh] overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-neutral-700/60 p-4">
                  <h3 className="text-lg font-medium text-neutral-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary-400" />
                    Historial de actividades
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowActivityLogModal(false)}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="px-4 py-2 text-sm text-neutral-400 border-b border-neutral-700/60">
                  {receivable.customerName || 'Sin nombre'}
                  {receivable.receivableNumber != null && (
                    <span className="ml-2 text-neutral-500">· Cuenta #{receivable.receivableNumber}</span>
                  )}
                </p>
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingActivityLogs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-500">No hay actividades registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {activityLogs.map((log, idx) => (
                        <div
                          key={log.id}
                          className={cn(
                            'rounded-xl border p-3',
                            idx === 0 ? 'border-primary-500/30 bg-primary-500/5' : 'border-neutral-700/60 bg-neutral-800/30'
                          )}
                        >
                          <p className="text-sm font-medium text-neutral-100">{formatLogAction(log)}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {(log.userName || log.userEmail) && (
                              <span className="text-neutral-400">{log.userName || log.userEmail}</span>
                            )}
                            <span className="ml-1">
                              {new Date(log.createdAt).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </p>
                          {log.action === 'payment_added' && (log.details as Record<string, unknown>)?.notes != null && (
                            <p className="mt-1 text-xs text-neutral-400">Nota: {String((log.details as Record<string, unknown>).notes)}</p>
                          )}
                          {log.action === 'updated' && (log.details as Record<string, unknown>) && Object.keys(log.details as object).length > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-xs text-neutral-400">
                              {Object.entries(log.details as Record<string, unknown>)
                                .filter(([k]) => !['storeId'].includes(k))
                                .map(([k, v]) => (
                                  <p key={k}>
                                    <span className="text-neutral-500">{k}:</span> {String(v ?? '—')}
                                  </p>
                                ))}
                            </div>
                          )}
                          {log.action === 'reminder_sent' && (log.details as Record<string, unknown>)?.template != null && (
                            <p className="mt-1 text-xs text-neutral-400">Plantilla: {String((log.details as Record<string, unknown>).template)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
        )}

        {/* Modal: ¿Subir comprobante? (después de marcar como cobrada) */}
        <AnimatePresence>
          {showUploadAfterPaidModal && receivable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4"
              onClick={() => !uploadingAttachment && (setShowUploadAfterPaidModal(false), setUploadAfterPaidFile(null))}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="my-auto w-full max-w-md shrink-0 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
              >
                <h3 className="mb-2 text-lg font-medium text-neutral-100 flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-primary-400" />
                  ¿Subir comprobante?
                </h3>
                <p className="mb-4 text-sm text-neutral-400">
                  Puedes adjuntar una imagen o PDF como respaldo del pago.
                </p>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600">
                    <Upload className="h-4 w-4" />
                    <span>{uploadAfterPaidFile ? uploadAfterPaidFile.name : 'Seleccionar archivo'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setUploadAfterPaidFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!uploadAfterPaidFile || uploadingAttachment}
                      onClick={() => uploadAfterPaidFile && handleUploadAttachment(uploadAfterPaidFile)}
                      className="inline-flex items-center gap-2"
                    >
                      {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Subir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowUploadAfterPaidModal(false);
                        setUploadAfterPaidFile(null);
                      }}
                      disabled={uploadingAttachment}
                    >
                      Omitir
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal crear/editar recordatorio (portal para centrado en viewport) */}
        {typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {showReminderModal && receivable && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/60 p-4"
                  onClick={() => !savingReminder && (setShowReminderModal(false), setEditingReminder(null))}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="my-auto w-full max-w-lg shrink-0 max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl"
                  >
                <h3 className="mb-4 text-lg font-medium text-neutral-100 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary-400" />
                  {editingReminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
                </h3>
                <form onSubmit={handleSaveReminder} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">Nombre del cliente</label>
                      <input
                        type="text"
                        value={reminderForm.customerName}
                        onChange={(e) => setReminderForm((f) => ({ ...f, customerName: e.target.value }))}
                        disabled={reminderIsReadOnly || savingReminder}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        placeholder="Ej. María García"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">Nombre de la tienda</label>
                      <input
                        type="text"
                        value={reminderForm.storeName}
                        onChange={(e) => setReminderForm((f) => ({ ...f, storeName: e.target.value }))}
                        disabled={reminderIsReadOnly || savingReminder}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        placeholder="Ej. Tienda XYZ"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Factura (o número de cuenta si no hay)</label>
                    <input
                      type="text"
                      value={reminderForm.invoiceOrAccount}
                        onChange={(e) => setReminderForm((f) => ({ ...f, invoiceOrAccount: e.target.value }))}
                        disabled={reminderIsReadOnly || savingReminder}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      placeholder="Ej. F-001 o #1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Tipo de recordatorio</label>
                    {(() => {
                      const otrosAviso = reminders.filter((r) => r.tipoRecordatorio === 'aviso' && r.id !== editingReminder?.id).length;
                      const esMoraExistente = editingReminder?.tipoRecordatorio === 'mora';
                      const puedeSeleccionarMora = otrosAviso >= 1 || esMoraExistente;
                      return (
                        <>
                          <select
                            value={reminderForm.tipoRecordatorio}
                            onChange={(e) => {
                              const nuevoTipo = e.target.value as 'aviso' | 'mora';
                              if (nuevoTipo === 'mora') {
                                const avisos = reminders.filter((r) => r.tipoRecordatorio === 'aviso' && r.id !== editingReminder?.id);
                                let nuevaFecha = reminderForm.fechaEnvio;
                                if (avisos.length > 0) {
                                  const ultimaFechaAviso = avisos
                                    .map((a) => a.fechaEnvio)
                                    .filter(Boolean)
                                    .sort()
                                    .pop() as string | undefined;
                                  if (ultimaFechaAviso) {
                                    const m = ultimaFechaAviso.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                    if (m) {
                                      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
                                      d.setDate(d.getDate() + 1);
                                      nuevaFecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    }
                                  }
                                }
                                const store = storeId ? authState.stores.find((s) => s.id === storeId) : null;
                                const updates: Partial<typeof reminderForm> = { tipoRecordatorio: nuevoTipo, fechaEnvio: nuevaFecha };
                                if (!reminderForm.interestCadaDias && store?.interest_cada_dias != null) {
                                  updates.interestCadaDias = String(store.interest_cada_dias);
                                  updates.interestTipo = (store.interest_tipo === 'fijo' || store.interest_tipo === 'porcentaje') ? store.interest_tipo : '';
                                  updates.interestMonto = store.interest_monto != null ? String(store.interest_monto) : '';
                                }
                                setReminderForm((f) => ({ ...f, ...updates }));
                              } else {
                                setReminderForm((f) => ({ ...f, tipoRecordatorio: nuevoTipo }));
                              }
                            }}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          >
                            <option value="aviso">Solo para avisar</option>
                            <option value="mora" disabled={!puedeSeleccionarMora}>Por mora</option>
                          </select>
                          {!puedeSeleccionarMora && (
                            <p className="mt-1 text-[11px] text-amber-400">
                              Para crear o cambiar a &quot;Por mora&quot; debe existir al menos un recordatorio de tipo &quot;Solo para avisar&quot;.
                            </p>
                          )}
                          {reminderForm.tipoRecordatorio === 'aviso' && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              Recordatorio informativo antes del vencimiento.
                            </p>
                          )}
                          {reminderForm.tipoRecordatorio === 'mora' && puedeSeleccionarMora && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              Recordatorio de cobro por atraso (después del vencimiento).
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {reminderForm.tipoRecordatorio === 'mora' && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="mb-2 text-xs font-medium text-amber-400">Interés por mora (configuración del recordatorio)</p>
                      <p className="mb-3 text-[11px] text-neutral-500">
                        Por cada X días vencidos, sumar un monto. Prellenado desde la tienda; puedes editarlo.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-400">Cada cuántos días</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={reminderForm.interestCadaDias}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              setReminderForm((f) => ({ ...f, interestCadaDias: v }));
                            }}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            placeholder="Ej: 7"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-400">Tipo</label>
                          <select
                            value={reminderForm.interestTipo}
                            onChange={(e) => setReminderForm((f) => ({ ...f, interestTipo: e.target.value as '' | 'fijo' | 'porcentaje' }))}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          >
                            <option value="">—</option>
                            <option value="fijo">Monto fijo</option>
                            <option value="porcentaje">Porcentaje</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-neutral-400">Monto {reminderForm.interestTipo === 'porcentaje' ? '(%)' : ''}</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={reminderForm.interestMonto}
                            onChange={(e) => {
                              let v = e.target.value.replace(/[^\d.]/g, '');
                              const parts = v.split('.');
                              if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                              setReminderForm((f) => ({ ...f, interestMonto: v }));
                            }}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            placeholder={reminderForm.interestTipo === 'porcentaje' ? '5' : '10'}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">Fecha de vencimiento <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        value={reminderForm.fechaVencimiento}
                        onChange={(e) => setReminderForm((f) => ({ ...f, fechaVencimiento: e.target.value }))}
                        required
                        disabled={reminderIsReadOnly || savingReminder}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">Fecha de envío <span className="text-red-400">*</span></label>
                      <input
                        type="date"
                        value={reminderForm.fechaEnvio}
                        onChange={(e) => setReminderForm((f) => ({ ...f, fechaEnvio: e.target.value }))}
                        required
                        disabled={reminderIsReadOnly || savingReminder}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                  </div>
                  {(['pagomovil', 'transferencia', 'binance'] as const).map((type) => {
                    const key = type === 'pagomovil' ? 'datosPagomovil' : type === 'transferencia' ? 'datosTransferencia' : 'datosBinance';
                    const label = type === 'pagomovil' ? 'Datos PagoMóvil' : type === 'transferencia' ? 'Datos transferencia' : 'Datos Binance';
                    const placeholder = type === 'pagomovil' ? 'CI, teléfono, banco' : type === 'transferencia' ? 'Banco, cédula, cuenta' : 'Usuario, wallet';
                    const opts = paymentOptions[type];
                    const selectedOpt = opts.find((o) => o.data === reminderForm[key]);
                    return (
                      <div key={type}>
                        <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
                        {opts.length > 0 && (
                          <select
                            value={selectedOpt?.id ?? ''}
                            onChange={(e) => handleSelectPaymentOption(type, e.target.value)}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="mb-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          >
                            <option value="">Escribir nuevo...</option>
                            {opts.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label || o.data.slice(0, 50)}
                                {o.data.length > 50 ? '…' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                        {(opts.length === 0 || !selectedOpt) && (
                          <textarea
                            value={reminderForm[key]}
                            onChange={(e) => setReminderForm((f) => ({ ...f, [key]: e.target.value }))}
                            rows={2}
                            disabled={reminderIsReadOnly || savingReminder}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            placeholder={placeholder}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!editingReminder && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
                      <span>Repetir</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={reminderForm.repetirVeces === 0 ? '' : String(reminderForm.repetirVeces)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const num = digits === '' ? 0 : Math.min(999, parseInt(digits, 10) || 0);
                          setReminderForm((f) => ({ ...f, repetirVeces: num }));
                        }}
                        disabled={savingReminder}
                        className="w-16 rounded border border-neutral-700 bg-neutral-800/50 px-2 py-1 text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                        placeholder="0"
                      />
                      <span>veces cada</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={reminderForm.repetirCadaDias === 0 ? '' : String(reminderForm.repetirCadaDias)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const num = digits === '' ? 0 : Math.min(999, parseInt(digits, 10) || 0);
                          setReminderForm((f) => ({ ...f, repetirCadaDias: num }));
                        }}
                        disabled={savingReminder}
                        className="w-16 rounded border border-neutral-700 bg-neutral-800/50 px-2 py-1 text-xs text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/60"
                        placeholder="0"
                      />
                      <span>días</span>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-400">Teléfono de contacto</label>
                    <input
                      type="text"
                      inputMode="tel"
                      value={reminderForm.datosContacto}
                      onChange={(e) => setReminderForm((f) => ({ ...f, datosContacto: e.target.value }))}
                      onBlur={(e) => {
                        const formatted = formatContactPhone(e.target.value);
                        if (formatted && formatted !== e.target.value) {
                          setReminderForm((f) => ({ ...f, datosContacto: formatted }));
                        }
                      }}
                      disabled={reminderIsReadOnly || savingReminder}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      placeholder="Ej: +58 412 1234567 o 0412-1234567"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Número al que el cliente debe contactar. Se formatea con código de país y sin ceros a la izquierda.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {!reminderIsReadOnly && (
                      <Button type="submit" variant="primary" size="sm" disabled={savingReminder} className="inline-flex items-center gap-2">
                        {savingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {editingReminder ? 'Guardar cambios' : 'Crear recordatorio'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => (setShowReminderModal(false), setEditingReminder(null))}
                      disabled={savingReminder}
                    >
                      {reminderIsReadOnly ? 'Cerrar' : 'Cancelar'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

        {/* Reabrir cuenta (cualquier cuenta cobrada) */}
        {receivable.status === 'paid' && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
            <h3 className="mb-2 text-sm font-medium text-neutral-300">Reabrir cuenta</h3>
            <p className="mb-3 text-sm text-neutral-400">
              Si te equivocaste al registrar el monto abonado, puedes reabrir esta cuenta para que vuelva a estado pendiente y corregir o eliminar abonos. {fromPedido && 'Si la cuenta viene de un pedido, el pedido volverá a estado pendiente.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopen}
              disabled={reopening}
              className="inline-flex items-center gap-2 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10"
            >
              {reopening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reabrir cuenta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
