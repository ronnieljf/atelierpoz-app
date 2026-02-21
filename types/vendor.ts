/**
 * Tipos para proveedores (vendors) — espejo de client.ts
 */

export interface Vendor {
  id: string;
  storeId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  identityDocument?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorData {
  storeId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  identityDocument?: string | null;
  notes?: string | null;
}

export interface UpdateVendorData {
  storeId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  identityDocument?: string | null;
  notes?: string | null;
}
