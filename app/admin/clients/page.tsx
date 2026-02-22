'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getClients, deleteClient } from '@/lib/services/clients';
import type { Client } from '@/types/client';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { UserCircle, Plus, Loader2, Edit, Trash2, ChevronLeft, ChevronRight, Search, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const storeIdFromUrl = searchParams.get('storeId') ?? '';
  const { state: authState } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeIdFromUrl);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (storeIdFromUrl && authState.stores.some((s) => s.id === storeIdFromUrl)) {
      setSelectedStoreId(storeIdFromUrl);
    } else if (authState.stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId, storeIdFromUrl]);

  const loadClients = useCallback(async () => {
    if (!selectedStoreId) {
      setLoading(false);
      setClients([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const result = await getClients(selectedStoreId, {
        limit: PAGE_SIZE,
        offset,
        search: search.trim() || undefined,
      });
      setClients(result.clients);
      setTotal(result.total);
      setHasLoadedOnce(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar clientes',
      });
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, page, search]);

  useEffect(() => {
    if (selectedStoreId) loadClients();
    else {
      setClients([]);
      setTotal(0);
      setLoading(false);
      setHasLoadedOnce(false);
    }
  }, [selectedStoreId, loadClients]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, maxPage)));
  };

  const handleDelete = async (client: Client) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    if (!selectedStoreId) return;
    setDeletingId(client.id);
    setMessage(null);
    try {
      const ok = await deleteClient(client.id, selectedStoreId);
      if (ok) {
        setMessage({ type: 'success', text: 'Cliente eliminado' });
        loadClients();
      } else {
        setMessage({ type: 'error', text: 'No se pudo eliminar el cliente' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al eliminar',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenWhatsApp = (phone: string) => {
    if (!phone?.trim()) return;
    // Limpiar el número de teléfono de caracteres especiales
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const initialLoad = loading && selectedStoreId && !hasLoadedOnce;
  if (initialLoad) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-neutral-400">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
            Clientes
          </h1>
          {selectedStoreId && (
            <p className="text-sm text-neutral-400">
              {total} {total === 1 ? 'cliente' : 'clientes'}
              {total > 0 && (
                <span className="text-neutral-500">
                  {' '}· pág. {page} de {maxPage}
                </span>
              )}
            </p>
          )}
        </div>
        <Link href="/admin/clients/create" className="w-full sm:w-auto">
          <Button variant="primary" className="h-11 w-full justify-center sm:h-auto sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo cliente
          </Button>
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
        {authState.stores.length === 0 ? (
          <div className="text-sm text-neutral-400">No tienes acceso a ninguna tienda</div>
        ) : (
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setClients([]);
              setTotal(0);
              setPage(1);
              setSearchInput('');
              setSearch('');
              setHasLoadedOnce(false);
            }}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
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

      {selectedStoreId && (
        <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre, cédula, teléfono o email…"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 py-3 pl-10 pr-3 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:py-2.5 sm:pl-9 sm:text-sm"
            />
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
          <UserCircle className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Selecciona una tienda
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            Elige una tienda para ver su cartera de clientes
          </p>
        </div>
      ) : !loading && total === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <UserCircle className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            {search.trim() ? 'No hay resultados' : 'Aún no hay clientes'}
          </h3>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">
            {search.trim()
              ? 'Prueba otro criterio de búsqueda.'
              : 'Los clientes se irán agregando al crear pedidos con teléfono, o puedes crear uno manualmente.'}
          </p>
          {!search.trim() && (
            <Link href="/admin/clients/create">
              <Button variant="primary" className="h-11 min-w-[180px] gap-2 px-5">
                <Plus className="h-4 w-4" />
                Nuevo cliente
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-neutral-950/30 sm:rounded-3xl pointer-events-none">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-neutral-700 bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Cédula</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-300 sm:px-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {clients.map((client) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <span className="text-sm font-medium text-neutral-100">
                        {client.name?.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 text-sm text-neutral-400">
                      {client.identityDocument?.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      {client.phone?.trim() ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-400">{client.phone}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(client.phone!)}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-500/10"
                            title="Abrir chat de WhatsApp"
                            aria-label="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-6 text-sm text-neutral-400">
                      {client.email?.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/clients/${client.id}/edit?storeId=${selectedStoreId}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client)}
                          disabled={deletingId === client.id}
                          className="text-red-400 hover:text-red-300 hover:border-red-500/50 text-xs"
                        >
                          {deletingId === client.id ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex flex-col gap-4 border-t border-neutral-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="order-2 text-center text-sm text-neutral-400 sm:order-1 sm:text-left">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
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
                  disabled={page >= maxPage}
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
    </div>
  );
}
