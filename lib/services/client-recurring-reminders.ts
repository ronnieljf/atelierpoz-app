/**
 * Servicio de recordatorios de pagos recurrentes por cliente.
 * Un recordatorio puede tener muchos destinatarios.
 */

import { httpClient } from '@/lib/http/client';

export interface Recipient {
  clientId: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  serviceStartedAt: string | null;
}

export interface ClientRecurringReminder {
  id: string;
  storeId: string;
  amount: number;
  currency: string;
  nextDueAt: string;
  dueDay: number | null;
  contactChannel: 'phone' | 'email';
  contact: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  storeName?: string | null;
  recipients: Recipient[];
  recipientCount: number;
}

export interface CreateReminderData {
  storeId: string;
  clientIds: string[];
  amount: number;
  currency?: string;
  nextDueAt: string;
  dueDay?: number;
  contact?: string;
  serviceStartedAtByClientId?: Record<string, string>;
  enabled?: boolean;
}

export interface UpdateReminderData {
  storeId: string;
  clientIds?: string[];
  amount?: number;
  currency?: string;
  nextDueAt?: string;
  dueDay?: number;
  contact?: string;
  serviceStartedAtByClientId?: Record<string, string>;
  enabled?: boolean;
}

function formatReminder(r: Record<string, unknown>): ClientRecurringReminder {
  const recipients = (r.recipients ?? []) as Record<string, unknown>[];
  return {
    id: String(r.id ?? ''),
    storeId: String(r.storeId ?? r.store_id ?? ''),
    amount: parseFloat(String(r.amount ?? 0)),
    currency: String(r.currency ?? 'USD'),
    nextDueAt: String(r.nextDueAt ?? r.next_due_at ?? ''),
    dueDay: r.dueDay != null ? Number(r.dueDay ?? r.due_day) : null,
    contactChannel: (r.contactChannel ?? r.contact_channel ?? 'phone') as 'phone' | 'email',
    contact: (r.contact ?? null) as string | null,
    enabled: Boolean(r.enabled ?? true),
    createdAt: String(r.createdAt ?? r.created_at ?? ''),
    updatedAt: String(r.updatedAt ?? r.updated_at ?? ''),
    storeName: (r.storeName ?? r.store_name ?? null) as string | null,
    recipients: recipients.map((rec) => ({
      clientId: String(rec.clientId ?? rec.client_id ?? ''),
      clientName: (rec.clientName ?? rec.client_name ?? null) as string | null,
      clientPhone: (rec.clientPhone ?? rec.client_phone ?? null) as string | null,
      clientEmail: (rec.clientEmail ?? rec.client_email ?? null) as string | null,
      serviceStartedAt: (rec.serviceStartedAt ?? rec.service_started_at ?? null) as string | null,
    })),
    recipientCount: Number(r.recipientCount ?? recipients.length),
  };
}

export async function getReminders(
  storeId: string,
  params?: { limit?: number; offset?: number }
): Promise<{ reminders: ClientRecurringReminder[]; total: number }> {
  const sp = new URLSearchParams();
  sp.set('storeId', storeId);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));

  const response = await httpClient.get<{ success: boolean; reminders: Record<string, unknown>[]; total: number }>(
    `/api/client-recurring-reminders?${sp.toString()}`
  );
  if (response.success && response.data) {
    const reminders = (response.data.reminders ?? []).map(formatReminder);
    return { reminders, total: response.data.total ?? 0 };
  }
  return { reminders: [], total: 0 };
}

export async function getReminderById(id: string, storeId: string): Promise<ClientRecurringReminder | null> {
  const response = await httpClient.get<{ success: boolean; reminder?: Record<string, unknown> }>(
    `/api/client-recurring-reminders/${id}?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && response.data?.reminder) {
    return formatReminder(response.data.reminder);
  }
  return null;
}

export async function createReminder(data: CreateReminderData): Promise<ClientRecurringReminder> {
  const response = await httpClient.post<{ success: boolean; reminder?: Record<string, unknown> }>(
    '/api/client-recurring-reminders',
    {
      storeId: data.storeId,
      clientIds: data.clientIds,
      amount: data.amount,
      currency: data.currency ?? 'USD',
      nextDueAt: data.nextDueAt,
      dueDay: data.dueDay,
      contact: data.contact ?? undefined,
      serviceStartedAtByClientId: data.serviceStartedAtByClientId,
      enabled: data.enabled ?? true,
    }
  );
  if (!response.success || !response.data?.reminder) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear recordatorio');
  }
  return formatReminder(response.data.reminder);
}

export async function updateReminder(id: string, data: UpdateReminderData): Promise<ClientRecurringReminder | null> {
  const response = await httpClient.put<{ success: boolean; reminder?: Record<string, unknown> }>(
    `/api/client-recurring-reminders/${id}`,
    {
      storeId: data.storeId,
      clientIds: data.clientIds,
      amount: data.amount,
      currency: data.currency,
      nextDueAt: data.nextDueAt,
      dueDay: data.dueDay,
      contact: data.contact,
      serviceStartedAtByClientId: data.serviceStartedAtByClientId,
      enabled: data.enabled,
    }
  );
  if (response.success && response.data?.reminder) {
    return formatReminder(response.data.reminder);
  }
  return null;
}

export async function deleteReminder(id: string, storeId: string): Promise<boolean> {
  const response = await httpClient.delete<{ success: boolean }>(
    `/api/client-recurring-reminders/${id}?storeId=${encodeURIComponent(storeId)}`
  );
  return response.success ?? false;
}
