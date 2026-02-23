/**
 * Google Analytics (GA4) – helpers para enviar page_view y eventos.
 * Solo activo en producción (NEXT_PUBLIC_BACKEND_URL contiene atelierpoz.com).
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const isProductionAnalytics =
  typeof BACKEND_URL === 'string' && BACKEND_URL.includes('atelierpoz.com');

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-CXPECJE9Y8';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]): void {
  if (!isProductionAnalytics || typeof window === 'undefined' || !window.gtag) return;
  window.gtag(...args);
}

/** Enviar page_view (ruta y título opcional). */
export function trackPageView(path: string, title?: string): void {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? undefined,
    page_location: typeof window !== 'undefined' ? window.location.origin + path : undefined,
  });
}

/** Evento genérico. */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  gtag('event', eventName, params);
}

/** Usuario entró a la home / listado de tiendas. */
export function trackViewHome(): void {
  trackEvent('view_home', { page: 'home' });
}

/** Usuario entró a una tienda (página principal de la tienda). */
export function trackStoreView(storeId: string, storeName: string, storeSlug: string): void {
  gtag('event', 'view_store', {
    store_id: storeId,
    store_name: storeName,
    store_slug: storeSlug,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

/** Usuario entró a una categoría de una tienda. (view_item_list con ítems se envía desde CategoryViewTracker.) */
export function trackViewCategory(
  storeId: string,
  storeName: string,
  categoryName: string,
  categorySlug: string
): void {
  trackEvent('view_category', {
    store_id: storeId,
    store_name: storeName,
    category_name: categoryName,
    category_slug: categorySlug,
  });
}

/** Vista de detalle de un producto (GA4 view_item). */
export function trackViewItem(product: {
  id: string;
  name: string;
  price: number;
  currency?: string;
  category?: string;
  storeId?: string;
  storeName?: string;
}): void {
  const currency = product.currency || 'USD';
  gtag('event', 'view_item', {
    currency,
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1,
        item_category: product.category ?? undefined,
        item_brand: product.storeName ?? undefined,
      },
    ],
    store_id: product.storeId,
    store_name: product.storeName,
  });
}

/** Lista de productos vista (ej. en tienda o categoría). */
export function trackViewItemList(
  products: Array<{ id: string; name: string; price: number; category?: string; storeName?: string }>,
  listId: string,
  listName: string
): void {
  if (products.length === 0) return;
  gtag('event', 'view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items: products.slice(0, 20).map((p, index) => ({
      item_id: p.id,
      item_name: p.name,
      price: p.price,
      index,
      item_category: p.category ?? undefined,
      item_brand: p.storeName ?? undefined,
    })),
  });
}

/** Producto añadido al carrito (GA4 add_to_cart). */
export function trackAddToCart(
  item: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    currency?: string;
    category?: string;
    storeId?: string;
    storeName?: string;
  }
): void {
  const currency = item.currency || 'USD';
  const value = item.price * item.quantity;
  gtag('event', 'add_to_cart', {
    currency,
    value,
    items: [
      {
        item_id: item.productId,
        item_name: item.productName,
        price: item.price,
        quantity: item.quantity,
        item_category: item.category ?? undefined,
        item_brand: item.storeName ?? undefined,
      },
    ],
    store_id: item.storeId,
    store_name: item.storeName,
  });
}

/** Producto eliminado del carrito. */
export function trackRemoveFromCart(
  item: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    currency?: string;
    storeId?: string;
    storeName?: string;
  }
): void {
  const currency = item.currency || 'USD';
  const value = item.price * item.quantity;
  gtag('event', 'remove_from_cart', {
    currency,
    value,
    items: [
      {
        item_id: item.productId,
        item_name: item.productName,
        price: item.price,
        quantity: item.quantity,
        item_brand: item.storeName ?? undefined,
      },
    ],
    store_id: item.storeId,
    store_name: item.storeName,
  });
}

/** Usuario vio el carrito (GA4 view_cart). */
export function trackViewCart(params: {
  value: number;
  currency: string;
  itemCount: number;
  items: Array<{ productId: string; productName: string; quantity: number; price: number; storeName?: string }>;
}): void {
  gtag('event', 'view_cart', {
    currency: params.currency,
    value: params.value,
    item_count: params.itemCount,
    items: params.items.slice(0, 30).map((i) => ({
      item_id: i.productId,
      item_name: i.productName,
      price: i.price,
      quantity: i.quantity,
      item_brand: i.storeName ?? undefined,
    })),
  });
}

/** Usuario inició checkout (clic en WhatsApp / enviar pedido). */
export function trackBeginCheckout(params: {
  value: number;
  currency: string;
  itemCount: number;
  items: Array<{ productId: string; productName: string; quantity: number; price: number; storeName?: string }>;
  storeNames?: string[];
}): void {
  gtag('event', 'begin_checkout', {
    currency: params.currency,
    value: params.value,
    item_count: params.itemCount,
    items: params.items.slice(0, 30).map((i) => ({
      item_id: i.productId,
      item_name: i.productName,
      price: i.price,
      quantity: i.quantity,
      item_brand: i.storeName ?? undefined,
    })),
    store_names: params.storeNames,
  });
}

/** Búsqueda en tienda o global. */
export function trackSearch(searchTerm: string, storeId?: string, storeName?: string): void {
  trackEvent('search', {
    search_term: searchTerm,
    store_id: storeId,
    store_name: storeName,
  });
}
