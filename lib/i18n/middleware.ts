import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/constants/locales';

export function i18nMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Excluir rutas del admin del sistema de locales
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Verificar si la ruta ya tiene un locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Si ya tiene locale, continuar
  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Siempre usar español como idioma por defecto
  const locale = defaultLocale;

  // Redirigir a la ruta con el locale
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  newUrl.search = request.nextUrl.search;

  return NextResponse.redirect(newUrl);
}
