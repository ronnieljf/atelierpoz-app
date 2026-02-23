'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Settings, Loader2, Receipt, Check, X } from 'lucide-react';
import {
  getReminderSettings,
  updateReminderSettings,
  getReminderNotifications,
  dismissReminderNotification,
  type ReminderSettings,
  type ReminderNotification,
} from '@/lib/services/reminders';
import { cn } from '@/lib/utils/cn';

function reminderTypeLabel(type: string): string {
  if (type === 'after_creation') return 'Recordatorio por creación';
  if (type === 'after_last_payment') return 'Recordatorio por último abono';
  if (type === 'repeat') return 'Recordatorio periódico';
  return type;
}

export default function RecordatoriosPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    reminders_enabled: false,
    reminder_days_after_creation: 30,
    reminder_days_after_last_payment: 15,
    reminder_interval_days: 7,
  });
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const data = await getReminderSettings();
    setLoadingSettings(false);
    if (data) {
      setSettings(data);
      setForm({
        reminders_enabled: data.reminders_enabled,
        reminder_days_after_creation: data.reminder_days_after_creation,
        reminder_days_after_last_payment: data.reminder_days_after_last_payment,
        reminder_interval_days: data.reminder_interval_days ?? 7,
      });
    } else {
      setForm((f) => ({ ...f, reminders_enabled: false, reminder_days_after_creation: 30, reminder_days_after_last_payment: 15, reminder_interval_days: 7 }));
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    const list = await getReminderNotifications();
    setLoadingNotifications(false);
    setNotifications(list);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const result = await updateReminderSettings({
      reminders_enabled: form.reminders_enabled,
      reminder_days_after_creation: form.reminder_days_after_creation,
      reminder_days_after_last_payment: form.reminder_days_after_last_payment,
      reminder_interval_days: form.reminder_interval_days,
    });
    setSaving(false);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setForm({
        reminders_enabled: result.settings.reminders_enabled,
        reminder_days_after_creation: result.settings.reminder_days_after_creation,
        reminder_days_after_last_payment: result.settings.reminder_days_after_last_payment,
        reminder_interval_days: result.settings.reminder_interval_days ?? 7,
      });
      setMessage({ type: 'success', text: 'Configuración guardada' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Error al guardar' });
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissingId(id);
    const ok = await dismissReminderNotification(id);
    setDismissingId(null);
    if (ok) setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const remindersOn = settings?.reminders_enabled ?? form.reminders_enabled;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl mb-2 flex items-center gap-2">
        <Bell className="h-7 w-7 text-primary-400" />
        Recordatorios
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Avisos de cuentas por cobrar: por días desde la creación o desde el último abono.
      </p>

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

      {/* Configuración */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 mb-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-4">
          <Settings className="h-4 w-4 text-neutral-400" />
          Configuración
        </h2>
        {loadingSettings ? (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reminders_enabled}
                onChange={(e) => setForm((f) => ({ ...f, reminders_enabled: e.target.checked }))}
                className="rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-300">Activar recordatorios de cuentas por cobrar</span>
            </label>
            <p className="text-xs text-neutral-500">
              Si está activo, recibirás avisos en esta página según los plazos que configures.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Días después de crear la cuenta
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.reminder_days_after_creation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_days_after_creation: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 30)) }))
                  }
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-neutral-500 mt-1">Recordarme X días después de haber creado la cuenta por cobrar.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Días después del último abono
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.reminder_days_after_last_payment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_days_after_last_payment: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 15)) }))
                  }
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-neutral-500 mt-1">Si no ha pagado en X días, o si abonó y ya pasaron X días.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  Repetir recordatorio cada
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.reminder_interval_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_interval_days: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 7)) }))
                  }
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="text-xs text-neutral-500 mt-1">Cada cuántos días volver a recordarte sobre la misma cuenta si sigue pendiente.</p>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar configuración
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Notificaciones */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-4">
          <Receipt className="h-4 w-4 text-neutral-400" />
          Avisos pendientes
        </h2>
        {!remindersOn && (
          <p className="text-sm text-neutral-500 py-4">
            Activa los recordatorios arriba para recibir avisos de cuentas por cobrar.
          </p>
        )}
        {remindersOn && loadingNotifications && (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        )}
        {remindersOn && !loadingNotifications && notifications.length === 0 && (
          <p className="text-sm text-neutral-500 py-4">No tienes avisos pendientes.</p>
        )}
        {remindersOn && !loadingNotifications && notifications.length > 0 && (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-700/80 bg-neutral-800/40 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-500">{n.store_name}</p>
                  <p className="font-medium text-neutral-100">
                    {n.customer_name || 'Sin nombre'} · #{n.receivable_number}
                  </p>
                  <p className="text-xs text-primary-400/90 mt-0.5">{reminderTypeLabel(n.reminder_type)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/receivables/${n.receivable_id}?storeId=${encodeURIComponent(n.store_id)}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-500/20 px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-500/30"
                  >
                    Ver cuenta
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDismiss(n.id)}
                    disabled={dismissingId === n.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-600 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-700/60 disabled:opacity-50"
                    aria-label="Descartar"
                  >
                    {dismissingId === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
