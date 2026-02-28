/**
 * Middleware de Next.js:
 * - Admin: proteger rutas (validación en cliente)
 * - Público: detectar idioma del navegador y guardar en cookie para i18n
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  detectLocaleFromAcceptLanguage,
  type Locale,
} from '@/constants/locales';

const LOCALE_COOKIE = 'NEXT_LOCALE';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin: no aplicar i18n
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Rutas públicas: establecer cookie de locale si no existe
  const stored = request.cookies.get(LOCALE_COOKIE)?.value;
  if (stored !== 'en' && stored !== 'es') {
    const acceptLanguage = request.headers.get('accept-language');
    const locale: Locale = detectLocaleFromAcceptLanguage(acceptLanguage);
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 año
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|logo-atelier.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
