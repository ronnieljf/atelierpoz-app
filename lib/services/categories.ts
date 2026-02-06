import { httpClient } from '@/lib/http/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  store_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Servicio para gestionar categorías globales usando la API del backend
 */

/**
 * Obtener todas las categorías globales (público; para admin u otros usos)
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/categories`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (data?.success && Array.isArray(data.categories)) {
      return data.categories;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return [];
  }
}

/**
 * Obtener categorías de una tienda (público — para filtro en la página de la tienda)
 */
export async function getCategoriesByStore(storeId: string): Promise<Category[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/stores/public/${encodeURIComponent(storeId)}/categories`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (data?.success && Array.isArray(data.categories)) {
      return data.categories;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo categorías de la tienda:', error);
    return [];
  }
}

/**
 * Listar categorías creadas por la tienda (admin, requiere auth).
 * Solo devuelve categorías con store_id = storeId.
 */
export async function getCategoriesForAdmin(storeId: string): Promise<Category[]> {
  const response = await httpClient.get<{ success: boolean; categories: Category[] }>(
    `/api/categories/by-store?storeId=${encodeURIComponent(storeId)}`
  );
  if (response.success && response.data?.categories) {
    return response.data.categories;
  }
  return [];
}

/**
 * Crear una nueva categoría (asociada a una tienda; slug opcional)
 */
export async function createCategory(data: {
  name: string;
  slug?: string;
  storeId: string;
}): Promise<Category> {
  const response = await httpClient.post<{
    success: boolean;
    category: Category;
  }>('/api/categories', {
    name: data.name,
    slug: data.slug ?? undefined,
    storeId: data.storeId,
  });
  if (response.success && response.data?.category) {
    return response.data.category;
  }
  throw new Error(
    (response as { error?: string }).error ?? 'Error al crear categoría'
  );
}

/**
 * Actualizar una categoría
 */
export async function updateCategory(
  id: string,
  data: { name?: string; slug?: string }
): Promise<Category | null> {
  const response = await httpClient.put<{
    success: boolean;
    category: Category;
  }>(`/api/categories/${id}`, data);
  if (response.success && response.data?.category) {
    return response.data.category;
  }
  return null;
}

/**
 * Eliminar una categoría
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const response = await httpClient.delete<{ success: boolean }>(
    `/api/categories/${id}`
  );
  return response.success ?? false;
}
