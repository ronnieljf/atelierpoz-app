import { type Product, type StoreUser, type ProductAttribute } from '@/types/product';
import { httpClient } from '@/lib/http/client';
import {
  getProductCache,
  setProductCache,
  productCacheKey,
} from '@/lib/utils/product-fetch-cache';

// Interfaces para datos del backend
interface BackendProduct {
  id: string;
  name: string;
  description?: string;
  base_price?: number;
  basePrice?: number;
  currency?: string;
  stock?: number;
  sku?: string;
  category?: string;
  category_id?: string;
  categoryId?: string;
  category_slug?: string;
  images?: string[];
  attributes?: unknown[];
  combinations?: unknown[];
  rating?: number;
  review_count?: number;
  reviewCount?: number;
  tags?: string[];
  visible_in_store?: boolean;
  visibleInStore?: boolean;
  hide_price?: boolean;
  hidePrice?: boolean;
  sort_order?: number | null;
  sortOrder?: number | null;
  iva?: number;
  store_id?: string;
  storeId?: string;
  store_slug?: string | null;
  storeSlug?: string | null;
  store_name?: string;
  storeName?: string;
  store_logo?: string | null;
  storeLogo?: string | null;
  store_instagram?: string;
  storeInstagram?: string;
  store_tiktok?: string | null;
  storeTiktok?: string | null;
  store_phone_number?: string;
  storePhoneNumber?: string;
  store_users?: BackendStoreUser[];
  storeUsers?: BackendStoreUser[];
  created_at?: string;
  updated_at?: string;
}

interface BackendStoreUser {
  id: string;
  user_id?: string;
  userId?: string;
  is_creator?: boolean;
  isCreator?: boolean;
  phone_number?: string;
  phoneNumber?: string;
  created_at?: string;
  createdAt?: string;
  user_name?: string;
  userName?: string;
  user_email?: string;
  userEmail?: string;
}

/**
 * Servicio para gestionar productos usando la API del backend
 */

export interface ProductsResponse {
  products: Product[];
  total: number;
  count: number;
}

export interface RecentProductsParams {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Obtener productos más recientes (público, sin autenticación)
 * @param {number} limit - Número máximo de productos a retornar (default: 20)
 * @param {number} offset - Offset para paginación (default: 0)
 * @param {string} search - Búsqueda opcional
 * @param {object} params - categoryId, minPrice, maxPrice opcionales
 */
export async function getRecentProducts(
  limit: number = 20,
  offset: number = 0,
  search?: string,
  params?: RecentProductsParams
): Promise<ProductsResponse> {
  const categoryId = params?.categoryId;
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;
  const cacheKey = productCacheKey('recent', limit, offset, [search ?? '', categoryId ?? '', minPrice ?? '', maxPrice ?? ''].join('|'));
  const cached = getProductCache<ProductsResponse>(cacheKey);
  if (cached) return cached;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const sp = new URLSearchParams();
    sp.set('limit', String(limit));
    sp.set('offset', String(offset));
    if (search?.trim()) sp.set('search', search.trim());
    if (categoryId?.trim()) sp.set('categoryId', categoryId.trim());
    if (minPrice != null && !Number.isNaN(minPrice)) sp.set('minPrice', String(minPrice));
    if (maxPrice != null && !Number.isNaN(maxPrice)) sp.set('maxPrice', String(maxPrice));
    const response = await fetch(`${backendUrl}/api/products/recent?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let result: ProductsResponse;

    if (data.success && data.products) {
      const formattedProducts = data.products.map(formatProductFromAPI);
      result = {
        products: formattedProducts,
        total: data.total || formattedProducts.length,
        count: data.count || formattedProducts.length,
      };
    } else {
      result = { products: [], total: 0, count: 0 };
    }

    setProductCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error obteniendo productos recientes:', error);
    return { products: [], total: 0, count: 0 };
  }
}

/**
 * Obtener todos los productos de una tienda (sin paginación; devuelve todos)
 */
export async function getAllProducts(storeId: string): Promise<Product[]> {
  try {
    const response = await httpClient.get<{
      success: boolean;
      products: BackendProduct[];
    }>(`/api/products?storeId=${storeId}`);

    if (response.success && response.data?.products) {
      return response.data.products.map(formatProductFromAPI);
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }
}

export interface AdminProductsParams {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Obtener productos de una tienda (admin) con paginación y filtros
 */
export async function getAdminProducts(
  storeId: string,
  params: AdminProductsParams = {}
): Promise<ProductsResponse> {
  try {
    const { limit = 20, offset = 0, search, categoryId, minPrice, maxPrice } = params;
    const sp = new URLSearchParams();
    sp.set('storeId', storeId);
    sp.set('limit', String(limit));
    sp.set('offset', String(offset));
    if (search != null && search.trim()) sp.set('search', search.trim());
    if (categoryId != null && categoryId.trim()) sp.set('categoryId', categoryId.trim());
    if (minPrice != null && !Number.isNaN(minPrice)) sp.set('minPrice', String(minPrice));
    if (maxPrice != null && !Number.isNaN(maxPrice)) sp.set('maxPrice', String(maxPrice));

    const response = await httpClient.get<{
      success: boolean;
      products: BackendProduct[];
      total: number;
      count: number;
    }>(`/api/products/admin?${sp.toString()}`);

    if (response.success && response.data?.products) {
      return {
        products: response.data.products.map(formatProductFromAPI),
        total: response.data.total ?? response.data.products.length,
        count: response.data.count ?? response.data.products.length,
      };
    }
    return { products: [], total: 0, count: 0 };
  } catch (error) {
    console.error('Error obteniendo productos (admin):', error);
    return { products: [], total: 0, count: 0 };
  }
}

export interface StoreProductsParams {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Obtener productos de una tienda específica (público, sin autenticación)
 * @param {string} storeId - ID de la tienda
 * @param {number} limit - Número máximo de productos a retornar (default: 50)
 * @param {number} offset - Offset para paginación (default: 0)
 * @param {string} search - Búsqueda opcional
 * @param {object} params - categoryId, minPrice, maxPrice opcionales
 */
export async function getStoreProducts(
  storeId: string,
  limit: number = 50,
  offset: number = 0,
  search?: string,
  params?: StoreProductsParams
): Promise<ProductsResponse> {
  const categoryId = params?.categoryId;
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;
  const cacheKey = productCacheKey('store', storeId, limit, offset, [search ?? '', categoryId ?? '', minPrice ?? '', maxPrice ?? ''].join('|'));
  const cached = getProductCache<ProductsResponse>(cacheKey);
  if (cached) return cached;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const sp = new URLSearchParams();
    sp.set('limit', String(limit));
    sp.set('offset', String(offset));
    if (search?.trim()) sp.set('search', search.trim());
    if (categoryId?.trim()) sp.set('categoryId', categoryId.trim());
    if (minPrice != null && !Number.isNaN(minPrice)) sp.set('minPrice', String(minPrice));
    if (maxPrice != null && !Number.isNaN(maxPrice)) sp.set('maxPrice', String(maxPrice));
    const response = await fetch(`${backendUrl}/api/products/store/${storeId}?${sp.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let result: ProductsResponse;

    if (data.success && data.products) {
      const formattedProducts = data.products.map(formatProductFromAPI);
      result = {
        products: formattedProducts,
        total: data.total || formattedProducts.length,
        count: data.count || formattedProducts.length,
      };
    } else {
      result = { products: [], total: 0, count: 0 };
    }

    setProductCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error obteniendo productos de la tienda:', error);
    return { products: [], total: 0, count: 0 };
  }
}

/**
 * Obtener un producto por ID (público, sin autenticación)
 */
export async function getProductByIdPublic(id: string): Promise<Product | null> {
  const cacheKey = productCacheKey('product', id);
  const cached = getProductCache<{ value: Product | null }>(cacheKey);
  if (cached) return cached.value;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${backendUrl}/api/products/public/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        setProductCache(cacheKey, { value: null });
        return null;
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const value: Product | null = data.success && data.product
      ? formatProductFromAPI(data.product)
      : null;
    setProductCache(cacheKey, { value });
    return value;
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    return null;
  }
}

/**
 * Obtener un producto por ID (requiere autenticación y storeId)
 */
export async function getProductById(id: string, storeId: string): Promise<Product | null> {
  try {
    const response = await httpClient.get<{
      success: boolean;
      product: BackendProduct;
    }>(`/api/products/${id}?storeId=${storeId}`);

    if (response.success && response.data?.product) {
      return formatProductFromAPI(response.data.product);
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    return null;
  }
}

/**
 * Crear un nuevo producto
 */
export async function createProduct(product: Product & { storeId: string; categoryId: string; visibleInStore?: boolean }): Promise<Product> {
  try {
    const response = await httpClient.post<{
      success: boolean;
      product: BackendProduct;
      error?: string;
    }>('/api/products', {
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      currency: product.currency,
      stock: product.stock,
      sku: product.sku,
      categoryId: product.categoryId,
      storeId: product.storeId,
      images: product.images,
      attributes: product.attributes,
      combinations: product.combinations ?? [],
      rating: product.rating,
      reviewCount: product.reviewCount,
      tags: product.tags,
      visibleInStore: product.visibleInStore,
      sortOrder: (product as { sortOrder?: number | null }).sortOrder ?? undefined,
      iva: (product as { iva?: number }).iva != null && !Number.isNaN(Number((product as { iva?: number }).iva)) ? Number((product as { iva?: number }).iva) : undefined,
    });

    if (response.success && response.data?.product) {
      return formatProductFromAPI(response.data.product);
    }
    
    // Si hay un error específico del backend, usarlo
    const errorMessage = response.error || response.data?.error || 'Error al crear producto';
    throw new Error(errorMessage);
  } catch (error) {
    console.error('Error creando producto:', error);
    // Si el error ya es un Error con mensaje, re-lanzarlo
    if (error instanceof Error) {
      throw error;
    }
    // Si es un error del httpClient, extraer el mensaje
    if (typeof error === 'object' && error !== null && 'error' in error) {
      throw new Error(String(error.error));
    }
    throw new Error('Error al crear producto');
  }
}

/**
 * Actualizar un producto
 */
export async function updateProduct(
  id: string,
  updates: Partial<Product> & { storeId: string; categoryId?: string }
): Promise<Product | null> {
  try {
    const { storeId, ...restUpdates } = updates;
    const updateData: Record<string, unknown> = {
      storeId,
      ...restUpdates,
    };

    // Convertir category slug a categoryId si es necesario
    if (updates.category && !updates.categoryId) {
      // En este caso, el backend espera categoryId, pero el frontend usa slug
      // Necesitamos obtener el categoryId desde el slug
      // Por ahora, asumimos que el backend maneja esto
      updateData.categoryId = updates.category;
    }

    const response = await httpClient.put<{
      success: boolean;
      product: BackendProduct;
      error?: string;
    }>(`/api/products/${id}`, updateData);

    if (response.success && response.data?.product) {
      return formatProductFromAPI(response.data.product);
    }
    
    // Si hay un error específico del backend, lanzarlo
    const errorMessage = response.error || response.data?.error || 'Error al actualizar producto';
    throw new Error(errorMessage);
  } catch (error) {
    console.error('Error actualizando producto:', error);
    if (error instanceof Error) {
      throw error;
    }
    if (typeof error === 'object' && error !== null && 'error' in error) {
      throw new Error(String(error.error));
    }
    throw new Error('Error al actualizar producto');
  }
}

/**
 * Eliminar un producto
 */
export async function deleteProduct(id: string, storeId: string): Promise<boolean> {
  try {
    const response = await httpClient.delete<{
      success: boolean;
    }>(`/api/products/${id}?storeId=${storeId}`);

    return response.success || false;
  } catch (error) {
    console.error('Error eliminando producto:', error);
    return false;
  }
}

/**
 * Poner el stock de un producto en 0
 */
export async function setProductOutOfStock(id: string, storeId: string): Promise<Product | null> {
  try {
    const response = await httpClient.put<{
      success: boolean;
      product: BackendProduct;
    }>(`/api/products/${id}/out_stock?storeId=${storeId}`);

    if (response.success && response.data?.product) {
      return formatProductFromAPI(response.data.product);
    }
    return null;
  } catch (error) {
    console.error('Error poniendo producto fuera de stock:', error);
    throw error;
  }
}

/**
 * Mover un producto un lugar arriba o abajo en el orden de la tienda.
 */
export async function reorderProductMove(
  storeId: string,
  productId: string,
  direction: 'up' | 'down'
): Promise<{ success: boolean; updated?: number }> {
  try {
    const response = await httpClient.post<{
      success: boolean;
      updated?: number;
    }>('/api/products/reorder', {
      storeId,
      productId,
      direction,
    });
    return {
      success: response.success ?? false,
      updated: response.data?.updated,
    };
  } catch (error) {
    console.error('Error reordenando producto:', error);
    throw error;
  }
}

/**
 * Formatear producto desde la API al formato del frontend
 */
function formatProductFromAPI(product: BackendProduct): Product & { storeId?: string; categoryId?: string } {
  // Formatear store_users si vienen del backend
  let storeUsers: StoreUser[] = [];
  const rawStoreUsers = product.storeUsers || product.store_users || [];
  if (Array.isArray(rawStoreUsers) && rawStoreUsers.length > 0) {
    // Si vienen en formato del backend (snake_case), convertirlos a camelCase
    // Y filtrar solo los que tienen phoneNumber válido
    storeUsers = rawStoreUsers
      .map((su: BackendStoreUser) => ({
        id: su.id,
        userId: su.user_id || su.userId || '',
        isCreator: su.is_creator || su.isCreator || false,
        phoneNumber: su.phone_number || su.phoneNumber,
        createdAt: su.created_at || su.createdAt || new Date().toISOString(),
        userName: su.user_name || su.userName,
        userEmail: su.user_email || su.userEmail,
      }))
      .filter((su: StoreUser) => su.phoneNumber && su.phoneNumber.trim() !== '');
  }
  
  // Formatear attributes correctamente
  let formattedAttributes: ProductAttribute[] = [];
  if (Array.isArray(product.attributes) && product.attributes.length > 0) {
    formattedAttributes = product.attributes.map((attr: unknown) => {
      const attribute = attr as ProductAttribute;
      return {
        id: attribute.id || '',
        name: attribute.name || '',
        type: attribute.type || 'select',
        required: attribute.required ?? false,
        variants: Array.isArray(attribute.variants) ? attribute.variants : [],
      };
    });
  }

  // Formatear combinations
  let formattedCombinations: Product['combinations'] = [];
  if (Array.isArray(product.combinations) && product.combinations.length > 0) {
    formattedCombinations = product.combinations.map((c: unknown) => {
      const combo = c as { id?: string; selections?: Record<string, string>; stock?: number; priceModifier?: number; sku?: string; images?: string[] };
      return {
        id: combo.id || '',
        selections: combo.selections && typeof combo.selections === 'object' ? combo.selections : {},
        stock: typeof combo.stock === 'number' ? combo.stock : parseInt(String(combo.stock ?? 0), 10) || 0,
        priceModifier: typeof combo.priceModifier === 'number' ? combo.priceModifier : undefined,
        sku: combo.sku,
        images: Array.isArray(combo.images) ? combo.images : undefined,
      };
    });
  }
  
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    basePrice: (() => {
      const raw = product.basePrice ?? product.base_price;
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0));
      return Number.isNaN(n) ? 0 : n;
    })(),
    currency: product.currency || 'USD',
    stock: product.stock || 0,
    sku: product.sku || '',
    category: product.category || product.category_slug || '',
    images: Array.isArray(product.images) ? product.images : [],
    attributes: formattedAttributes,
    combinations: formattedCombinations,
    rating: product.rating,
    reviewCount: product.reviewCount || product.review_count,
    tags: Array.isArray(product.tags) ? product.tags : [],
    visibleInStore: product.visibleInStore === true || product.visible_in_store === true,
    hidePrice: product.hidePrice === true || product.hide_price === true,
    sortOrder: product.sortOrder ?? product.sort_order ?? undefined,
    iva: product.iva != null && !Number.isNaN(Number(product.iva)) ? Number(product.iva) : undefined,
    storeId: product.storeId || product.store_id,
    storeSlug: (product.storeSlug ?? product.store_slug) || undefined,
    storeName: product.storeName || product.store_name,
    storeLogo: (product.storeLogo ?? product.store_logo) || undefined,
    storeInstagram: (product.storeInstagram || product.store_instagram)?.trim() || undefined,
    storeTiktok: (product.storeTiktok ?? product.store_tiktok)?.trim() || undefined,
    storePhoneNumber: product.storePhoneNumber || product.store_phone_number,
    storeUsers: storeUsers,
    categoryId: product.categoryId || product.category_id,
  };
}

/**
 * Convierte un archivo a base64 para almacenamiento
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Valida que un archivo sea una imagen
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}
