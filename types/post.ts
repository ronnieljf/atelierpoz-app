/**
 * Tipos para posts de redes sociales
 */

export interface Post {
  id: string;
  title: string;
  description: string;
  hashtags: string[];
  images: string[]; // URLs o base64, máximo 20
  selectedProducts: string[]; // IDs de productos, máximo 20
  platform: 'instagram' | 'facebook' | 'both';
  createdAt: string;
  scheduledAt?: string;
  status: 'draft' | 'published' | 'scheduled';
}

export interface PostFormData {
  title: string;
  description: string;
  hashtags: string;
  images: string[];
  selectedProducts: string[];
  platform: 'instagram' | 'facebook' | 'both';
  scheduledAt?: string;
}
