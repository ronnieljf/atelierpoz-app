'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getReceivableById, updateReceivable, getReceivablePayments, createReceivablePayment } from '@/lib/services/receivables';
import { getRequestById, type Request } from '@/lib/services/requests';
import type { Receivable, ReceivableStatus, ReceivablePayment } from '@/types/receivable';
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
} from 'lucide-react';
import { openWhatsAppForReceivable } from '@/lib/utils/whatsapp';
import { motion, AnimatePresence } from 'framer-motion';
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

  const { state: authState, loadStores } = useAuth();
  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ReceivableStatus | null>(null);

  const [requestDetails, setRequestDetails] = useState<Request | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);

  const [payments, setPayments] = useState<ReceivablePayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  const storeId = storeIdFromQuery || (authState.stores.length === 1 ? authState.stores[0].id : '');

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

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
      });
      if (result) {
        setPayments(result.payments);
        setTotalPaid(result.totalPaid);
        setReceivable(result.receivable);
        setPaymentAmount('');
        setPaymentNotes('');
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
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href={storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables'}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a cuentas por cobrar
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-neutral-600" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl">No encontrada</h3>
          <p className="mb-6 text-sm text-neutral-400">
            La cuenta por cobrar no existe o no tienes acceso.
          </p>
          <Link href={storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables'}>
            <Button variant="outline" size="sm">
              Volver a la lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[receivable.status];
  const fromPedido = !!receivable.requestId;
  const listHref = storeId ? `/admin/receivables?storeId=${encodeURIComponent(storeId)}` : '/admin/receivables';

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
                          openWhatsAppForReceivable({ ...receivable, payments, totalPaid, orderItems });
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
                  Cambiar productos
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
                      : `${receivable.currency} ${Math.max(0, Number(receivable.amount) - totalPaid).toFixed(2)}`}
                  </p>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {payments.map((p) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {receivable.status === 'pending' && (
                <form onSubmit={handleAddPayment} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
      </div>
    </div>
  );
}
