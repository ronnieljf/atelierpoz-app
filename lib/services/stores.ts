/**
 * Servicio para obtener tiendas
 */

export interface Store {
  id: string;
  store_id?: string | null;
  name: string;
  state: string;
  logo?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  description?: string | null;
  location?: string | null;
  /** IVA en porcentaje (ej. 19, 13). Configurable por tienda. */
  iva?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Obtener una tienda por ID (público, sin autenticación)
 */
export async function getStoreById(id: string): Promise<Store | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/stores/public/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.store) {
      return data.store;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo tienda:', error);
    return null;
  }
}

/**
 * Obtener todas las tiendas activas (público, sin autenticación)
 */
export async function getAllStores(): Promise<Store[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/stores/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Evitar cache para obtener siempre los datos más recientes
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.stores) {
      console.log(`[getAllStores] Backend retornó ${data.stores.length} stores:`, data.stores.map((s: Store) => ({ id: s.id, name: s.name, state: s.state })));
      return data.stores;
    }
    console.warn('[getAllStores] Respuesta del backend no tiene stores:', data);
    return [];
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    return [];
  }
}

/**
 * Crear una nueva tienda (solo para admins)
 */
export async function createStore(
  name: string,
  state: string = 'active',
  store_id?: string,
  instagram?: string,
  tiktok?: string,
  description?: string,
  location?: string,
  iva?: number
): Promise<Store | null> {
  try {
    const { httpClient } = await import('@/lib/http/client');
    
    const body: { name: string; state: string; store_id?: string; instagram?: string; tiktok?: string; description?: string; location?: string; iva?: number } = { name, state };
    if (store_id?.trim()) {
      body.store_id = store_id.trim();
    }
    if (instagram) {
      body.instagram = instagram;
    }
    if (tiktok) {
      body.tiktok = tiktok;
    }
    if (description != null) {
      body.description = description.trim() || undefined;
    }
    if (location != null) {
      body.location = location.trim() || undefined;
    }
    if (iva != null && !Number.isNaN(Number(iva))) {
      body.iva = Math.max(0, Math.min(100, Number(iva)));
    }
    
    const response = await httpClient.post<{
      success: boolean;
      store: Store;
    }>('/api/stores', body);

    // Si hay un error en la respuesta, lanzarlo
    if (response.error || !response.success) {
      const errorMessage = response.error || response.message || 'Error al crear la tienda';
      throw new Error(errorMessage);
    }

    if (response.success && response.data?.store) {
      return response.data.store;
    }
    return null;
  } catch (error) {
    console.error('Error creando tienda:', error);
    throw error;
  }
}

/**
 * Subir y actualizar el logo de una tienda.
 * Solo creador o admin. Body: multipart/form-data, campo "logo".
 */
export async function uploadStoreLogo(storeId: string, file: File): Promise<{ store: Store }> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const auth = localStorage.getItem('admin_auth');
      if (auth) {
        const p = JSON.parse(auth);
        if (p?.token) token = p.token;
      }
      if (!token) token = localStorage.getItem('auth_token');
      if (!token) token = sessionStorage.getItem('auth_token');
    } catch {
      /* ignore */
    }
  }
  if (!token) throw new Error('No hay sesión iniciada');

  const form = new FormData();
  form.append('logo', file);

  const res = await fetch(`${backendUrl}/api/stores/${storeId}/logo`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = (data?.error as string) || data?.message || `Error ${res.status}`;
    throw new Error(msg);
  }
  if (!data?.success || !data?.store) throw new Error('Error al subir el logo');

  return { store: data.store as Store };
}

/**
 * Actualizar una tienda (solo para admins)
 */
export async function updateStore(
  storeId: string,
  updates: {
    name?: string;
    state?: string;
    store_id?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    description?: string | null;
    location?: string | null;
    iva?: number | null;
  }
): Promise<Store | null> {
  try {
    const { httpClient } = await import('@/lib/http/client');
    
    const response = await httpClient.put<{
      success: boolean;
      store: Store;
    }>(`/api/stores/${storeId}`, updates);

    // Si hay un error en la respuesta, lanzarlo
    if (response.error || !response.success) {
      const errorMessage = response.error || response.message || 'Error al actualizar la tienda';
      throw new Error(errorMessage);
    }

    if (response.success && response.data?.store) {
      return response.data.store;
    }
    return null;
  } catch (error) {
    console.error('Error actualizando tienda:', error);
    // Si ya es un Error, relanzarlo directamente
    if (error instanceof Error) {
      throw error;
    }
    // Si es otro tipo de error, convertirlo a Error
    throw new Error(error instanceof Error ? error.message : 'Error al actualizar la tienda');
  }
}

/**
 * Agregar un usuario a una tienda por email
 * Solo el creador de la tienda o un admin pueden agregar usuarios
 */
export async function addUserToStore(
  storeId: string,
  email: string,
  isCreator: boolean = false
): Promise<{
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  isCreator: boolean;
  createdAt: string;
}> {
  const { httpClient } = await import('@/lib/http/client');
  
  const response = await httpClient.post<{
    success: boolean;
    message: string;
    storeUser: {
      id: string;
      userId: string;
      userEmail: string;
      userName: string;
      isCreator: boolean;
      createdAt: string;
    };
  }>(`/api/stores/${storeId}/users`, { email, isCreator });

  // Si hay un error en la respuesta, lanzarlo
  if (response.error || !response.success) {
    const errorMessage = response.error || response.message || 'Error al agregar usuario a la tienda';
    throw new Error(errorMessage);
  }

  // Si la respuesta es exitosa pero no tiene datos, también es un error
  if (!response.data?.storeUser) {
    throw new Error('No se recibieron datos del usuario agregado');
  }

  return response.data.storeUser;
}

/**
 * Eliminar un usuario de una tienda
 * Solo el creador de la tienda puede eliminar usuarios
 */
export async function removeUserFromStore(storeId: string, userId: string): Promise<void> {
  const { httpClient } = await import('@/lib/http/client');

  const response = await httpClient.delete<{ success: boolean; message: string }>(
    `/api/stores/${storeId}/users/${userId}`
  );

  if (response.error || !response.success) {
    const errorMessage = response.error || response.message || 'Error al eliminar usuario de la tienda';
    throw new Error(errorMessage);
  }
}

/**
 * Actualizar el número de teléfono del usuario actual en una tienda específica
 * El usuario solo puede actualizar su propio número de teléfono
 */
export async function updateUserPhoneNumber(
  storeId: string,
  phoneNumber: string | null
): Promise<{
  id: string;
  userId: string;
  phoneNumber: string | null;
  isCreator: boolean;
  updatedAt: string;
}> {
  const { httpClient } = await import('@/lib/http/client');
  
  const response = await httpClient.put<{
    success: boolean;
    message: string;
    storeUser: {
      id: string;
      userId: string;
      phoneNumber: string | null;
      isCreator: boolean;
      updatedAt: string;
    };
  }>(`/api/stores/${storeId}/users/phone`, { phoneNumber });

  // Si hay un error en la respuesta, lanzarlo
  if (response.error || !response.success) {
    const errorMessage = response.error || response.message || 'Error al actualizar número de teléfono';
    throw new Error(errorMessage);
  }

  // Si la respuesta es exitosa pero no tiene datos, también es un error
  if (!response.data?.storeUser) {
    throw new Error('No se recibieron datos del número de teléfono actualizado');
  }

  return response.data.storeUser;
}

/**
 * Usuario de una tienda (con permisos si no es creador).
 */
export interface StoreUserRow {
  id: string;
  storeId: string;
  userId: string;
  isCreator: boolean;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string | null;
  userEmail: string;
  userName: string | null;
  userRole: string;
  /** Códigos de permiso asignados; null si es creador (tiene todos). */
  permissionCodes: string[] | null;
}

/**
 * Obtener todos los usuarios de una tienda
 * Solo el creador de la tienda o un admin pueden ver la lista de usuarios
 */
export async function getStoreUsers(storeId: string): Promise<StoreUserRow[]> {
  const { httpClient } = await import('@/lib/http/client');
  
  const response = await httpClient.get<{
    success: boolean;
    users: StoreUserRow[];
    count: number;
  }>(`/api/stores/${storeId}/users`);

  // Si hay un error en la respuesta, lanzarlo
  if (response.error || !response.success) {
    const errorMessage = response.error || 'Error al obtener usuarios de la tienda';
    throw new Error(errorMessage);
  }

  // Si la respuesta es exitosa pero no tiene datos, retornar array vacío
  return response.data?.users ?? [];
}
