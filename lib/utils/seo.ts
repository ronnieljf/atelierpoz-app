/**
 * Utilidades para SEO y metadata (Open Graph, Twitter).
 * La imagen del logo se usa en todas las páginas que NO son de producto.
 * En /products/[id] se usa la imagen del producto.
 */

import type { Locale } from '@/constants/locales';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';

/** URL absoluta del logo para OG/Twitter. Usar solo en páginas que no son producto. */
export function getSeoLogoUrl(): string {
  return `${BASE_URL}/logo-atelier.png`;
}

/** URL base del sitio */
export function getBaseUrl(): string {
  return BASE_URL;
}

/** Locale Open Graph: es_ES, en_US */
export function getOgLocale(locale: Locale): string {
  return locale === 'es' ? 'es_ES' : 'en_US';
}

/** Locale alternates para Open Graph (otros idiomas disponibles) */
export function getOgAlternateLocales(locale: Locale): string[] {
  return locale === 'es' ? ['en_US'] : ['es_ES'];
}

/** Keywords SEO bilingües para mejor indexación en ES y EN */
export function getSeoKeywords(dict: { seo: { keywords: string; keywordsEn: string } }): string {
  return `${dict.seo.keywords}, ${dict.seo.keywordsEn}`;
}
