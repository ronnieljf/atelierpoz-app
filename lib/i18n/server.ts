import { cookies, headers } from 'next/headers';
import {
  type Locale,
  defaultLocale,
  detectLocaleFromAcceptLanguage,
} from '@/constants/locales';

const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Obtiene el locale actual desde la petición:
 * 1. Cookie NEXT_LOCALE (si el usuario ya eligió o visitó antes)
 * 2. Header Accept-Language del navegador
 * 3. defaultLocale como fallback
 */
export async function getLocaleFromRequest(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (stored === 'en' || stored === 'es') return stored;

  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  return detectLocaleFromAcceptLanguage(acceptLanguage);
}

export { LOCALE_COOKIE };
