/**
 * Servicio de proveedores (vendors) — espejo de clients.ts
 */

import { httpClient } from '@/lib/http/client';
import type { Vendor, CreateVendorData, UpdateVendorData } from '@/types/vendor';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiVendor = Record<string, any>;

function formatVendor(r: ApiVendor): Vendor {
  return {
    id: r.id,
    storeId: r.storeId ?? r.store_id,
    name: r.name ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    address: r.address ?? null,
    identityDocument: r.identityDocument ?? r.identity_document ?? null,
    notes: r.notes ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

export async function getVendors(
  storeId: string,
  params?: { limit?: number; offset?: number; search?: string }
): Promise<{ vendors: Vendor[]; total: number }> {
  const qs = new URLSearchParams();
  qs.set('storeId', storeId);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  if (params?.search) qs.set('search', params.search);

  const response = await httpClient.get<{ success: boolean; vendors: ApiVendor[]; total: number }>(
    `/api/vendors?${qs.toString()}`
  );
  if (response.success && response.data) {
    return {
      vendors: (response.data.vendors || []).map(formatVendor),
      total: response.data.total ?? 0,
    };
  }
  return { vendors: [], total: 0 };
}

export async function getVendorById(vendorId: string, storeId: string): Promise<Vendor | null> {
  const response = await httpClient.get<{ success: boolean; vendor: ApiVendor }>(
    `/api/vendors/${vendorId}?storeId=${storeId}`
  );
  return response.success && response.data?.vendor ? formatVendor(response.data.vendor) : null;
}

export async function createVendor(data: CreateVendorData): Promise<Vendor> {
  const response = await httpClient.post<{ success: boolean; vendor: ApiVendor }>('/api/vendors', data);
  if (!response.success || !response.data?.vendor) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear proveedor');
  }
  return formatVendor(response.data.vendor);
}

export async function updateVendor(vendorId: string, data: UpdateVendorData): Promise<Vendor | null> {
  const response = await httpClient.put<{ success: boolean; vendor: ApiVendor }>(`/api/vendors/${vendorId}`, data);
  if (!response.success || !response.data?.vendor) {
    throw new Error((response as { error?: string }).error ?? 'Error al actualizar proveedor');
  }
  return formatVendor(response.data.vendor);
}

export async function deleteVendor(vendorId: string, storeId: string): Promise<boolean> {
  const response = await httpClient.delete<{ success: boolean }>(`/api/vendors/${vendorId}?storeId=${storeId}`);
  return !!response.success;
}
