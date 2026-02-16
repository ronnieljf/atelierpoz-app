/**
 * Servicio de ventas (POS)
 */

import { httpClient } from '@/lib/http/client';
import type { Sale, SaleItem, POSProduct, CreateSaleData } from '@/types/sale';

export type { Sale, SaleItem, POSProduct, CreateSaleData };

/**
 * Obtener top productos más vendidos (para búsqueda local rápida)
 */
export async function getTopSoldProducts(
  storeId: string,
  limit = 100
): Promise<POSProduct[]> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  params.set('limit', String(limit));
  const response = await httpClient.get<{ success: boolean; products: POSProduct[] }>(
    `/api/sales/top-products?${params.toString()}`
  );
  return response.success && response.data?.products ? response.data.products : [];
}

/**
 * Buscar productos para POS (backend)
 */
export async function searchProductsForPOS(
  storeId: string,
  search: string,
  limit = 30
): Promise<POSProduct[]> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  if (search.trim()) params.set('search', search.trim());
  params.set('limit', String(limit));
  const response = await httpClient.get<{ success: boolean; products: POSProduct[] }>(
    `/api/sales/products?${params.toString()}`
  );
  return response.success && response.data?.products ? response.data.products : [];
}

/**
 * Obtener todas las opciones (combinaciones) de un producto para elegir variante en POS
 */
export async function getProductPOSOptions(
  storeId: string,
  productId: string
): Promise<POSProduct[]> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  const response = await httpClient.get<{ success: boolean; products: POSProduct[] }>(
    `/api/sales/products/${encodeURIComponent(productId)}/options?${params.toString()}`
  );
  return response.success && response.data?.products ? response.data.products : [];
}

/**
 * Crear venta al contado
 */
export async function createSale(data: CreateSaleData): Promise<Sale> {
  const response = await httpClient.post<{ success: boolean; sale: Sale }>('/api/sales', {
    storeId: data.storeId,
    clientId: data.clientId,
    items: data.items,
    total: data.total,
    currency: data.currency ?? 'USD',
    paymentMethod: data.paymentMethod || undefined,
    notes: data.notes || undefined,
  });
  if (!response.success || !response.data?.sale) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear venta');
  }
  return response.data.sale;
}

/**
 * Listar ventas
 */
export async function getSales(
  storeId: string,
  params?: {
    limit?: number;
    offset?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
): Promise<{ sales: Sale[]; total: number }> {
  const sp = new URLSearchParams();
  sp.set('storeId', storeId);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  if (params?.status) sp.set('status', params.status);
  if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
  if (params?.dateTo) sp.set('dateTo', params.dateTo);
  if (params?.search) sp.set('search', params.search);
  const response = await httpClient.get<{ success: boolean; sales: Sale[]; total: number }>(
    `/api/sales?${sp.toString()}`
  );
  return {
    sales: response.success && response.data?.sales ? response.data.sales : [],
    total: response.data?.total ?? 0,
  };
}

/**
 * Obtener venta por ID
 */
export async function getSaleById(saleId: string, storeId: string): Promise<Sale | null> {
  const response = await httpClient.get<{ success: boolean; sale: Sale }>(
    `/api/sales/${saleId}?storeId=${encodeURIComponent(storeId)}`
  );
  return response.success && response.data?.sale ? response.data.sale : null;
}

/**
 * Devolver venta (refund)
 */
export async function refundSale(saleId: string, storeId: string): Promise<Sale> {
  const response = await httpClient.post<{ success: boolean; sale: Sale }>(
    `/api/sales/${saleId}/refund?storeId=${encodeURIComponent(storeId)}`
  );
  if (!response.success || !response.data?.sale) {
    throw new Error((response as { error?: string }).error ?? 'Error al devolver venta');
  }
  return response.data.sale;
}

/**
 * Cancelar venta
 */
export async function cancelSale(saleId: string, storeId: string): Promise<Sale> {
  const response = await httpClient.post<{ success: boolean; sale: Sale }>(
    `/api/sales/${saleId}/cancel?storeId=${encodeURIComponent(storeId)}`
  );
  if (!response.success || !response.data?.sale) {
    throw new Error((response as { error?: string }).error ?? 'Error al cancelar venta');
  }
  return response.data.sale;
}
