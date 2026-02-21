/**
 * Servicio para manejar requests (pedidos)
 */

import { httpClient } from '@/lib/http/client';
import { type CartItem } from '@/types/product';

export type DeliveryMethod = 'pickup' | 'delivery';

export interface Request {
  id: string;
  storeId: string;
  orderNumber?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: CartItem[];
  customMessage?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  currency: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryRecipientName?: string | null;
  deliveryRecipientPhone?: string | null;
  deliveryDate?: string | null;
  deliveryNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  hasReceivable?: boolean;
}

export interface CreateRequestData {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: CartItem[];
  customMessage?: string;
  total: number;
  currency?: string;
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';
  deliveryMethod?: DeliveryMethod;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryRecipientName?: string;
  deliveryRecipientPhone?: string;
  deliveryDate?: string;
  deliveryNotes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRequestFromApi(raw: any): Request {
  return {
    ...raw,
    storeId: raw.store_id || raw.storeId,
    orderNumber: raw.order_number ?? raw.orderNumber,
    customerName: raw.customer_name || raw.customerName,
    customerPhone: raw.customer_phone || raw.customerPhone,
    customerEmail: raw.customer_email || raw.customerEmail,
    customMessage: raw.custom_message || raw.customMessage,
    deliveryMethod: raw.delivery_method || raw.deliveryMethod || 'pickup',
    deliveryAddress: raw.delivery_address ?? raw.deliveryAddress ?? null,
    deliveryReference: raw.delivery_reference ?? raw.deliveryReference ?? null,
    deliveryRecipientName: raw.delivery_recipient_name ?? raw.deliveryRecipientName ?? null,
    deliveryRecipientPhone: raw.delivery_recipient_phone ?? raw.deliveryRecipientPhone ?? null,
    deliveryDate: raw.delivery_date ?? raw.deliveryDate ?? null,
    deliveryNotes: raw.delivery_notes ?? raw.deliveryNotes ?? null,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
    total: typeof raw.total === 'string' ? parseFloat(raw.total) : (raw.total || 0),
    hasReceivable: raw.has_receivable ?? raw.hasReceivable ?? false,
  };
}

/**
 * Crear un nuevo request (pedido)
 * Este endpoint es público y no requiere autenticación
 */
export async function createRequest(data: CreateRequestData): Promise<Request | null> {
  try {
    // Usar fetch directamente ya que este endpoint es público y no requiere autenticación
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.request) {
      return mapRequestFromApi(result.request);
    }
    return null;
  } catch (error) {
    console.error('Error creando request:', error);
    throw error;
  }
}

/**
 * Obtener todos los requests de una tienda
 * @param options.withoutReceivable - si true, solo devuelve pedidos que aún no tienen cuenta por cobrar
 * @param options.search - filtra por nombre o número de cliente / número de pedido
 */
export async function getRequests(
  storeId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
    withoutReceivable?: boolean;
    search?: string;
  }
): Promise<{ requests: Request[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.set('storeId', storeId);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.withoutReceivable === true) params.set('withoutReceivable', 'true');
    if (options?.search?.trim()) params.set('search', options.search.trim());

    const response = await httpClient.get<{
      success: boolean;
      requests: Request[];
      total: number;
    }>(`/api/requests?${params.toString()}`);

    if (response.success && response.data) {
      const requests = (response.data.requests || []).map(mapRequestFromApi);
      return {
        requests,
        total: response.data.total || 0,
      };
    }
    return { requests: [], total: 0 };
  } catch (error) {
    console.error('Error obteniendo requests:', error);
    throw error;
  }
}

/**
 * Obtener un request por ID
 */
export async function getRequestById(requestId: string, storeId: string): Promise<Request | null> {
  try {
    const response = await httpClient.get<{
      success: boolean;
      request: Request;
    }>(`/api/requests/${requestId}?storeId=${storeId}`);

    if (response.success && response.data?.request) {
      return mapRequestFromApi(response.data.request);
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo request:', error);
    throw error;
  }
}

/**
 * Actualizar el estado de un request
 */
export async function updateRequestStatus(
  requestId: string,
  storeId: string,
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
): Promise<Request | null> {
  try {
    const response = await httpClient.put<{
      success: boolean;
      request: Request;
    }>(`/api/requests/${requestId}/status`, {
      storeId,
      status,
    });

    if (response.success && response.data?.request) {
      return mapRequestFromApi(response.data.request);
    }
    return null;
  } catch (error) {
    console.error('Error actualizando estado del request:', error);
    throw error;
  }
}
