/**
 * Configuración de idiomas soportados
 */

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

/**
 * Detecta el idioma preferido desde el header Accept-Language del navegador.
 * Si el navegador prefiere inglés, retorna 'en'; en caso contrario 'es'.
 */
export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  // Parsear: "en-US,en;q=0.9,es;q=0.8" -> priorizar idiomas soportados
  const parts = acceptLanguage.split(',').map((p) => p.trim().split(';')[0].split('-')[0]);
  for (const lang of parts) {
    if (lang === 'en') return 'en';
    if (lang === 'es') return 'es';
  }
  return defaultLocale;
}
