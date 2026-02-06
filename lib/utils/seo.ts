/**
 * Utilidades para SEO y metadata (Open Graph, Twitter).
 * La imagen del logo se usa en todas las páginas que NO son de producto.
 * En /products/[id] se usa la imagen del producto.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

/** URL absoluta del logo para OG/Twitter. Usar solo en páginas que no son producto. */
export function getSeoLogoUrl(): string {
  return `${BASE_URL}/logo-atelier.png`;
}
