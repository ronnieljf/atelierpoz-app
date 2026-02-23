import { type Post } from '@/types/post';
import { httpClient } from '@/lib/http/client';

/**
 * Servicio para gestionar posts conectado al backend
 */

interface BackendPost {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  images: string[];
  selectedProducts: string[];
  platform: 'instagram';
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt?: string | null;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}

function formatPostFromAPI(post: BackendPost): Post {
  return {
    id: post.id,
    title: post.title,
    description: post.description || '',
    hashtags: post.hashtags || [],
    images: post.images || [],
    selectedProducts: post.selectedProducts || [],
    platform: post.platform,
    createdAt: post.createdAt,
    scheduledAt: post.scheduledAt || undefined,
    status: post.status,
    storeId: post.storeId,
  };
}

/**
 * Obtener todos los posts del usuario autenticado
 */
export async function getAllPosts(): Promise<Post[]> {
  try {
    const response = await httpClient.get<{ posts: BackendPost[] }>('/api/posts');
    
    if (response.success && response.data?.posts) {
      return response.data.posts.map(formatPostFromAPI);
    }
    return [];
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * Obtener un post por ID
 */
export async function getPostById(id: string): Promise<Post | null> {
  try {
    const response = await httpClient.get<{ post: BackendPost }>(`/api/posts/${id}`);
    
    if (response.success && response.data?.post) {
      return formatPostFromAPI(response.data.post);
    }
    return null;
  } catch (error) {
    console.error('Error loading post:', error);
    return null;
  }
}

/**
 * Crear un nuevo post
 * @param post - Datos del post
 * @param storeIdOverride - Si se indica, se usa esta tienda; si no, se usa la primera del usuario (localStorage)
 */
export async function createPost(
  post: Omit<Post, 'id' | 'createdAt'>,
  storeIdOverride?: string
): Promise<Post> {
  try {
    let storeId: string | undefined = storeIdOverride;

    if (storeId == null && typeof window !== 'undefined') {
      const authData = localStorage.getItem('admin_auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.stores && parsed.stores.length > 0) {
            storeId = parsed.stores[0].id;
          }
        } catch {
          // Ignorar error de parsing
        }
      }
    }

    const response = await httpClient.post<{ post: BackendPost }>('/api/posts', {
      title: post.title,
      description: post.description,
      hashtags: post.hashtags,
      images: post.images,
      selectedProducts: post.selectedProducts,
      platform: post.platform,
      status: post.status || 'draft',
      scheduledAt: post.scheduledAt,
      storeId,
    });
    
    if (response.success && response.data?.post) {
      return formatPostFromAPI(response.data.post);
    }
    
    throw new Error(response.error || 'Error al crear el post');
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Actualizar un post
 */
export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.hashtags !== undefined) updateData.hashtags = updates.hashtags;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.selectedProducts !== undefined) updateData.selectedProducts = updates.selectedProducts;
    if (updates.platform !== undefined) updateData.platform = updates.platform;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.scheduledAt !== undefined) updateData.scheduledAt = updates.scheduledAt;
    
    const response = await httpClient.put<{ post: BackendPost }>(`/api/posts/${id}`, updateData);
    
    if (response.success && response.data?.post) {
      return formatPostFromAPI(response.data.post);
    }
    
    return null;
  } catch (error) {
    console.error('Error updating post:', error);
    return null;
  }
}

/**
 * Eliminar un post
 */
export async function deletePost(id: string): Promise<boolean> {
  try {
    const response = await httpClient.delete(`/api/posts/${id}`);
    return response.success || false;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}

/**
 * Publicar un post en Instagram (requiere tener la cuenta conectada)
 */
export async function publishPostToInstagram(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await httpClient.post<{ message?: string; data?: { instagramMediaId?: string } }>(
      `/api/posts/${postId}/publish`
    );
    if (response.success) {
      return { success: true };
    }
    return {
      success: false,
      error: response.error || 'Error al publicar en Instagram',
    };
  } catch (error) {
    console.error('Error publishing post to Instagram:', error);
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : 'Error al publicar en Instagram';
    return { success: false, error: message };
  }
}
