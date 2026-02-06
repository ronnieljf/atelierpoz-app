/**
 * Servicio para manejar requests (pedidos)
 */

import { httpClient } from '@/lib/http/client';
import { type CartItem } from '@/types/product';

export interface Request {
  id: string;
  storeId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: CartItem[];
  customMessage?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  /** true si ya existe una cuenta por cobrar creada desde este pedido */
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
      const req = result.request as Request & { store_id?: string; customer_name?: string; customer_phone?: string; customer_email?: string; custom_message?: string; created_at?: string; updated_at?: string };
      return {
        ...req,
        storeId: req.store_id || req.storeId,
        customerName: req.customer_name || req.customerName,
        customerPhone: req.customer_phone || req.customerPhone,
        customerEmail: req.customer_email || req.customerEmail,
        customMessage: req.custom_message || req.customMessage,
        createdAt: req.created_at || req.createdAt,
        updatedAt: req.updated_at || req.updatedAt,
        total: typeof req.total === 'string' ? parseFloat(req.total) : (req.total || 0),
      };
    }
    return null;
  } catch (error) {
    console.error('Error creando request:', error);
    throw error;
  }
}

/**
 * Obtener todos los requests de una tienda
 */
export async function getRequests(
  storeId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ requests: Request[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.set('storeId', storeId);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const response = await httpClient.get<{
      success: boolean;
      requests: Request[];
      total: number;
    }>(`/api/requests?${params.toString()}`);

    if (response.success && response.data) {
      const requests = (response.data.requests || []).map((req: Request & { store_id?: string; customer_name?: string; customer_phone?: string; customer_email?: string; custom_message?: string; created_at?: string; updated_at?: string; has_receivable?: boolean }) => ({
        ...req,
        storeId: req.store_id || req.storeId,
        customerName: req.customer_name || req.customerName,
        customerPhone: req.customer_phone || req.customerPhone,
        customerEmail: req.customer_email || req.customerEmail,
        customMessage: req.custom_message || req.customMessage,
        createdAt: req.created_at || req.createdAt,
        updatedAt: req.updated_at || req.updatedAt,
        total: typeof req.total === 'string' ? parseFloat(req.total) : (req.total || 0),
        hasReceivable: req.has_receivable ?? req.hasReceivable ?? false,
      }));
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
      const req = response.data.request as Request & { store_id?: string; customer_name?: string; customer_phone?: string; customer_email?: string; custom_message?: string; created_at?: string; updated_at?: string };
      return {
        ...req,
        storeId: req.store_id || req.storeId,
        customerName: req.customer_name || req.customerName,
        customerPhone: req.customer_phone || req.customerPhone,
        customerEmail: req.customer_email || req.customerEmail,
        customMessage: req.custom_message || req.customMessage,
        createdAt: req.created_at || req.createdAt,
        updatedAt: req.updated_at || req.updatedAt,
        total: typeof req.total === 'string' ? parseFloat(req.total) : (req.total || 0),
      };
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
      const req = response.data.request as Request & { store_id?: string; customer_name?: string; customer_phone?: string; customer_email?: string; custom_message?: string; created_at?: string; updated_at?: string };
      return {
        ...req,
        storeId: req.store_id || req.storeId,
        customerName: req.customer_name || req.customerName,
        customerPhone: req.customer_phone || req.customerPhone,
        customerEmail: req.customer_email || req.customerEmail,
        customMessage: req.custom_message || req.customMessage,
        createdAt: req.created_at || req.createdAt,
        updatedAt: req.updated_at || req.updatedAt,
        total: typeof req.total === 'string' ? parseFloat(req.total) : (req.total || 0),
      };
    }
    return null;
  } catch (error) {
    console.error('Error actualizando estado del request:', error);
    throw error;
  }
}
