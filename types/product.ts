/**
 * Tipos para productos y variantes
 */

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  price?: number; // Precio adicional si esta variante tiene costo extra
  stock: number;
  sku?: string;
  images?: string[]; // Imágenes específicas de esta variante
}

export interface ProductAttribute {
  id: string;
  name: string;
  type: 'color' | 'size' | 'text' | 'select';
  variants: ProductVariant[];
  required: boolean;
}

/** Una combinación de opciones (ej. Color Rojo + Talla M) con stock y precio propios */
export interface ProductCombination {
  id: string;
  /** Mapa attributeId -> variantId (ej. { 'attr-color': 'v-rojo', 'attr-talla': 'v-m' }) */
  selections: Record<string, string>;
  stock: number;
  priceModifier?: number;
  sku?: string;
  images?: string[];
}

export interface StoreUser {
  id: string;
  userId: string;
  isCreator: boolean;
  phoneNumber?: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  basePrice: number;
  currency: string;
  stock: number;
  sku: string;
  category: string;
  /** ID de categoría (la API puede devolverlo al cargar producto) */
  categoryId?: string;
  attributes: ProductAttribute[];
  /** Combinaciones (ej. Color × Talla) con stock/precio por combinación; si hay, la tienda usa estos en lugar de stock por opción */
  combinations?: ProductCombination[];
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  visibleInStore?: boolean; // Si el producto es visible en la tienda pública
  hidePrice?: boolean; // Si el precio debe ocultarse en la tienda pública
  sortOrder?: number | null; // Orden de visualización en la tienda (menor = primero)
  storeId?: string; // ID (UUID) de la tienda
  storeSlug?: string | null; // store_id (slug) para URL, ej. /mi-atelier
  storeName?: string; // Nombre de la tienda
  storeLogo?: string | null; // URL del logo de la tienda
  storeInstagram?: string; // Instagram de la tienda
  storeTiktok?: string | null; // TikTok de la tienda
  storePhoneNumber?: string; // Número de teléfono principal de la tienda
  storeUsers?: StoreUser[]; // Usuarios asociados a la tienda
}

export interface CartItem {
  id: string; // ID único del item en el carrito
  productId: string;
  productName: string;
  productImage: string;
  productSku: string; // Código del producto base
  basePrice: number;
  currency?: string; // Moneda del producto
  quantity: number;
  selectedVariants: {
    attributeId: string;
    attributeName: string;
    variantId: string;
    variantName: string;
    variantValue: string;
    variantSku?: string; // Código de la variante si existe
    variantImage?: string; // Imagen de la variante (si tiene)
    priceModifier?: number;
  }[];
  totalPrice: number;
  /** Si es true, el precio no se muestra en tienda y no se suma al total del carrito */
  hidePrice?: boolean;
  storeId: string; // ID de la tienda
  storeName: string; // Nombre de la tienda
  storeLogo?: string | null; // URL del logo de la tienda
  storeInstagram?: string; // Instagram de la tienda
  storeTiktok?: string | null; // TikTok de la tienda
  storePhoneNumber?: string; // Número de teléfono principal de la tienda para WhatsApp
  storeUsers?: StoreUser[]; // Todos los usuarios de la tienda con sus teléfonos
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}
