/**
 * Cliente de una tienda (cartera de clientes)
 */

export interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  /** Cédula de identidad (obligatoria al crear desde ventas/admin) */
  identityDocument?: string | null;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  storeId: string;
  /** Cédula de identidad — obligatoria */
  identityDocument: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateClientData {
  storeId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  identityDocument?: string | null;
}
