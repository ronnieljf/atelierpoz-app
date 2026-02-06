'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createReceivable, createReceivableFromRequest } from '@/lib/services/receivables';
import { getRequests, getRequestById, type Request } from '@/lib/services/requests';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Receipt, ArrowLeft, Loader2, FileText, ShoppingBag, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const REQUESTS_PAGE_SIZE = 15;

const REQUEST_STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  processing: { label: 'En proceso', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
}

export default function CreateReceivablePage() {
  const searchParams = useSearchParams();
  const fromRequest = searchParams.get('from') === 'request';
  const requestIdFromUrl = searchParams.get('requestId') ?? '';
  const storeIdFromUrl = searchParams.get('storeId') ?? '';
  const fromPedidosModule = !!(fromRequest && requestIdFromUrl && storeIdFromUrl);

  const router = useRouter();
  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<Request[]>([]);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [requestPage, setRequestPage] = useState(1);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [fromRequestCustomerName, setFromRequestCustomerName] = useState('');
  const [fromRequestCustomerPhone, setFromRequestCustomerPhone] = useState('');
  const [fromRequestDescription, setFromRequestDescription] = useState('');
  const [fromRequestAmount, setFromRequestAmount] = useState('');
  const [creatingFromRequest, setCreatingFromRequest] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [initialPaymentNotes, setInitialPaymentNotes] = useState('');

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

  useEffect(() => {
    if (authState.stores.length === 1 && !storeId) {
      setStoreId(authState.stores[0].id);
    }
  }, [authState.stores, storeId]);

  useEffect(() => {
    if (storeIdFromUrl && fromRequest) {
      setStoreId(storeIdFromUrl);
    }
  }, [storeIdFromUrl, fromRequest]);

  const loadRequestFromUrl = useCallback(async () => {
    if (!requestIdFromUrl || !storeIdFromUrl) return;
    setLoadingRequests(true);
    setMessage(null);
    try {
      const req = await getRequestById(requestIdFromUrl, storeIdFromUrl);
      if (req && (req.status === 'pending' || req.status === 'processing')) {
        setSelectedRequest(req);
        setFromRequestCustomerName(req.customerName ?? '');
        setFromRequestCustomerPhone(req.customerPhone ?? '');
        const shortId = req.id.slice(0, 8);
        setFromRequestDescription(req.customMessage?.trim() || `Pedido ${shortId}`);
        setFromRequestAmount(typeof req.total === 'number' ? String(req.total) : '');
      } else if (req) {
        setMessage({
          type: 'error',
          text: 'Este pedido no está pendiente ni en proceso. Solo se pueden crear cuentas por cobrar desde pedidos pendientes o en proceso.',
        });
        setSelectedRequest(null);
      } else {
        setMessage({ type: 'error', text: 'Pedido no encontrado' });
        setSelectedRequest(null);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar el pedido',
      });
      setSelectedRequest(null);
    } finally {
      setLoadingRequests(false);
    }
  }, [requestIdFromUrl, storeIdFromUrl]);

  useEffect(() => {
    if (fromPedidosModule) {
      setStoreId(storeIdFromUrl);
      loadRequestFromUrl();
    }
  }, [fromPedidosModule, storeIdFromUrl, loadRequestFromUrl]);

  const loadRequestsList = useCallback(async () => {
    if (!storeId) {
      setRequests([]);
      setRequestsTotal(0);
      return;
    }
    setLoadingRequests(true);
    setMessage(null);
    try {
      const offset = (requestPage - 1) * REQUESTS_PAGE_SIZE;
      const result = await getRequests(storeId, {
        status: 'pending,processing',
        limit: REQUESTS_PAGE_SIZE,
        offset,
      });
      setRequests(result.requests);
      setRequestsTotal(result.total ?? 0);
      setSelectedRequest(null);
      setFromRequestAmount('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar pedidos',
      });
      setRequests([]);
      setRequestsTotal(0);
    } finally {
      setLoadingRequests(false);
    }
  }, [storeId, requestPage]);

  useEffect(() => {
    if (fromRequest && storeId && !fromPedidosModule) loadRequestsList();
  }, [fromRequest, storeId, fromPedidosModule, loadRequestsList]);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setMessage({ type: 'error', text: 'Selecciona una tienda' });
      return;
    }
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setMessage({ type: 'error', text: 'El monto debe ser un número mayor o igual a 0' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const receivable = await createReceivable({
        storeId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        description: description.trim() || undefined,
        amount: amountNum,
        currency,
      });
      if (receivable) {
        setMessage({ type: 'success', text: 'Cuenta por cobrar creada correctamente' });
        setTimeout(() => {
          router.push(`/admin/receivables?storeId=${encodeURIComponent(storeId)}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'No se pudo crear la cuenta por cobrar' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear la cuenta por cobrar',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFromRequest = async () => {
    if (!storeId || !selectedRequest) {
      setMessage({ type: 'error', text: 'Selecciona una tienda y un pedido' });
      return;
    }
    const amountNum =
      fromRequestAmount.trim() !== ''
        ? parseFloat(fromRequestAmount)
        : (typeof selectedRequest.total === 'number' ? selectedRequest.total : parseFloat(String(selectedRequest.total)) || 0);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setMessage({ type: 'error', text: 'El monto total debe ser un número mayor o igual a 0' });
      return;
    }
    setCreatingFromRequest(true);
    setMessage(null);
    try {
      const initialPayment =
        initialPaymentAmount.trim() !== '' && parseFloat(initialPaymentAmount) > 0
          ? { amount: parseFloat(initialPaymentAmount), notes: initialPaymentNotes.trim() || undefined }
          : undefined;
      const receivable = await createReceivableFromRequest({
        storeId,
        requestId: selectedRequest.id,
        description: fromRequestDescription.trim() || undefined,
        customerName: fromRequestCustomerName.trim(),
        customerPhone: fromRequestCustomerPhone.trim(),
        amount: amountNum,
        initialPayment,
      });
      if (receivable) {
        setMessage({ type: 'success', text: 'Cuenta por cobrar creada desde el pedido correctamente' });
        setTimeout(() => {
          router.push(`/admin/receivables?storeId=${encodeURIComponent(storeId)}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'No se pudo crear la cuenta por cobrar' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear la cuenta por cobrar',
      });
    } finally {
      setCreatingFromRequest(false);
    }
  };

  if (authState.user && authState.stores.length === 0 && !message) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-neutral-400">Cargando tiendas...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/receivables"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">
            {fromPedidosModule
              ? 'Cuenta por cobrar desde pedido'
              : fromRequest
                ? 'Crear cuenta por cobrar desde pedido'
                : 'Nueva cuenta por cobrar (manual)'}
          </h1>
          <p className="text-sm text-neutral-400">
            {fromPedidosModule
              ? 'Origen: pedido. Los datos del pedido están precargados; revisa y confirma para crear la cuenta por cobrar.'
              : fromRequest
                ? 'Elige un pedido y genera una cuenta por cobrar con sus datos y total.'
                : 'Ingresa los datos del cliente y el monto a cobrar.'}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'mb-6 rounded-xl border p-4',
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      {fromRequest ? (
        <div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
            {fromPedidosModule ? (
              <div className="flex h-12 items-center rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 sm:h-auto sm:py-3">
                {authState.stores.find((s) => s.id === storeId)?.name ?? (storeId || '—')}
              </div>
            ) : (
              <select
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setRequests([]);
                  setRequestsTotal(0);
                  setRequestPage(1);
                  setSelectedRequest(null);
                }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
              >
                <option value="">Selecciona una tienda...</option>
                {authState.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {fromPedidosModule && loadingRequests && (
            <div className="flex justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}

          {fromPedidosModule && !loadingRequests && message?.type === 'error' && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              <p className="mb-3">{message.text}</p>
              <Link href="/admin/requests" className="text-sm font-medium underline hover:no-underline">
                Volver a pedidos
              </Link>
            </div>
          )}

          {storeId && !fromPedidosModule && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">Pedidos pendientes o en proceso</label>
                {loadingRequests ? (
                  <div className="flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="rounded-xl border border-neutral-700 bg-neutral-800/50 py-8 text-center text-sm text-neutral-400">
                    No hay pedidos pendientes o en proceso en esta tienda
                  </div>
                ) : (
                  <>
                    <div className="max-h-[480px] space-y-3 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800/30 p-3">
                      {requests.map((req) => {
                        const statusInfo = REQUEST_STATUS_LABELS[req.status] ?? { label: req.status, color: 'text-neutral-400', bgColor: 'bg-neutral-500/10' };
                        return (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => {
                              setSelectedRequest(req);
                              setFromRequestCustomerName(req.customerName ?? '');
                              setFromRequestCustomerPhone(req.customerPhone ?? '');
                              const shortId = req.id.slice(0, 8);
                              setFromRequestDescription(req.customMessage?.trim() || `Pedido ${shortId}`);
                              setFromRequestAmount(typeof req.total === 'number' ? String(req.total) : '');
                            }}
                            className={cn(
                              'w-full rounded-xl border p-5 text-left transition-all',
                              selectedRequest?.id === req.id
                                ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                                : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-neutral-100">
                                {req.customerName || 'Sin nombre'}
                                {req.customerPhone && (
                                  <span className="ml-2 text-sm font-normal text-neutral-500">
                                    {req.customerPhone}
                                  </span>
                                )}
                              </span>
                              <span className="text-sm font-medium text-neutral-200">
                                {req.currency} {(typeof req.total === 'number' ? req.total : parseFloat(String(req.total)) || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={cn(
                                'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium',
                                statusInfo.bgColor,
                                statusInfo.color
                              )}>
                                {statusInfo.label}
                              </span>
                              <span className="text-xs text-neutral-500">
                                {new Date(req.createdAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {' · '}
                                {Array.isArray(req.items) ? req.items.length : 0} productos
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {requestsTotal > REQUESTS_PAGE_SIZE && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-700 bg-neutral-800/30 px-3 py-2">
                        <p className="text-xs text-neutral-500 sm:text-sm">
                          Mostrando {(requestPage - 1) * REQUESTS_PAGE_SIZE + 1}–
                          {Math.min(requestPage * REQUESTS_PAGE_SIZE, requestsTotal)} de {requestsTotal}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                            disabled={requestPage <= 1}
                            className="h-9 w-9 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-neutral-400">
                            {requestPage} / {Math.max(1, Math.ceil(requestsTotal / REQUESTS_PAGE_SIZE))}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRequestPage((p) =>
                                Math.min(Math.ceil(requestsTotal / REQUESTS_PAGE_SIZE), p + 1)
                              )
                            }
                            disabled={requestPage >= Math.ceil(requestsTotal / REQUESTS_PAGE_SIZE)}
                            className="h-9 w-9 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {selectedRequest && (
                <div className="rounded-xl border border-primary-500/30 bg-primary-500/5 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-primary-300">Resumen del pedido seleccionado</p>
                    {(() => {
                      const statusInfo = REQUEST_STATUS_LABELS[selectedRequest.status] ?? { label: selectedRequest.status, color: 'text-neutral-400', bgColor: 'bg-neutral-500/10' };
                      return (
                        <span className={cn(
                          'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium',
                          statusInfo.bgColor,
                          statusInfo.color
                        )}>
                          {statusInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mb-3 text-xs text-neutral-400">
                    Total del pedido: {selectedRequest.currency}{' '}
                    {(typeof selectedRequest.total === 'number'
                      ? selectedRequest.total
                      : parseFloat(String(selectedRequest.total)) || 0
                    ).toFixed(2)}
                  </p>
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Nombre del cliente (editable)
                      </label>
                      <input
                        type="text"
                        value={fromRequestCustomerName}
                        onChange={(e) => setFromRequestCustomerName(e.target.value)}
                        placeholder="Ej: María García"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Teléfono (editable)
                      </label>
                      <input
                        type="text"
                        value={fromRequestCustomerPhone}
                        onChange={(e) => setFromRequestCustomerPhone(e.target.value)}
                        placeholder="Ej: +58 412 1234567"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                      Descripción (opcional). Si no la escribes, se usará el mensaje del pedido o un texto por defecto.
                    </label>
                    <textarea
                      value={fromRequestDescription}
                      onChange={(e) => setFromRequestDescription(e.target.value)}
                      placeholder="Ej: Pedido #123 - Entrega pendiente"
                      rows={2}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                      Monto total de la cuenta
                    </label>
                    <p className="mb-2 text-[11px] text-neutral-500">
                      Puedes modificarlo (descuento, ajuste, etc.) sin cambiar el pedido. Por defecto es el total del pedido.
                    </p>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fromRequestAmount}
                      onChange={(e) => setFromRequestAmount(e.target.value)}
                      placeholder={selectedRequest ? String(selectedRequest.total) : '0.00'}
                      className="w-full max-w-[200px] rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="mb-4 rounded-lg border border-neutral-700/80 bg-neutral-800/30 p-3">
                    <p className="mb-2 text-xs font-medium text-neutral-400">Abono inicial (opcional)</p>
                    <p className="mb-2 text-[11px] text-neutral-500">
                      Si el cliente paga algo al crear la cuenta, regístralo aquí. Si el abono es mayor o igual al total del pedido, la cuenta quedará como cobrada.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={initialPaymentAmount}
                          onChange={(e) => setInitialPaymentAmount(e.target.value)}
                          placeholder="Monto (0.00)"
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={initialPaymentNotes}
                          onChange={(e) => setInitialPaymentNotes(e.target.value)}
                          placeholder="Notas"
                          maxLength={300}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-2 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleCreateFromRequest}
                    disabled={creatingFromRequest}
                    className="w-full sm:w-auto"
                  >
                    {creatingFromRequest ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Crear cuenta por cobrar desde este pedido
                      </>
                    )}
                  </Button>
                </div>
              )}
        </div>
      ) : (
        <form onSubmit={handleSubmitManual} className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm sm:rounded-3xl sm:p-8">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda *</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
            >
              <option value="">Selecciona una tienda...</option>
              {authState.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre del cliente</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: María García"
                maxLength={255}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Teléfono</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej: +58 412 1234567"
                maxLength={50}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Venta de pulsera y collar - pendiente de pago"
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="VES">VES</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-700/80 bg-neutral-800/30 p-4">
            <p className="mb-3 text-sm font-medium text-neutral-300">Abono inicial (opcional)</p>
            <p className="mb-3 text-xs text-neutral-500">
              Si el cliente paga algo al momento de crear la cuenta, regístralo aquí. Si el abono es mayor o igual al total, la cuenta quedará como cobrada.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-400">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialPaymentAmount}
                  onChange={(e) => setInitialPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-400">Notas</label>
                <input
                  type="text"
                  value={initialPaymentNotes}
                  onChange={(e) => setInitialPaymentNotes(e.target.value)}
                  placeholder="Ej: Pago en efectivo"
                  maxLength={500}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-6">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Receipt className="mr-2 h-4 w-4" />
                  Crear cuenta por cobrar
                </>
              )}
            </Button>
            <Link href="/admin/receivables">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm text-neutral-500">
        {fromPedidosModule && (
          <Link href="/admin/requests" className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-200">
            Volver a pedidos
          </Link>
        )}
        {fromRequest ? (
          <Link href="/admin/receivables/create" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300">
            <FileText className="h-4 w-4" />
            Crear en cambio una cuenta manual
          </Link>
        ) : (
          <Link href="/admin/receivables/create?from=request" className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300">
            <ShoppingBag className="h-4 w-4" />
            Crear desde un pedido
          </Link>
        )}
      </div>
    </div>
  );
}
