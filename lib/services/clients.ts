/**
 * Servicio de clientes (cartera por tienda)
 */

import { httpClient } from '@/lib/http/client';
import type { Client, CreateClientData, UpdateClientData } from '@/types/client';

type ApiClient = {
  id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  store_id?: string;
  storeId?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function formatClient(c: ApiClient): Client {
  return {
    id: String(c.id ?? ''),
    name: c.name ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    storeId: String(c.storeId ?? c.store_id ?? ''),
    createdAt: String(c.createdAt ?? c.created_at ?? ''),
    updatedAt: String(c.updatedAt ?? c.updated_at ?? ''),
  };
}

export interface GetClientsParams {
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Listar clientes de una tienda (con paginación y búsqueda)
 */
export async function getClients(
  storeId: string,
  params?: GetClientsParams
): Promise<{ clients: Client[]; total: number }> {
  const sp = new URLSearchParams();
  sp.set('storeId', storeId);
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  if (params?.search != null && params.search.trim()) sp.set('search', params.search.trim());

  const response = await httpClient.get<{
    success: boolean;
    clients: ApiClient[];
    total: number;
  }>(`/api/clients?${sp.toString()}`);

  if (response.success && response.data) {
    const clients = (response.data.clients || []).map(formatClient);
    return {
      clients,
      total: response.data.total ?? 0,
    };
  }
  return { clients: [], total: 0 };
}

/**
 * Obtener un cliente por ID
 */
export async function getClientById(clientId: string, storeId: string): Promise<Client | null> {
  const response = await httpClient.get<{ success: boolean; client: ApiClient }>(
    `/api/clients/${clientId}?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && response.data?.client) {
    return formatClient(response.data.client);
  }
  return null;
}

/**
 * Crear cliente
 */
export async function createClient(data: CreateClientData): Promise<Client> {
  const response = await httpClient.post<{ success: boolean; client: ApiClient }>('/api/clients', {
    storeId: data.storeId,
    name: data.name ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
  });
  if (!response.success || !response.data?.client) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear cliente');
  }
  return formatClient(response.data.client);
}

/**
 * Actualizar cliente
 */
export async function updateClient(clientId: string, data: UpdateClientData): Promise<Client | null> {
  const response = await httpClient.put<{ success: boolean; client: ApiClient }>(`/api/clients/${clientId}`, {
    storeId: data.storeId,
    name: data.name !== undefined ? data.name : undefined,
    phone: data.phone !== undefined ? data.phone : undefined,
    email: data.email !== undefined ? data.email : undefined,
  });
  if (response.success && response.data?.client) {
    return formatClient(response.data.client);
  }
  return null;
}

/**
 * Eliminar cliente
 */
export async function deleteClient(clientId: string, storeId: string): Promise<boolean> {
  const response = await httpClient.delete<{ success: boolean }>(
    `/api/clients/${clientId}?storeId=${encodeURIComponent(storeId)}`
  );
  return response.success ?? false;
}
