/**
 * Servicio de compras al contado (purchases)
 */

import { httpClient } from '@/lib/http/client';
import type { Purchase, CreatePurchaseData } from '@/types/purchase';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiPurchase = Record<string, any>;

function formatPurchase(r: ApiPurchase): Purchase {
  let items = r.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  return {
    id: r.id,
    storeId: r.storeId ?? r.store_id,
    vendorId: r.vendorId ?? r.vendor_id ?? null,
    vendorName: r.vendorName ?? r.vendor_name ?? null,
    vendorPhone: r.vendorPhone ?? r.vendor_phone ?? null,
    createdBy: r.createdBy ?? r.created_by,
    createdByName: r.createdByName ?? r.created_by_name ?? null,
    purchaseNumber: parseInt(r.purchaseNumber ?? r.purchase_number, 10),
    categoryId: r.categoryId ?? r.category_id ?? null,
    categoryName: r.categoryName ?? r.category_name ?? null,
    description: r.description ?? null,
    items,
    total: parseFloat(r.total),
    currency: r.currency || 'USD',
    status: r.status,
    paymentMethod: r.paymentMethod ?? r.payment_method ?? null,
    notes: r.notes ?? null,
    paidAt: r.paidAt ?? r.paid_at ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

export async function getPurchases(
  storeId: string,
  options?: { status?: string; categoryId?: string; vendorId?: string; limit?: number; offset?: number }
): Promise<{ purchases: Purchase[]; total: number }> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  if (options?.status) params.set('status', options.status);
  if (options?.categoryId) params.set('categoryId', options.categoryId);
  if (options?.vendorId) params.set('vendorId', options.vendorId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const response = await httpClient.get<{ success: boolean; purchases: ApiPurchase[]; total: number }>(
    `/api/purchases?${params.toString()}`
  );
  if (response.success && response.data) {
    return {
      purchases: (response.data.purchases || []).map(formatPurchase),
      total: response.data.total ?? 0,
    };
  }
  return { purchases: [], total: 0 };
}

export async function getPurchaseById(purchaseId: string, storeId: string): Promise<Purchase | null> {
  const response = await httpClient.get<{ success: boolean; purchase: ApiPurchase }>(
    `/api/purchases/${purchaseId}?storeId=${storeId}`
  );
  return response.success && response.data?.purchase ? formatPurchase(response.data.purchase) : null;
}

export async function createPurchase(data: CreatePurchaseData): Promise<Purchase> {
  const response = await httpClient.post<{ success: boolean; purchase: ApiPurchase }>('/api/purchases', data);
  if (!response.success || !response.data?.purchase) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear compra');
  }
  return formatPurchase(response.data.purchase);
}

export async function cancelPurchase(purchaseId: string, storeId: string): Promise<Purchase> {
  const response = await httpClient.post<{ success: boolean; purchase: ApiPurchase }>(
    `/api/purchases/${purchaseId}/cancel`,
    { storeId }
  );
  if (!response.success || !response.data?.purchase) {
    throw new Error((response as { error?: string }).error ?? 'Error al cancelar compra');
  }
  return formatPurchase(response.data.purchase);
}
