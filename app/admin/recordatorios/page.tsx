'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Settings, Loader2, Check, Send } from 'lucide-react';
import {
  getReminderSettings,
  updateReminderSettings,
  runRemindersNow,
  type ReminderSettings,
} from '@/lib/services/reminders';
import { cn } from '@/lib/utils/cn';

/** Clase para inputs numéricos sin flechas de subir/bajar */
const inputNumberClass =
  'w-full rounded-xl border border-neutral-700 bg-neutral-800/80 px-4 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 input-number-no-spinner';

export default function RecordatoriosPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({
    enabled: false,
    sendEmail: false,
    sendPhone: false,
    dayOfMonth: 1,
    minDaysAge: 30,
  });

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const data = await getReminderSettings();
    setLoadingSettings(false);
    if (data) {
      setSettings(data);
      setForm({
        enabled: data.reminders_enabled,
        dayOfMonth: data.reminder_days_after_creation || 1,
        sendEmail: (data.reminder_days_after_last_payment ?? 0) > 0,
        sendPhone: (data.reminder_interval_days ?? 0) > 0,
        minDaysAge: data.reminder_min_days_age ?? 30,
      });
    } else {
      setForm({
        enabled: false,
        sendEmail: false,
        sendPhone: false,
        dayOfMonth: 1,
        minDaysAge: 30,
      });
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const result = await updateReminderSettings({
      reminders_enabled: form.enabled,
      // Usamos reminder_days_after_creation como día del mes (1-31)
      reminder_days_after_creation: form.dayOfMonth,
      // Usamos reminder_days_after_last_payment e interval_days como flags 0/1 para canal
      reminder_days_after_last_payment: form.sendEmail ? 1 : 0,
      reminder_interval_days: form.sendPhone ? 1 : 0,
      reminder_min_days_age: form.minDaysAge,
    });
    setSaving(false);
    if (result.success && result.settings) {
      setSettings(result.settings);
      setForm({
        enabled: result.settings.reminders_enabled,
        dayOfMonth: result.settings.reminder_days_after_creation || 1,
        sendEmail: (result.settings.reminder_days_after_last_payment ?? 0) > 0,
        sendPhone: (result.settings.reminder_interval_days ?? 0) > 0,
        minDaysAge: result.settings.reminder_min_days_age ?? 30,
      });
      setMessage({ type: 'success', text: 'Configuración guardada' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Error al guardar' });
    }
  };

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
          Recordatorios automáticos
        </h2>
        <p className="text-sm text-neutral-500 mb-5">
          Activa un resumen automático de tus cuentas por cobrar vencidas. Te enviaremos un reporte una vez al mes.
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
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-200">Activar recordatorios automáticos</span>
            </label>

            <div
              className={cn(
                'space-y-4 pt-1 transition-opacity',
                !form.enabled && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Día del mes para enviar el reporte
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isNaN(n)) {
                      setForm((f) => ({ ...f, dayOfMonth: 1 }));
                      return;
                    }
                    setForm((f) => ({ ...f, dayOfMonth: Math.max(1, Math.min(31, n)) }));
                  }}
                  className={inputNumberClass}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Ejemplo: si pones <strong>5</strong>, el <strong>5 de cada mes</strong> enviaremos un reporte con
                  cuentas por cobrar con más de X días de creadas (según config. de abajo).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30">
                <label className="block text-sm font-medium text-neutral-200 mb-1">
                  Incluir solo cuentas con más de X días de creadas
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.minDaysAge}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isNaN(n)) {
                      setForm((f) => ({ ...f, minDaysAge: 30 }));
                      return;
                    }
                    setForm((f) => ({ ...f, minDaysAge: Math.max(1, Math.min(365, n)) }));
                  }}
                  className={inputNumberClass}
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Ejemplo: si pones <strong>15</strong>, solo se reportarán las cuentas por cobrar que tengan más de 15
                  días de creadas.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-neutral-700/60 bg-neutral-800/30 space-y-3">
                <p className="block text-sm font-medium text-neutral-200">
                  ¿Cómo quieres recibir el reporte?
                </p>
                <label className="flex items-center gap-3 text-sm text-neutral-200">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))}
                    className="rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span>Enviar por correo electrónico</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-neutral-200">
                  <input
                    type="checkbox"
                    checked={form.sendPhone}
                    onChange={(e) => setForm((f) => ({ ...f, sendPhone: e.target.checked }))}
                    className="rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span>Enviar por WhatsApp (teléfono de la tienda)</span>
                </label>
                <p className="text-xs text-neutral-500">
                  Puedes elegir una o ambas opciones. Si no marcas ninguna, no se enviará el reporte aunque los
                  recordatorios estén activos.
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

      {/* Ejecución manual */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-1">
              <Send className="h-4 w-4 text-neutral-400" />
              Ejecutar reporte ahora
            </h2>
            <p className="text-sm text-neutral-500">
              Envía inmediatamente el reporte de cuentas por cobrar según la configuración de arriba, sin esperar al
              próximo día programado.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              disabled={runningNow || !form.enabled || (!form.sendEmail && !form.sendPhone)}
              onClick={async () => {
                setMessage(null);
                setRunningNow(true);
                const result = await runRemindersNow();
                setRunningNow(false);
                if (result.success && result.result) {
                  const { whatsappSent, emailSent, remindersCreated } = result.result;
                  if (whatsappSent === 0 && emailSent === 0) {
                    setMessage({
                      type: 'error',
                      text:
                        remindersCreated === 0
                          ? 'No hay cuentas que cumplan las condiciones para enviar recordatorios en este momento.'
                          : 'No se pudo enviar el reporte por WhatsApp o correo.',
                    });
                  } else {
                    setMessage({
                      type: 'success',
                      text: `Reporte enviado. WhatsApp: ${whatsappSent}, correos: ${emailSent}.`,
                    });
                  }
                } else {
                  setMessage({
                    type: 'error',
                    text: result.error ?? 'Error al ejecutar el envío de recordatorios.',
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {runningNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ejecutar ahora
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
