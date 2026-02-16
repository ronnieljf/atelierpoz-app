'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { getRequests, updateRequestStatus, type Request } from '@/lib/services/requests';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Package, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2, Eye, PlayCircle, Receipt, MessageCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { openWhatsAppForRequest } from '@/lib/utils/whatsapp';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';

const DEFAULT_PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  processing: {
    label: 'En proceso',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  completed: {
    label: 'Completado',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export default function RequestsPage() {
  const { state: authState, loadStores } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
    const t = setTimeout(() => {
      setCustomerSearchDebounced(customerSearch);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const loadRequests = useCallback(async () => {
    if (!selectedStoreId) {
      setLoading(false);
      setRequests([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const offset = (page - 1) * pageSize;
      const result = await getRequests(selectedStoreId, {
        limit: pageSize,
        offset,
        status: statusFilter || undefined,
        search: customerSearchDebounced || undefined,
      });
      setRequests(result.requests);
      setTotal(result.total);
      setHasLoadedOnce(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar pedidos',
      });
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, page, pageSize, statusFilter, customerSearchDebounced]);

  useEffect(() => {
    if (selectedStoreId) loadRequests();
    else {
      setRequests([]);
      setTotal(0);
      setLoading(false);
      setHasLoadedOnce(false);
    }
  }, [selectedStoreId, loadRequests]);

  const goToPage = (p: number) => {
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    setPage(Math.max(1, Math.min(p, maxPage)));
  };

  const storeName = authState.stores.find((s) => s.id === selectedStoreId)?.name ?? '';

  const handleOpenWhatsApp = (request: Request) => {
    if (!request.customerPhone?.trim()) return;
    openWhatsAppForRequest(request, storeName, 'es');
  };

  const handleStatusChange = async (requestId: string, newStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'No hay tienda seleccionada' });
      return;
    }

    let confirmMessage = '';
    if (newStatus === 'completed') {
      confirmMessage = '¿Estás seguro de que quieres completar este pedido? Esto actualizará el stock de los productos.';
    } else if (newStatus === 'cancelled') {
      confirmMessage = '¿Estás seguro de que quieres cancelar este pedido?';
    } else if (newStatus === 'processing') {
      confirmMessage = '¿Estás seguro de que quieres marcar este pedido como en proceso?';
    }
    
    if (confirmMessage && !confirm(confirmMessage)) return;

    setUpdatingStatus(requestId);
    setMessage(null);

    try {
      const updated = await updateRequestStatus(requestId, selectedStoreId, newStatus);
      if (updated) {
        let successMessage = '';
        if (newStatus === 'completed') {
          successMessage = 'Pedido completado exitosamente';
        } else if (newStatus === 'cancelled') {
          successMessage = 'Pedido cancelado exitosamente';
        } else if (newStatus === 'processing') {
          successMessage = 'Pedido marcado como en proceso';
        }
        setMessage({
          type: 'success',
          text: successMessage,
        });
        await loadRequests();
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(updated);
        }
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar el pedido' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar el pedido',
      });
    } finally {
      setUpdatingStatus(null);
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
              Pedidos
            </h1>
            <Tooltip content="Lista de todos los pedidos recibidos desde tu tienda. Puedes procesarlos, completarlos o cancelarlos." />
          </div>
          {selectedStoreId && (
            <p className="text-sm text-neutral-400">
              {total} {total === 1 ? 'pedido' : 'pedidos'}
              {total > 0 && (
                <span className="text-neutral-500">
                  {' '}· pág. {page} de {Math.max(1, Math.ceil(total / pageSize))}
                </span>
              )}
            </p>
          )}
        </div>
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
              setRequests([]);
              setTotal(0);
              setPage(1);
              setStatusFilter('');
              setHasLoadedOnce(false);
              setSelectedRequest(null);
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Cliente o número</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Nombre, teléfono o número de pedido"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-400">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-2.5 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="processing">En proceso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
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
            Elige una tienda arriba para ver sus pedidos
          </p>
        </div>
      ) : !loading && total === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Package className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            No hay pedidos
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            {statusFilter || customerSearchDebounced
              ? 'No hay pedidos con este filtro'
              : 'Aún no se han realizado pedidos para esta tienda'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/50 pointer-events-none">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}

          {/* Cards: misma vista en móvil y desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {requests.map((request) => {
              const statusInfo = STATUS_LABELS[request.status] || STATUS_LABELS.pending;
              const itemsCount = Array.isArray(request.items) ? request.items.length : 0;
              
              return (
                <motion.article
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-800/40"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {request.orderNumber != null && (
                          <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">
                            Pedido #{request.orderNumber}
                          </p>
                        )}
                        <h3 className="text-[15px] font-medium text-neutral-100">
                          {request.customerName || 'Sin nombre'}
                        </h3>
                        {request.customerPhone && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-neutral-500">{request.customerPhone}</p>
                            {(request.status === 'pending' || request.status === 'processing') && (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(request)}
                                className="flex items-center justify-center p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border whitespace-nowrap',
                          statusInfo.bgColor,
                          statusInfo.color,
                          statusInfo.borderColor
                        )}>
                          {statusInfo.label}
                        </span>
                        {request.hasReceivable && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border bg-purple-500/10 text-purple-400 border-purple-500/30 whitespace-nowrap">
                            <Receipt className="h-3 w-3" />
                            Cuenta generada
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">
                        {itemsCount} {itemsCount === 1 ? 'producto' : 'productos'}
                      </span>
                      <span className="font-semibold text-neutral-100">
                        {request.currency} {(typeof request.total === 'number' ? request.total : parseFloat(String(request.total)) || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-500">
                        {new Date(request.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:text-primary-400 hover:bg-neutral-700/50 rounded-lg"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Botones de acción organizados en bloques claros */}
                  <div className="flex flex-col border-t border-neutral-700/60">
                    {request.status === 'pending' && (
                      <>
                        {/* Bloque 1: Acciones principales */}
                        <div className="flex flex-col gap-0 border-b border-neutral-700/60">
                          {!request.hasReceivable && (
                            <Link
                              href={`/admin/receivables/create?from=request&requestId=${encodeURIComponent(request.id)}&storeId=${encodeURIComponent(selectedStoreId)}`}
                              className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-primary-400 transition-colors hover:bg-primary-500/10 active:bg-primary-500/15 border-b border-neutral-700/60"
                              title="Crear una cuenta por cobrar basada en este pedido"
                            >
                              <Receipt className="h-4 w-4" />
                              <span>Generar cuenta por cobrar</span>
                              <Tooltip content="Crea un registro de pago pendiente para este pedido" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'processing')}
                            disabled={updatingStatus === request.id}
                            title="Marcar pedido como en proceso de preparación"
                            className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/10 active:bg-blue-500/15 disabled:opacity-50"
                          >
                            {updatingStatus === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                            <span>Marcar en proceso</span>
                            <Tooltip content="Indica que estás preparando este pedido" />
                          </button>
                        </div>
                        
                        {/* Bloque 2: Finalización */}
                        <div className="grid grid-cols-2 gap-0">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'completed')}
                            disabled={updatingStatus === request.id}
                            title="Marcar pedido como completado y actualizar stock"
                            className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/10 active:bg-green-500/15 disabled:opacity-50 border-r border-neutral-700/60"
                          >
                            {updatingStatus === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            <span>Completado</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'cancelled')}
                            disabled={updatingStatus === request.id}
                            title="Cancelar este pedido"
                            className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-50"
                          >
                            {updatingStatus === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </>
                    )}
                    
                    {request.status === 'processing' && (
                      <div className="grid grid-cols-2 gap-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(request.id, 'completed')}
                          disabled={updatingStatus === request.id}
                          title="Marcar pedido como completado y actualizar stock"
                          className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/10 active:bg-green-500/15 disabled:opacity-50 border-r border-neutral-700/60"
                        >
                          {updatingStatus === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span>Completado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(request.id, 'cancelled')}
                          disabled={updatingStatus === request.id}
                          title="Cancelar este pedido"
                          className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-50"
                        >
                          {updatingStatus === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span>Cancelar</span>
                        </button>
                      </div>
                    )}

                    {request.status === 'cancelled' && (
                      <div className="border-t border-neutral-700/60 p-2">
                        <p className="text-xs text-neutral-500 text-center mb-2">Cambiar estado del pedido</p>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'pending')}
                            disabled={updatingStatus === request.id}
                            title="Volver a pendiente"
                            className="flex items-center justify-center gap-1 py-3 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:opacity-50 rounded-lg"
                          >
                            {updatingStatus === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            <span>Pendiente</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'processing')}
                            disabled={updatingStatus === request.id}
                            title="Marcar en proceso"
                            className="flex items-center justify-center gap-1 py-3 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-50 rounded-lg"
                          >
                            {updatingStatus === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                            <span>En proceso</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(request.id, 'completed')}
                            disabled={updatingStatus === request.id}
                            title="Completar pedido"
                            className="flex items-center justify-center gap-1 py-3 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10 disabled:opacity-50 rounded-lg"
                          >
                            {updatingStatus === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            <span>Completado</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="order-2 text-center text-sm text-neutral-400 sm:order-1 sm:text-left">
                {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total}
              </p>
              <div className="order-1 grid grid-cols-2 gap-3 sm:order-2 sm:flex sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                  className="h-11 justify-center gap-1.5 sm:h-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => goToPage(page + 1)}
                  className="h-11 justify-center gap-1.5 sm:h-auto"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalle del pedido (portal para correcta visualización en mobile) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedRequest && (
              <div
                className="fixed inset-0 z-[90] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-neutral-950/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                style={{ minHeight: '100dvh' }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
                  onClick={() => setSelectedRequest(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.25 }}
                  className="relative z-10 my-auto w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-neutral-700/50 bg-neutral-900 p-6 sm:p-8 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
              <div className="flex items-center justify-between mb-6">
                <div>
                  {selectedRequest.orderNumber != null && (
                    <p className="text-sm font-medium uppercase tracking-wider text-primary-400 mb-1">
                      Pedido #{selectedRequest.orderNumber}
                    </p>
                  )}
                  <h2 className="text-xl sm:text-2xl font-medium text-neutral-100">
                    Detalle del Pedido
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Información del cliente */}
                <div className="rounded-2xl border border-neutral-700/50 bg-neutral-800/30 p-4 sm:p-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 mb-4">
                    Cliente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Nombre</p>
                      <p className="text-sm font-medium text-neutral-100">
                        {selectedRequest.customerName || 'No especificado'}
                      </p>
                    </div>
                    {selectedRequest.customerPhone && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Teléfono</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-100">
                            {selectedRequest.customerPhone}
                          </p>
                          {(selectedRequest.status === 'pending' || selectedRequest.status === 'processing') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWhatsApp(selectedRequest)}
                              className="shrink-0 inline-flex items-center gap-1.5 text-green-500 hover:text-green-400 hover:border-green-500/50 text-xs"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Abrir WhatsApp
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedRequest.customerEmail && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-neutral-100">
                          {selectedRequest.customerEmail}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos */}
                <div className="rounded-2xl border border-neutral-700/50 bg-neutral-800/30 p-4 sm:p-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 mb-4">
                    Productos ({Array.isArray(selectedRequest.items) ? selectedRequest.items.length : 0})
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(selectedRequest.items) && selectedRequest.items.length > 0 ? (
                      selectedRequest.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex gap-4 rounded-xl border border-neutral-700/30 bg-neutral-900/50 p-4"
                        >
                          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized={item.productImage.startsWith('data:')}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Package className="h-8 w-8 text-neutral-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-neutral-100 mb-1">
                              {item.productName}
                            </h4>
                            {item.selectedVariants && item.selectedVariants.length > 0 && (
                              <div className="mb-2 space-y-0.5">
                                {item.selectedVariants.map((variant, vIndex) => (
                                  <p key={vIndex} className="text-xs text-neutral-500">
                                    <span className="text-neutral-400">{variant.attributeName}:</span>{' '}
                                    {variant.variantValue}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-neutral-500">
                                Código: {item.productSku}
                              </p>
                              <div className="text-right">
                                <p className="text-sm font-medium text-neutral-100">
                                  {item.quantity} x ${((item.totalPrice || 0) / (item.quantity || 1)).toFixed(2)} = ${(item.totalPrice || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No hay productos en este pedido</p>
                    )}
                  </div>
                </div>

                {/* Mensaje personalizado */}
                {selectedRequest.customMessage && (
                  <div className="rounded-2xl border border-neutral-700/50 bg-neutral-800/30 p-4 sm:p-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 mb-2">
                      Mensaje Personalizado
                    </h3>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                      {selectedRequest.customMessage}
                    </p>
                  </div>
                )}

                {/* Resumen */}
                <div className="rounded-2xl border border-neutral-700/50 bg-neutral-800/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
                      Resumen
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                      <span className={cn(
                        'inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border',
                        STATUS_LABELS[selectedRequest.status].bgColor,
                        STATUS_LABELS[selectedRequest.status].color,
                        STATUS_LABELS[selectedRequest.status].borderColor
                      )}>
                        {STATUS_LABELS[selectedRequest.status].label}
                      </span>
                      {selectedRequest.hasReceivable && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-purple-500/10 text-purple-400 border-purple-500/30">
                          <Receipt className="h-3.5 w-3.5" />
                          Cuenta por cobrar generada
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-neutral-400">
                      <span>Subtotal</span>
                      <span>{selectedRequest.currency} {(typeof selectedRequest.total === 'number' ? selectedRequest.total : parseFloat(String(selectedRequest.total)) || 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-neutral-700/50 pt-2 mt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-medium text-neutral-100">Total</span>
                        <span className="text-xl font-semibold text-primary-400">
                          {selectedRequest.currency} {(typeof selectedRequest.total === 'number' ? selectedRequest.total : parseFloat(String(selectedRequest.total)) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 text-xs text-neutral-500">
                      Fecha: {new Date(selectedRequest.createdAt).toLocaleString('es-ES')}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                {selectedRequest.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!selectedRequest.hasReceivable && (
                      <Link
                        href={`/admin/receivables/create?from=request&requestId=${encodeURIComponent(selectedRequest.id)}&storeId=${encodeURIComponent(selectedStoreId)}`}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Crear Cuenta por Cobrar
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, 'processing');
                      }}
                      disabled={updatingStatus === selectedRequest.id}
                      className="flex-1"
                    >
                      {updatingStatus === selectedRequest.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Procesar Pedido
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'processing') && (
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, 'completed');
                      }}
                      disabled={updatingStatus === selectedRequest.id}
                      className="flex-1"
                    >
                      {updatingStatus === selectedRequest.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completar Pedido
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, 'cancelled');
                      }}
                      disabled={updatingStatus === selectedRequest.id}
                      className="flex-1"
                    >
                      {updatingStatus === selectedRequest.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar Pedido
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {selectedRequest.status === 'cancelled' && (
                  <div className="rounded-2xl border border-neutral-700/50 bg-neutral-800/30 p-4 sm:p-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-500 mb-3">
                      Cambiar estado del pedido
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4">
                      Este pedido está cancelado. Puedes volver a activarlo eligiendo un nuevo estado.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedRequest.id, 'pending')}
                        disabled={updatingStatus === selectedRequest.id}
                        className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                      >
                        {updatingStatus === selectedRequest.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Volver a pendiente
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedRequest.id, 'processing')}
                        disabled={updatingStatus === selectedRequest.id}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      >
                        {updatingStatus === selectedRequest.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4 mr-2" />
                        )}
                        Marcar en proceso
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedRequest.id, 'completed')}
                        disabled={updatingStatus === selectedRequest.id}
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        {updatingStatus === selectedRequest.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Completar pedido
                      </Button>
                    </div>
                  </div>
                )}
              </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
