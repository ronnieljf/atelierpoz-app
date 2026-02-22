/**
 * Servicio de cuentas por cobrar (receivables)
 */

import { httpClient } from '@/lib/http/client';
import type {
  Receivable,
  CreateReceivableData,
  CreateReceivableFromRequestData,
  UpdateReceivableData,
  ReceivablePayment,
  CreateReceivablePaymentData,
} from '@/types/receivable';

/** Respuesta de la API puede venir en snake_case */
type ApiReceivable = Record<string, unknown> & {
  id?: string;
  store_id?: string;
  storeId?: string;
  receivable_number?: number;
  receivableNumber?: number;
  created_by?: string;
  createdBy?: string;
  updated_by?: string;
  updatedBy?: string;
  created_by_name?: string;
  createdByName?: string;
  updated_by_name?: string;
  updatedByName?: string;
  customer_name?: unknown;
  customerName?: unknown;
  customer_phone?: unknown;
  customerPhone?: unknown;
  description?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  request_id?: unknown;
  requestId?: unknown;
  paid_at?: unknown;
  paidAt?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
  store_name?: unknown;
  storeName?: unknown;
  items_count?: unknown;
  itemsCount?: unknown;
  order_number?: unknown;
  orderNumber?: unknown;
  total_paid?: unknown;
  totalPaid?: unknown;
};

function toStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function formatReceivable(r: ApiReceivable): Receivable {
  return {
    id: toStr(r.id),
    storeId: toStr(r.storeId ?? r.store_id),
    receivableNumber: typeof r.receivableNumber === 'number' ? r.receivableNumber : (typeof r.receivable_number === 'number' ? r.receivable_number : undefined),
    createdBy: toStr(r.createdBy ?? r.created_by),
    updatedBy: toStringOrNull(r.updatedBy ?? r.updated_by) ?? undefined,
    createdByName: toStringOrNull(r.createdByName ?? r.created_by_name) ?? undefined,
    updatedByName: toStringOrNull(r.updatedByName ?? r.updated_by_name) ?? undefined,
    customerName: toStringOrNull(r.customerName ?? r.customer_name),
    customerPhone: toStringOrNull(r.customerPhone ?? r.customer_phone),
    description: toStringOrNull(r.description),
    amount: typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount ?? 0)),
    currency: typeof r.currency === 'string' ? r.currency : 'USD',
    status: (r.status as Receivable['status']) ?? 'pending',
    requestId: toStringOrNull(r.requestId ?? r.request_id),
    paidAt: toStringOrNull(r.paidAt ?? r.paid_at),
    createdAt: toStr(r.createdAt ?? r.created_at),
    updatedAt: toStr(r.updatedAt ?? r.updated_at),
    storeName: typeof r.storeName === 'string' ? r.storeName : (typeof r.store_name === 'string' ? r.store_name : undefined),
    itemsCount:
      typeof r.itemsCount === 'number'
        ? r.itemsCount
        : typeof r.items_count === 'number'
          ? r.items_count
          : undefined,
    orderNumber:
      typeof r.orderNumber === 'number'
        ? r.orderNumber
        : typeof r.order_number === 'number'
          ? r.order_number
          : undefined,
    totalPaid:
      typeof r.totalPaid === 'number'
        ? r.totalPaid
        : typeof r.total_paid === 'number'
          ? r.total_paid
          : typeof r.total_paid === 'string'
            ? parseFloat(r.total_paid)
            : undefined,
  };
}

/**
 * Listar cuentas por cobrar de una tienda
 * @param options.search - filtra por nombre o número de cliente / número de cuenta
 */
export async function getReceivables(
  storeId: string,
  options?: { status?: string; limit?: number; offset?: number; dateFrom?: string; dateTo?: string; search?: string }
): Promise<{ receivables: Receivable[]; total: number; totalAmountByCurrency: Record<string, number> }> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options?.dateTo) params.set('dateTo', options.dateTo);
  if (options?.search?.trim()) params.set('search', options.search.trim());

  const response = await httpClient.get<{
    success: boolean;
    receivables: ApiReceivable[];
    total: number;
    totalAmountByCurrency?: Record<string, number>;
  }>(`/api/receivables?${params.toString()}`);

  if (response.success && response.data) {
    const receivables = (response.data.receivables || []).map(formatReceivable);
    return {
      receivables,
      total: response.data.total ?? 0,
      totalAmountByCurrency: response.data.totalAmountByCurrency ?? {},
    };
  }
  return { receivables: [], total: 0, totalAmountByCurrency: {} };
}

/**
 * Obtener el total pendiente por cobrar de la tienda (solo cuentas pendientes, restando abonos).
 */
export async function getPendingTotal(
  storeId: string
): Promise<{ byCurrency: Record<string, number> }> {
  const response = await httpClient.get<{ success: boolean; byCurrency: Record<string, number> }>(
    `/api/receivables/pending-total?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && response.data?.byCurrency) {
    return { byCurrency: response.data.byCurrency };
  }
  return { byCurrency: {} };
}

/**
 * Obtener una cuenta por cobrar por ID
 */
export async function getReceivableById(receivableId: string, storeId: string): Promise<Receivable | null> {
  const response = await httpClient.get<{ success: boolean; receivable: Receivable }>(
    `/api/receivables/${receivableId}?storeId=${encodeURIComponent(storeId)}`
  );

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  return null;
}

/**
 * Crear cuenta por cobrar manual
 */
export async function createReceivable(data: CreateReceivableData): Promise<Receivable | null> {
  const response = await httpClient.post<{ success: boolean; receivable: Receivable }>('/api/receivables', {
    storeId: data.storeId,
    customerName: data.customerName ?? undefined,
    customerPhone: data.customerPhone ?? undefined,
    description: data.description ?? undefined,
    amount: data.amount,
    currency: data.currency ?? 'USD',
  });

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  return null;
}

/**
 * Crear cuenta por cobrar a partir de un pedido
 */
export async function createReceivableFromRequest(
  data: CreateReceivableFromRequestData
): Promise<Receivable | null> {
  const response = await httpClient.post<{ success: boolean; receivable: Receivable }>(
    '/api/receivables/from-request',
    {
      storeId: data.storeId,
      requestId: data.requestId,
      description: data.description ?? undefined,
      customerName: data.customerName ?? undefined,
      customerPhone: data.customerPhone ?? undefined,
      amount: data.amount != null && !Number.isNaN(data.amount) ? data.amount : undefined,
      initialPayment:
        data.initialPayment != null && data.initialPayment.amount > 0
          ? { amount: data.initialPayment.amount, notes: data.initialPayment.notes }
          : undefined,
    }
  );

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  return null;
}

/**
 * Actualizar cuenta por cobrar (editar o marcar como cobrada/cancelada)
 */
export async function updateReceivable(
  receivableId: string,
  data: UpdateReceivableData
): Promise<Receivable | null> {
  const response = await httpClient.put<{ success: boolean; receivable: Receivable }>(
    `/api/receivables/${receivableId}`,
    {
      storeId: data.storeId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
    }
  );

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  return null;
}

/**
 * Reabrir una cuenta por cobrar cobrada (volver a pendiente). Solo cuentas manuales.
 * Permite corregir abonos si se equivocaron al registrar el monto.
 */
export async function reopenReceivable(receivableId: string, storeId: string): Promise<Receivable | null> {
  const response = await httpClient.post<{ success: boolean; receivable: Receivable }>(
    `/api/receivables/${receivableId}/reopen`,
    { storeId }
  );

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  return null;
}

/**
 * Cambiar los productos de una cuenta por cobrar creada desde un pedido.
 * Restaura stock de los productos viejos y descuenta el de los nuevos. Actualiza el monto de la cuenta.
 */
export async function updateReceivableItems(
  receivableId: string,
  storeId: string,
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    basePrice?: number;
    totalPrice: number;
    selectedVariants?: Array<{
      attributeId: string;
      attributeName?: string;
      variantId: string;
      variantName?: string;
      variantValue?: string;
      priceModifier?: number;
    }>;
  }>,
  total: number
): Promise<{ receivable: Receivable; request: { id: string; items: unknown[]; total: number } } | null> {
  const response = await httpClient.put<{
    success: boolean;
    receivable: ApiReceivable;
    request: { id: string; items: unknown[]; total: number };
  }>(`/api/receivables/${receivableId}/items`, {
    storeId,
    items,
    total,
  });

  if (response.success && response.data?.receivable && response.data?.request) {
    return {
      receivable: formatReceivable(response.data.receivable as ApiReceivable),
      request: response.data.request,
    };
  }
  return null;
}

/** Respuesta de la API para abonos (puede venir en snake_case) */
type ApiPayment = Record<string, unknown> & {
  id?: string;
  receivable_id?: string;
  receivableId?: string;
  amount?: unknown;
  currency?: string;
  notes?: string | null;
  created_at?: string;
  createdAt?: string;
  created_by?: string | null;
  createdBy?: string | null;
};

function formatPayment(p: ApiPayment): ReceivablePayment {
  return {
    id: String(p.id ?? ''),
    receivableId: String(p.receivableId ?? p.receivable_id ?? ''),
    amount: typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount ?? 0)),
    currency: typeof p.currency === 'string' ? p.currency : 'USD',
    notes: typeof p.notes === 'string' ? p.notes : (p.notes == null ? null : String(p.notes)),
    createdAt: String(p.createdAt ?? p.created_at ?? ''),
    createdBy: p.createdBy ?? p.created_by ?? null,
  };
}

/**
 * Obtener abonos de una cuenta por cobrar (incluye receivable, payments y totalPaid)
 */
export async function getReceivablePayments(
  receivableId: string,
  storeId: string
): Promise<{ receivable: Receivable; payments: ReceivablePayment[]; totalPaid: number } | null> {
  const response = await httpClient.get<{
    success: boolean;
    receivable: ApiReceivable;
    payments: ApiPayment[];
    totalPaid: number;
  }>(`/api/receivables/${receivableId}/payments?storeId=${encodeURIComponent(storeId)}`);

  if (response.success && response.data) {
    return {
      receivable: formatReceivable(response.data.receivable as ApiReceivable),
      payments: (response.data.payments || []).map(formatPayment),
      totalPaid: typeof response.data.totalPaid === 'number' ? response.data.totalPaid : parseFloat(String(response.data.totalPaid ?? 0)),
    };
  }
  return null;
}

/**
 * Registrar un abono en una cuenta por cobrar
 */
export async function createReceivablePayment(
  receivableId: string,
  data: CreateReceivablePaymentData
): Promise<{ receivable: Receivable; payments: ReceivablePayment[]; totalPaid: number } | null> {
  const response = await httpClient.post<{
      success: boolean;
      receivable: ApiReceivable;
      payments: ApiPayment[];
      totalPaid: number;
    }>(`/api/receivables/${receivableId}/payments`, {
    storeId: data.storeId,
    amount: data.amount,
    currency: data.currency ?? undefined,
    notes: data.notes ?? undefined,
  });

  if (response.success && response.data) {
    return {
      receivable: formatReceivable(response.data.receivable as ApiReceivable),
      payments: (response.data.payments || []).map(formatPayment),
      totalPaid: typeof response.data.totalPaid === 'number' ? response.data.totalPaid : parseFloat(String(response.data.totalPaid ?? 0)),
    };
  }
  return null;
}

/**
 * Eliminar un abono de una cuenta por cobrar. Solo cuentas manuales.
 */
export async function deleteReceivablePayment(
  receivableId: string,
  paymentId: string,
  storeId: string
): Promise<{ receivable: Receivable; payments: ReceivablePayment[]; totalPaid: number } | null> {
  const response = await httpClient.delete<{
    success: boolean;
    receivable: ApiReceivable;
    payments: ApiPayment[];
    totalPaid: number;
  }>(`/api/receivables/${receivableId}/payments/${paymentId}?storeId=${encodeURIComponent(storeId)}`);

  if (response.success && response.data) {
    return {
      receivable: formatReceivable(response.data.receivable as ApiReceivable),
      payments: (response.data.payments || []).map(formatPayment),
      totalPaid: typeof response.data.totalPaid === 'number' ? response.data.totalPaid : parseFloat(String(response.data.totalPaid ?? 0)),
    };
  }
  return null;
}

/**
 * Verificar si una tienda tiene activa la funcionalidad de enviar recordatorios
 * de cuentas por cobrar por WhatsApp.
 */
export async function hasReceivablesWhatsAppReminderFeature(
  storeIdentifier: string
): Promise<boolean> {
  const response = await httpClient.get<{
    success: boolean;
    enabled: boolean;
  }>(
    `/api/stores/public/${encodeURIComponent(
      storeIdentifier
    )}/feature-send-reminder-receivables-whatsapp`
  );

  if (response.success && response.data) {
    return Boolean(response.data.enabled);
  }
  return false;
}

/**
 * Enviar recordatorios por WhatsApp vía API usando el template cuenta_por_cobrar.
 * Requiere que la tienda tenga feature_send_reminder_receivables_whatsapp activo.
 */
export async function sendReceivableReminders(
  storeId: string,
  recipients: Array<{ phone: string; receivableIds: string[] }>
): Promise<{ sent: number; failed: number; failedDetails?: Array<{ index: number; phone: string; error: string }> }> {
  const response = await httpClient.post<{
    success: boolean;
    sent: number;
    failed: number;
    failedDetails?: Array<{ index: number; phone: string; error: string }>;
  }>('/api/receivables/send-reminders', {
    storeId,
    recipients,
  });

  if (response.success && response.data) {
    return {
      sent: response.data.sent ?? 0,
      failed: response.data.failed ?? 0,
      failedDetails: response.data.failedDetails,
    };
  }
  throw new Error((response as { error?: string }).error ?? 'Error al enviar recordatorios');
}

/**
 * Actualizar el estado de varias cuentas por cobrar en lote.
 * El backend solo actualiza las que están en estado 'pending'.
 */
export async function bulkUpdateReceivableStatus(
  storeId: string,
  receivableIds: string[],
  newStatus: 'paid' | 'cancelled'
): Promise<{ updated: number; skipped: number; total: number }> {
  const response = await httpClient.post<{
    success: boolean;
    updated: number;
    skipped: number;
    total: number;
  }>('/api/receivables/bulk-update-status', {
    storeId,
    receivableIds,
    newStatus,
  });

  if (response.success && response.data) {
    return {
      updated: response.data.updated ?? 0,
      skipped: response.data.skipped ?? 0,
      total: response.data.total ?? 0,
    };
  }
  throw new Error((response as { error?: string }).error ?? 'Error al actualizar el estado');
}
