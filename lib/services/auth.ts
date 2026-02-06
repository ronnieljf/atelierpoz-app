/**
 * Servicios de autenticación (usuario logeado)
 */

import { httpClient } from '@/lib/http/client';

export interface MeUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

/**
 * Obtener datos del usuario actual (desde la API)
 */
export async function getMe(): Promise<MeUser | null> {
  try {
    const response = await httpClient.get<{ user: MeUser }>('/api/auth/me');
    if (response.success && response.data?.user) {
      return response.data.user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cambiar contraseña del usuario logeado
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const response = await httpClient.put<{ success: boolean; message?: string }>(
    '/api/auth/me/password',
    { currentPassword, newPassword }
  );
  if (response.success) {
    return { success: true };
  }
  return {
    success: false,
    error: (response as { error?: string }).error ?? 'Error al cambiar la contraseña',
  };
}
