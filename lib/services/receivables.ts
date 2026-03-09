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
  ReceivableReminder,
  CreateReceivableReminderData,
  UpdateReceivableReminderData,
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
  product_names?: unknown;
  productNames?: unknown;
  invoice_number?: unknown;
  invoiceNumber?: unknown;
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
    productNames: toStringOrNull(r.productNames ?? r.product_names),
    invoiceNumber: toStringOrNull(r.invoiceNumber ?? r.invoice_number),
    dueDate: toStringOrNull(r.dueDate ?? r.due_date),
  };
}

/**
 * Listar cuentas por cobrar de una tienda
 * @param options.search - filtra por nombre o número de cliente / número de cuenta
 */
export async function getReceivables(
  storeId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    invoiceNumber?: string;
    source?: 'manual' | 'request';
  }
): Promise<{ receivables: Receivable[]; total: number; totalAmountByCurrency: Record<string, number> }> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  if (options?.status) params.set('status', options.status);
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options?.dateTo) params.set('dateTo', options.dateTo);
  if (options?.search?.trim()) params.set('search', options.search.trim());
  if (options?.invoiceNumber?.trim()) params.set('invoiceNumber', options.invoiceNumber.trim());
  if (options?.source) params.set('source', options.source);

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
 * Crear cuenta por cobrar manual.
 * Si initialPayment.file o data.file está presente, envía multipart/form-data con el comprobante.
 */
export async function createReceivable(data: CreateReceivableData): Promise<Receivable | null> {
  const fileToSend = data.initialPayment?.file && data.initialPayment.file instanceof File
    ? data.initialPayment.file
    : data.file && data.file instanceof File
      ? data.file
      : null;
  const hasFile = Boolean(fileToSend);

  let body: Record<string, unknown> | FormData;
  if (hasFile && fileToSend) {
    const form = new FormData();
    form.append('storeId', data.storeId);
    form.append('amount', String(data.amount));
    if (data.customerName) form.append('customerName', data.customerName);
    if (data.customerPhone) form.append('customerPhone', data.customerPhone);
    if (data.description) form.append('description', data.description);
    if (data.currency) form.append('currency', data.currency);
    if (data.invoiceNumber) form.append('invoiceNumber', data.invoiceNumber);
    if (data.dueDate) form.append('dueDate', String(data.dueDate).slice(0, 10));
    if (data.initialPayment && data.initialPayment.amount > 0) {
      form.append(
        'initialPayment',
        JSON.stringify({ amount: data.initialPayment.amount, notes: data.initialPayment.notes })
      );
    }
    form.append('file', fileToSend);
    body = form;
  } else {
    body = {
      storeId: data.storeId,
      customerName: data.customerName ?? undefined,
      customerPhone: data.customerPhone ?? undefined,
      description: data.description ?? undefined,
      amount: data.amount,
      currency: data.currency ?? 'USD',
      invoiceNumber: data.invoiceNumber ?? undefined,
      dueDate: data.dueDate ?? undefined,
      initialPayment:
        data.initialPayment != null && data.initialPayment.amount > 0
          ? { amount: data.initialPayment.amount, notes: data.initialPayment.notes }
          : undefined,
    };
  }

  const response = await httpClient.post<{ success: boolean; receivable: Receivable }>('/api/receivables', body);

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  const errMsg = (response as { error?: string }).error ?? 'No se pudo crear la cuenta por cobrar';
  throw new Error(errMsg);
}

/**
 * Crear cuenta por cobrar a partir de un pedido.
 * Si initialPayment.file o data.file está presente, envía multipart/form-data con el comprobante.
 */
export async function createReceivableFromRequest(
  data: CreateReceivableFromRequestData
): Promise<Receivable | null> {
  const fileToSend = data.initialPayment?.file && data.initialPayment.file instanceof File
    ? data.initialPayment.file
    : data.file && data.file instanceof File
      ? data.file
      : null;
  const hasFile = Boolean(fileToSend);

  let body: Record<string, unknown> | FormData;
  if (hasFile && fileToSend) {
    const form = new FormData();
    form.append('storeId', data.storeId);
    form.append('requestId', data.requestId);
    if (data.description) form.append('description', data.description);
    if (data.customerName) form.append('customerName', data.customerName);
    if (data.customerPhone) form.append('customerPhone', data.customerPhone);
    if (data.amount != null && !Number.isNaN(data.amount)) form.append('amount', String(data.amount));
    if (data.invoiceNumber) form.append('invoiceNumber', data.invoiceNumber);
    if (data.dueDate) form.append('dueDate', String(data.dueDate).slice(0, 10));
    if (data.initialPayment && data.initialPayment.amount > 0) {
      form.append(
        'initialPayment',
        JSON.stringify({ amount: data.initialPayment.amount, notes: data.initialPayment.notes })
      );
    }
    form.append('file', fileToSend);
    body = form;
  } else {
    body = {
      storeId: data.storeId,
      requestId: data.requestId,
      description: data.description ?? undefined,
      customerName: data.customerName ?? undefined,
      customerPhone: data.customerPhone ?? undefined,
      amount: data.amount != null && !Number.isNaN(data.amount) ? data.amount : undefined,
      invoiceNumber: data.invoiceNumber ?? undefined,
      dueDate: data.dueDate ?? undefined,
      initialPayment:
        data.initialPayment != null && data.initialPayment.amount > 0
          ? { amount: data.initialPayment.amount, notes: data.initialPayment.notes }
          : undefined,
    };
  }

  const response = await httpClient.post<{ success: boolean; receivable: Receivable }>(
    '/api/receivables/from-request',
    body
  );

  if (response.success && response.data?.receivable) {
    return formatReceivable(response.data.receivable as ApiReceivable);
  }
  const errMsg = (response as { error?: string }).error ?? 'No se pudo crear la cuenta por cobrar';
  throw new Error(errMsg);
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
      dueDate: data.dueDate ?? null,
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
 * Registrar un abono en una cuenta por cobrar.
 * Si data.file está presente, envía multipart/form-data con el comprobante.
 */
export async function createReceivablePayment(
  receivableId: string,
  data: CreateReceivablePaymentData
): Promise<{ receivable: Receivable; payments: ReceivablePayment[]; totalPaid: number } | null> {
  const hasFile = data.file && data.file instanceof File;

  let body: Record<string, unknown> | FormData;
  if (hasFile && data.file) {
    const form = new FormData();
    form.append('storeId', data.storeId);
    form.append('amount', String(data.amount));
    if (data.currency) form.append('currency', data.currency);
    if (data.notes) form.append('notes', data.notes);
    form.append('file', data.file);
    body = form;
  } else {
    body = {
      storeId: data.storeId,
      amount: data.amount,
      currency: data.currency ?? undefined,
      notes: data.notes ?? undefined,
    };
  }

  const response = await httpClient.post<{
    success: boolean;
    receivable: ApiReceivable;
    payments: ApiPayment[];
    totalPaid: number;
  }>(`/api/receivables/${receivableId}/payments`, body);

  if (response.success && response.data) {
    return {
      receivable: formatReceivable(response.data.receivable as ApiReceivable),
      payments: (response.data.payments || []).map(formatPayment),
      totalPaid: typeof response.data.totalPaid === 'number' ? response.data.totalPaid : parseFloat(String(response.data.totalPaid ?? 0)),
    };
  }
  return null;
}

/** Tipo de adjunto de la API */
type ApiAttachment = Record<string, unknown> & {
  id?: string;
  receivable_id?: string;
  receivableId?: string;
  payment_id?: string | null;
  paymentId?: string | null;
  file_name?: string;
  fileName?: string;
  file_url?: string;
  fileUrl?: string;
  mime_type?: string;
  mimeType?: string;
  created_at?: string;
  createdAt?: string;
  created_by?: string | null;
  createdBy?: string | null;
};

function formatAttachment(a: ApiAttachment): import('@/types/receivable').ReceivableAttachment {
  return {
    id: String(a.id ?? ''),
    receivableId: String(a.receivableId ?? a.receivable_id ?? ''),
    paymentId: (a.paymentId ?? a.payment_id) ?? null,
    fileName: String(a.fileName ?? a.file_name ?? ''),
    fileUrl: String(a.fileUrl ?? a.file_url ?? ''),
    mimeType: String(a.mimeType ?? a.mime_type ?? ''),
    createdAt: String(a.createdAt ?? a.created_at ?? ''),
    createdBy: (a.createdBy ?? a.created_by) ?? null,
  };
}

/**
 * Obtener adjuntos (comprobantes) de una cuenta por cobrar
 */
export async function getReceivableAttachments(
  receivableId: string,
  storeId: string
): Promise<import('@/types/receivable').ReceivableAttachment[]> {
  const response = await httpClient.get<{
    success: boolean;
    attachments: ApiAttachment[];
  }>(`/api/receivables/${receivableId}/attachments?storeId=${encodeURIComponent(storeId)}`);

  if (response.success && response.data?.attachments) {
    return response.data.attachments.map(formatAttachment);
  }
  return [];
}

/**
 * Subir un comprobante a una cuenta por cobrar
 * @param paymentId - Opcional, para vincular el archivo a un abono específico
 */
export async function createReceivableAttachment(
  receivableId: string,
  storeId: string,
  file: File,
  paymentId?: string | null
): Promise<import('@/types/receivable').ReceivableAttachment | null> {
  const form = new FormData();
  form.append('storeId', storeId);
  form.append('file', file);
  if (paymentId) form.append('paymentId', paymentId);

  const response = await httpClient.post<{
    success: boolean;
    attachment: ApiAttachment;
  }>(`/api/receivables/${receivableId}/attachments`, form);

  if (response.success && response.data?.attachment) {
    return formatAttachment(response.data.attachment);
  }
  return null;
}

/**
 * Obtener URL firmada para descargar un adjunto.
 * El frontend debe usar fetch con auth para llamar esto y luego abrir downloadUrl en nueva pestaña.
 */
export async function getReceivableAttachmentDownloadUrl(
  receivableId: string,
  attachmentId: string,
  storeId: string
): Promise<string | null> {
  const response = await httpClient.get<{
    success: boolean;
    downloadUrl: string;
  }>(`/api/receivables/${receivableId}/attachments/${attachmentId}/download?storeId=${encodeURIComponent(storeId)}`);

  if (response.success && response.data?.downloadUrl) {
    return response.data.downloadUrl;
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
 * Obtener el historial de actividades (log) de una cuenta por cobrar.
 */
export interface ReceivableLogEntry {
  id: string;
  receivableId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export async function getReceivableLogs(
  receivableId: string,
  storeId: string
): Promise<ReceivableLogEntry[] | null> {
  const response = await httpClient.get<{
    success: boolean;
    logs: Array<{
      id: string;
      receivableId: string;
      userId: string;
      userName?: string | null;
      userEmail?: string | null;
      action: string;
      details?: Record<string, unknown>;
      createdAt: string;
    }>;
  }>(`/api/receivables/${receivableId}/logs?storeId=${encodeURIComponent(storeId)}`);

  if (response.success && response.data?.logs) {
    return response.data.logs.map((l) => ({
      id: l.id,
      receivableId: l.receivableId,
      userId: l.userId,
      userName: l.userName ?? null,
      userEmail: l.userEmail ?? null,
      action: l.action,
      details: l.details ?? {},
      createdAt: l.createdAt,
    }));
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

/** Formatear recordatorio desde API (snake_case → camelCase) */
function formatReminder(r: Record<string, unknown>): ReceivableReminder {
  return {
    id: String(r.id ?? r.id),
    receivableId: String(r.receivableId ?? r.receivable_id),
    storeId: String(r.storeId ?? r.store_id),
    customerName: (r.customerName ?? r.customer_name) as string | null,
    storeName: (r.storeName ?? r.store_name) as string | null,
    invoiceOrAccount: (r.invoiceOrAccount ?? r.invoice_or_account) as string | null,
    fechaVencimiento: (r.fechaVencimiento ?? r.fecha_vencimiento) as string | null,
    // String vacío si no hay datos, para que el template no dé error
    datosPagomovil: (r.datosPagomovil ?? r.datos_pagomovil ?? '') as string,
    datosTransferencia: (r.datosTransferencia ?? r.datos_transferencia ?? '') as string,
    datosBinance: (r.datosBinance ?? r.datos_binance ?? '') as string,
    datosContacto: (r.datosContacto ?? r.datos_contacto ?? '') as string,
    fechaEnvio: (r.fechaEnvio ?? r.fecha_envio) as string | null,
    esMora: (r.esMora ?? r.es_mora ?? false) as boolean,
    repetirVeces: (r.repetirVeces ?? r.repetir_veces ?? 0) as number,
    repetirCadaDias: (r.repetirCadaDias ?? r.repetir_cada_dias ?? 0) as number,
    status: (r.status as ReceivableReminder['status']) ?? 'pending',
    sentAt: (r.sentAt ?? r.sent_at) as string | null,
    createdAt: String(r.createdAt ?? r.created_at),
    updatedAt: String(r.updatedAt ?? r.updated_at),
  };
}

/**
 * Listar recordatorios programables de una cuenta por cobrar
 */
export async function getReceivableReminders(
  receivableId: string,
  storeId: string
): Promise<ReceivableReminder[]> {
  const response = await httpClient.get<{ success: boolean; reminders: unknown[] }>(
    `/api/receivables/${receivableId}/reminders?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && Array.isArray(response.data?.reminders)) {
    return response.data.reminders.map((r) => formatReminder(r as Record<string, unknown>));
  }
  return [];
}

/**
 * Obtener datos prellenados para crear un recordatorio
 */
export async function getReceivableReminderDefaults(
  receivableId: string,
  storeId: string
): Promise<{
  customerName: string | null;
  storeName: string | null;
  invoiceOrAccount: string | null;
  fechaVencimiento: string | null;
  datosContacto: string | null;
} | null> {
  const response = await httpClient.get<{ success: boolean; defaults: Record<string, unknown> }>(
    `/api/receivables/${receivableId}/reminders/defaults?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && response.data?.defaults) {
    const d = response.data.defaults;
    return {
      customerName: (d.customerName ?? d.customer_name) as string | null,
      storeName: (d.storeName ?? d.store_name) as string | null,
      invoiceOrAccount: (d.invoiceOrAccount ?? d.invoice_or_account) as string | null,
      fechaVencimiento: (d.fechaVencimiento ?? d.fecha_vencimiento) as string | null,
      datosContacto: (d.datosContacto ?? d.datos_contacto) as string | null,
    };
  }
  return null;
}

/**
 * Crear recordatorio(s) programable(s).
 * Si repetirVeces > 1 y repetirCadaDias > 0, crea varios registros con fechas escalonadas.
 * Retorna el array de recordatorios creados.
 */
export async function createReceivableReminder(
  receivableId: string,
  data: Omit<CreateReceivableReminderData, 'receivableId'>
): Promise<ReceivableReminder[]> {
  const response = await httpClient.post<{ success: boolean; reminders: unknown[] }>(
    `/api/receivables/${receivableId}/reminders`,
    data
  );
  if (response.success && Array.isArray(response.data?.reminders)) {
    return response.data.reminders.map((r) => formatReminder(r as Record<string, unknown>));
  }
  return [];
}

/**
 * Actualizar recordatorio programable
 */
export async function updateReceivableReminder(
  receivableId: string,
  reminderId: string,
  data: UpdateReceivableReminderData
): Promise<ReceivableReminder | null> {
  const response = await httpClient.put<{ success: boolean; reminder: unknown }>(
    `/api/receivables/${receivableId}/reminders/${reminderId}`,
    data
  );
  if (response.success && response.data?.reminder) {
    return formatReminder(response.data.reminder as Record<string, unknown>);
  }
  return null;
}

/**
 * Eliminar recordatorio programable
 */
export async function deleteReceivableReminder(
  receivableId: string,
  reminderId: string,
  storeId: string
): Promise<boolean> {
  const response = await httpClient.delete<{ success: boolean }>(
    `/api/receivables/${receivableId}/reminders/${reminderId}?storeId=${encodeURIComponent(storeId)}`
  );
  return Boolean(response.success);
}
