'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClients } from '@/lib/services/clients';
import { Search, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const PAGE_SIZE = 100;
const DEBOUNCE_MS = 300;

type Client = { id: string; name: string | null; phone: string | null; email: string | null };

interface ClientRecipientSelectorProps {
  storeId: string;
  selectedClientIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ClientRecipientSelector({
  storeId,
  selectedClientIds,
  onSelectionChange,
  disabled = false,
  placeholder = 'Buscar por nombre, teléfono o email...',
}: ClientRecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingSelectAll, setLoadingSelectAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(0);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const loadPage = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await getClients(storeId, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setClients(result.clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })));
      setTotal(result.total);
    } catch {
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, debouncedSearch]);

  useEffect(() => {
    if (storeId) loadPage();
    else {
      setClients([]);
      setTotal(0);
    }
  }, [storeId, loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrevPage = page > 0;
  const hasNextPage = page < totalPages - 1;

  const toggleClient = (clientId: string) => {
    if (disabled) return;
    onSelectionChange(
      (() => {
        const next = new Set(selectedClientIds);
        if (next.has(clientId)) next.delete(clientId);
        else next.add(clientId);
        return next;
      })()
    );
  };

  const selectAllOnPage = () => {
    if (disabled) return;
    const next = new Set(selectedClientIds);
    clients.forEach((c) => next.add(c.id));
    onSelectionChange(next);
  };

  const deselectAllOnPage = () => {
    if (disabled) return;
    const idsToRemove = new Set(clients.map((c) => c.id));
    const next = new Set(selectedClientIds);
    idsToRemove.forEach((id) => next.delete(id));
    onSelectionChange(next);
  };

  const deselectAll = () => {
    if (disabled) return;
    onSelectionChange(new Set());
  };

  const selectAllMatching = async () => {
    if (disabled) return;
    setLoadingSelectAll(true);
    try {
      const allIds: string[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await getClients(storeId, {
          limit: 1000,
          offset,
          search: debouncedSearch || undefined,
        });
        result.clients.forEach((c) => allIds.push(c.id));
        offset += result.clients.length;
        hasMore = result.clients.length === 1000 && offset < result.total;
      }
      const next = new Set(selectedClientIds);
      allIds.forEach((id) => next.add(id));
      onSelectionChange(next);
    } catch {
      // fallback: select only visible page
      selectAllOnPage();
    } finally {
      setLoadingSelectAll(false);
    }
  };

  const someOnPageSelected = clients.some((c) => selectedClientIds.has(c.id));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-10 pr-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">
          {total.toLocaleString()} {total === 1 ? 'cliente' : 'clientes'}
          {debouncedSearch && ` coinciden`}
        </span>
        <div className="h-px flex-1 min-w-0" />
        <button
          type="button"
          onClick={selectAllOnPage}
          disabled={disabled || clients.length === 0}
          className="text-xs font-medium text-primary-400 hover:text-primary-300 disabled:opacity-50"
        >
          Seleccionar página
        </button>
        <button
          type="button"
          onClick={deselectAllOnPage}
          disabled={disabled || !someOnPageSelected}
          className="text-xs font-medium text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        >
          Quitar página
        </button>
        <button
          type="button"
          onClick={selectAllMatching}
          disabled={disabled || loadingSelectAll || total === 0}
          className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 disabled:opacity-50"
        >
          {loadingSelectAll ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Cargando...
            </>
          ) : (
            <>Seleccionar todos ({total.toLocaleString()})</>
          )}
        </button>
        <button
          type="button"
          onClick={deselectAll}
          disabled={disabled || selectedClientIds.size === 0}
          className="text-xs font-medium text-red-400/80 hover:text-red-400 disabled:opacity-50"
        >
          Quitar todos
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            {debouncedSearch ? 'No hay clientes que coincidan con la búsqueda' : 'No hay clientes en esta tienda'}
          </div>
        ) : (
          <div className="divide-y divide-neutral-700/80">
            {clients.map((c) => {
              const isSelected = selectedClientIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-neutral-700/50',
                    isSelected && 'bg-primary-500/10',
                    disabled && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClient(c.id)}
                    disabled={disabled}
                    className="h-4 w-4 flex-shrink-0 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="min-w-0 flex-1 text-sm text-neutral-200">
                    <span className="block truncate font-medium">{c.name?.trim() || 'Sin nombre'}</span>
                    {c.phone && <span className="block truncate text-xs text-neutral-500">{c.phone}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={disabled || !hasPrevPage}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700/50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-neutral-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={disabled || !hasNextPage}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700/50 disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedClientIds.size > 0 && (
        <p className="text-sm text-neutral-400">
          {selectedClientIds.size.toLocaleString()} {selectedClientIds.size === 1 ? 'persona seleccionada' : 'personas seleccionadas'}
        </p>
      )}
    </div>
  );
}
