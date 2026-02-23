/**
 * Servicios para el módulo de recordatorios (cuentas por cobrar).
 */

import { httpClient } from '@/lib/http/client';

export interface ReminderSettings {
  reminders_enabled: boolean;
  reminder_days_after_creation: number;
  reminder_days_after_last_payment: number;
  reminder_interval_days: number;
}

export interface ReminderNotification {
  id: string;
  store_id: string;
  store_name: string;
  receivable_id: string;
  receivable_number: number;
  customer_name: string | null;
  reminder_type: 'after_creation' | 'after_last_payment' | 'repeat';
  created_at: string;
}

export async function getReminderSettings(): Promise<ReminderSettings | null> {
  try {
    const response = await httpClient.get<{ success: boolean; settings: ReminderSettings }>('/api/reminders/settings');
    if (response.success && response.data?.settings) return response.data.settings;
    return null;
  } catch {
    return null;
  }
}

export async function updateReminderSettings(
  data: Partial<ReminderSettings>
): Promise<{ success: boolean; settings?: ReminderSettings; error?: string }> {
  try {
    const response = await httpClient.put<{ success: boolean; settings: ReminderSettings }>('/api/reminders/settings', data);
    if (response.success && response.data?.settings) return { success: true, settings: response.data.settings };
    return { success: false, error: 'Error al guardar' };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string };
    return { success: false, error: err?.response?.data?.error ?? err?.message ?? 'Error al guardar' };
  }
}

export async function getReminderNotifications(): Promise<ReminderNotification[]> {
  try {
    const response = await httpClient.get<{ success: boolean; notifications: ReminderNotification[] }>('/api/reminders/notifications');
    if (response.success && Array.isArray(response.data?.notifications)) return response.data!.notifications;
    return [];
  } catch {
    return [];
  }
}

export async function dismissReminderNotification(id: string): Promise<boolean> {
  try {
    const response = await httpClient.post<{ success: boolean }>(`/api/reminders/notifications/${id}/dismiss`, {});
    return response.success === true;
  } catch {
    return false;
  }
}
