/**
 * Cliente de una tienda (cartera de clientes)
 */

export interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  storeId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateClientData {
  storeId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}
