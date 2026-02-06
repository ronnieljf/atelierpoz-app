/**
 * Configuración de idiomas soportados
 */

export const locales = ['es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
};

/**
 * Detecta el idioma preferido del usuario
 * Siempre retorna 'es' (español) como idioma por defecto
 */
export function detectLocale(): Locale {
  // Siempre retornar español
  return defaultLocale;
}
