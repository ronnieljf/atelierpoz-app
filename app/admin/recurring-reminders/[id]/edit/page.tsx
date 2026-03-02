'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getReminderById, updateReminder } from '@/lib/services/client-recurring-reminders';
import { getClientsByIds } from '@/lib/services/clients';
import { useAuth } from '@/lib/store/auth-store';
import { ClientRecipientSelector } from '@/components/admin/ClientRecipientSelector';
import { Button } from '@/components/ui/Button';
import { Bell, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function EditRecurringReminderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params?.id ?? '');
  const storeIdFromUrl = searchParams.get('storeId') ?? '';
  const { state: authState } = useAuth();
  const [storeId, setStoreId] = useState(storeIdFromUrl);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [nextDueAt, setNextDueAt] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [contact, setContact] = useState('');
  const [serviceStartedAtByClientId, setServiceStartedAtByClientId] = useState<Record<string, string>>({});
  const [recipientDetails, setRecipientDetails] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (storeIdFromUrl && authState.stores.some((s) => s.id === storeIdFromUrl)) {
      setStoreId(storeIdFromUrl);
    } else if (authState.stores.length === 1 && !storeId) {
      setStoreId(authState.stores[0].id);
    }
  }, [authState.stores, storeId, storeIdFromUrl]);

  const loadReminder = useCallback(async () => {
    if (!id || !storeId) return;
    setLoading(true);
    const r = await getReminderById(id, storeId);
    setLoading(false);
    if (r) {
      setAmount(String(r.amount));
      setCurrency(r.currency);
      if (r.nextDueAt) {
        const d = new Date(r.nextDueAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        setNextDueAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else setNextDueAt('');
      setDueDay(r.dueDay != null ? String(r.dueDay) : '');
      setContact(r.contact ?? '');
      setEnabled(r.enabled);
      setSelectedClientIds(new Set(r.recipients.map((rec) => rec.clientId)));
      const started: Record<string, string> = {};
      const details: Record<string, { name: string | null; phone: string | null }> = {};
      for (const rec of r.recipients) {
        if (rec.serviceStartedAt) {
          const d = rec.serviceStartedAt.slice(0, 10);
          if (d) started[rec.clientId] = d;
        }
        details[rec.clientId] = {
          name: rec.clientName?.trim() || null,
          phone: rec.clientPhone?.trim() || null,
        };
      }
      setServiceStartedAtByClientId(started);
      setRecipientDetails(details);
    } else {
      setMessage({ type: 'error', text: 'Recordatorio no encontrado' });
    }
  }, [id, storeId]);

  useEffect(() => {
    if (storeId) {
      loadReminder();
    } else setLoading(false);
  }, [storeId, loadReminder]);

  useEffect(() => {
    setServiceStartedAtByClientId((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) if (!selectedClientIds.has(key)) delete next[key];
      return next;
    });
  }, [selectedClientIds]);

  useEffect(() => {
    if (!storeId || selectedClientIds.size === 0) return;
    const missing = Array.from(selectedClientIds).filter((id) => !recipientDetails[id]);
    if (missing.length === 0) return;
    getClientsByIds(storeId, missing).then((clients) => {
      setRecipientDetails((prev) => {
        const next = { ...prev };
        for (const c of clients) {
          next[c.id] = { name: c.name?.trim() || null, phone: c.phone?.trim() || null };
        }
        return next;
      });
    });
  }, [storeId, selectedClientIds, recipientDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setMessage({ type: 'error', text: 'Selecciona una tienda' });
      return;
    }
    const clientIds = Array.from(selectedClientIds);
    if (clientIds.length === 0) {
      setMessage({ type: 'error', text: 'Debes agregar al menos un destinatario' });
      return;
    }
    const amt = parseFloat(amount.replace(',', '.'));
    if (isNaN(amt) || amt < 0) {
      setMessage({ type: 'error', text: 'Monto inválido' });
      return;
    }
    if (!nextDueAt?.trim()) {
      setMessage({ type: 'error', text: 'Indica la fecha y hora de envío del recordatorio' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await updateReminder(id, {
        storeId,
        clientIds,
        amount: amt,
        currency,
        nextDueAt: nextDueAt.trim(),
        dueDay: dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1)) : undefined,
        contact: contact.trim() || undefined,
        serviceStartedAtByClientId: Object.keys(serviceStartedAtByClientId).length > 0 ? serviceStartedAtByClientId : undefined,
        enabled,
      });
      if (updated) {
        setMessage({ type: 'success', text: 'Recordatorio actualizado' });
        setTimeout(() => {
          router.push(`/admin/recurring-reminders?storeId=${encodeURIComponent(storeId)}`);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/recurring-reminders?storeId=${storeId}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">Editar recordatorio</h1>
          <p className="text-sm text-neutral-400">Modifica la configuración y destinatarios</p>
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

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm sm:rounded-3xl sm:p-8"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
            disabled
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-400 focus:outline-none sm:h-auto sm:py-3"
          >
            {authState.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Destinatarios *</label>
          <p className="mb-3 text-xs text-neutral-500">
            Busca y selecciona los clientes que recibirán el mismo recordatorio. Puedes seleccionar por página, todos
            los resultados o todos los clientes de la tienda.
          </p>
          {storeId && (
            <ClientRecipientSelector
              storeId={storeId}
              selectedClientIds={selectedClientIds}
              onSelectionChange={setSelectedClientIds}
              disabled={submitting}
            />
          )}
        </div>

        {selectedClientIds.size > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Inicio del servicio por cliente</label>
            <p className="mb-3 text-xs text-neutral-500">
              Si un cliente inició a mitad de mes, indica la fecha para prorratear el monto. Opcional.
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800/50 p-3">
              <span className="text-sm text-neutral-400">Aplicar a todos:</span>
              <input
                type="date"
                onChange={(e) => {
                  const v = e.target.value;
                  setServiceStartedAtByClientId((prev) => {
                    const next = { ...prev };
                    for (const id of selectedClientIds) next[id] = v;
                    return next;
                  });
                }}
                className="h-9 rounded-lg border border-neutral-600 bg-neutral-800 px-2 text-sm text-neutral-100"
              />
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-800/50 p-3">
              {Array.from(selectedClientIds).map((clientId) => {
                const d = recipientDetails[clientId];
                return (
                  <div key={clientId} className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-700/50 bg-neutral-800/30 px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm text-neutral-400">
                      {d ? (
                        <>
                          <span className="block truncate font-medium text-neutral-200">{d.name || 'Sin nombre'}</span>
                          {d.phone && <span className="block truncate text-xs text-neutral-500">{d.phone}</span>}
                        </>
                      ) : (
                        `Cliente ${clientId.slice(0, 8)}…`
                      )}
                    </span>
                    <input
                      type="date"
                      value={serviceStartedAtByClientId[clientId] ?? ''}
                      onChange={(e) =>
                        setServiceStartedAtByClientId((prev) => ({
                          ...prev,
                          [clientId]: e.target.value,
                        }))
                      }
                      className="h-9 rounded-lg border border-neutral-600 bg-neutral-800 px-2 text-sm text-neutral-100"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Monto *</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
              placeholder="50.00"
              required
              className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
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

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Día de vencimiento</label>
          <input
            type="number"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="Ej: 15 (vence el día 15 de cada mes)"
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
          <p className="mt-1 text-xs text-neutral-500">Día del mes en que vence el pago (1-31). Opcional.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Fecha y hora de envío *</label>
          <input
            type="datetime-local"
            value={nextDueAt}
            onChange={(e) => setNextDueAt(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Contacto (teléfono o email)</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Ej: +58 412 1234567 o cobranza@empresa.com"
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Teléfono o email donde el cliente puede responder. Se usará en el mensaje del recordatorio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="enabled" className="text-sm text-neutral-300">
            Activo (enviar recordatorios)
          </label>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-6">
          <Button type="submit" variant="primary" disabled={submitting || selectedClientIds.size === 0}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
          <Link href={`/admin/recurring-reminders?storeId=${storeId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
