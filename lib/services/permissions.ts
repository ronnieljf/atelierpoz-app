/**
 * Servicio de permisos por tienda.
 * - Mis permisos en una tienda: GET /api/stores/:id/my-permissions
 * - Catálogo de permisos: GET /api/stores/permissions
 * - Asignar permisos a un usuario: PUT /api/stores/:id/users/:userId/permissions
 */

export interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
}

/**
 * Obtener los permisos del usuario actual en una tienda.
 * Si es creador, el backend no devuelve lista (tiene todos); en front asumimos todos.
 */
export async function getMyPermissions(storeId: string): Promise<{
  permissionCodes: string[] | null;
  isCreator: boolean;
}> {
  const { httpClient } = await import('@/lib/http/client');
  const response = await httpClient.get<{
    success: boolean;
    permissionCodes: string[] | null;
    isCreator?: boolean;
  }>(`/api/stores/${storeId}/my-permissions`);

  if (response.error || !response.success) {
    throw new Error(response.error || 'Error al obtener permisos');
  }
  const data = response.data;
  return {
    permissionCodes: data?.permissionCodes ?? null,
    isCreator: data?.isCreator ?? false,
  };
}

/**
 * Catálogo de todos los permisos disponibles (para asignar a usuarios).
 */
export async function getAllPermissions(): Promise<PermissionItem[]> {
  const { httpClient } = await import('@/lib/http/client');
  const response = await httpClient.get<{
    success: boolean;
    permissions: PermissionItem[];
  }>('/api/stores/permissions');

  if (response.error || !response.success) {
    throw new Error(response.error || 'Error al obtener catálogo de permisos');
  }
  return response.data?.permissions ?? [];
}

/**
 * Asignar permisos a un usuario en una tienda. Solo el creador puede.
 */
export async function setUserPermissions(
  storeId: string,
  userId: string,
  permissionCodes: string[]
): Promise<void> {
  const { httpClient } = await import('@/lib/http/client');
  const response = await httpClient.put<{ success: boolean; message?: string }>(
    `/api/stores/${storeId}/users/${userId}/permissions`,
    { permissionCodes }
  );

  if (response.error || !response.success) {
    throw new Error(response.error || 'Error al guardar permisos');
  }
}
