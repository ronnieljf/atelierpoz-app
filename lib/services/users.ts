/**
 * Servicio para gestionar usuarios (solo para admins)
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

/**
 * Obtener todos los usuarios (solo para admins)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const { httpClient } = await import('@/lib/http/client');
    
    const response = await httpClient.get<{
      success: boolean;
      users: User[];
      count: number;
    }>('/api/auth/users');

    if (response.success && response.data?.users) {
      return response.data.users;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
}

/**
 * Crear un nuevo usuario (solo para admins)
 */
export async function createUser(
  email: string,
  password: string,
  name?: string,
  role: string = 'user'
): Promise<User | null> {
  try {
    const { httpClient } = await import('@/lib/http/client');
    
    const response = await httpClient.post<{
      success: boolean;
      user: User;
    }>('/api/auth/users', { email, password, name, role });

    if (response.success && response.data?.user) {
      return response.data.user;
    }
    return null;
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw error;
  }
}

/**
 * Actualizar un usuario (solo para admins)
 */
export async function updateUser(
  userId: string,
  updates: {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
  }
): Promise<User | null> {
  try {
    const { httpClient } = await import('@/lib/http/client');
    
    const response = await httpClient.put<{
      success: boolean;
      user: User;
    }>(`/api/auth/users/${userId}`, updates);

    if (response.success && response.data?.user) {
      return response.data.user;
    }
    return null;
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    throw error;
  }
}
