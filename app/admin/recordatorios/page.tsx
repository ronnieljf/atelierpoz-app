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

/** Clase para inputs numéricos sin flechas de subir/bajar */
const inputNumberClass = 'w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 input-number-no-spinner';

function reminderTypeLabel(type: string): string {
  if (type === 'after_creation') return 'Primer aviso: nueva cuenta';
  if (type === 'after_last_payment') return 'Seguimiento: después de un abono';
  if (type === 'repeat') return 'Recordatorio repetido';
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
        Recordatorios de cobro
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Te avisamos cuando una cuenta por cobrar necesita seguimiento. Así no tienes que recordar tú cuándo cobrar.
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
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-2">
          <Settings className="h-4 w-4 text-neutral-400" />
          ¿Cuándo quieres que te avisemos?
        </h2>
        <p className="text-sm text-neutral-500 mb-5">
          Configura los plazos. Te aparecerán avisos aquí cuando una cuenta necesite que la revises.
        </p>
        {loadingSettings ? (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
              <input
                type="checkbox"
                checked={form.reminders_enabled}
                onChange={(e) => setForm((f) => ({ ...f, reminders_enabled: e.target.checked }))}
                className="rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-200">Activar recordatorios</span>
            </label>

            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Avisarme X días después de crear una cuenta
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.reminder_days_after_creation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_days_after_creation: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 30)) }))
                  }
                  className={inputNumberClass}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Ejemplo: si pones <strong>7</strong>, te avisamos 7 días después de registrar que te deben.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Avisarme X días después del último abono
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.reminder_days_after_last_payment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_days_after_last_payment: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 15)) }))
                  }
                  className={inputNumberClass}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Ejemplo: si pones <strong>3</strong>, te avisamos 3 días después de que tu cliente haga un abono (para hacer seguimiento del resto).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Si sigue pendiente, repetir el aviso cada X días
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.reminder_interval_days}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reminder_interval_days: Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 7)) }))
                  }
                  className={inputNumberClass}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Ejemplo: si pones <strong>7</strong>, te volveremos a avisar cada 7 días hasta que cobres o descartes.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Notificaciones */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-2">
          <Receipt className="h-4 w-4 text-neutral-400" />
          Tus avisos
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Cuentas por cobrar que necesitan tu atención.
        </p>
        {!remindersOn && (
          <p className="text-sm text-neutral-500 py-4 rounded-xl bg-neutral-800/40 p-4 border border-neutral-700/50">
            Activa los recordatorios arriba para que aparezcan aquí las cuentas que debes revisar.
          </p>
        )}
        {remindersOn && loadingNotifications && (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        )}
        {remindersOn && !loadingNotifications && notifications.length === 0 && (
          <p className="text-sm text-neutral-500 py-6 rounded-xl bg-neutral-800/30 border border-dashed border-neutral-700/50 text-center">
            Todo al día. No hay cuentas que requieran seguimiento por ahora.
          </p>
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
