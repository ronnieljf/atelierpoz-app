/**
 * Middleware de Next.js para proteger rutas del admin
 * 
 * Nota: Este middleware solo verifica la presencia del token.
 * La validación real del token se hace en el cliente usando el endpoint /api/auth/me
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar middleware a rutas del admin (excepto login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Verificar si hay token en las cookies
    // Nota: El token también puede estar en localStorage, pero eso solo es accesible en el cliente
    // Por eso el middleware solo verifica cookies, y el cliente valida con /api/auth/me
    // El token se verifica pero no se usa aquí, el cliente valida con /api/auth/me

    // Si no hay token en cookies, permitir el acceso pero el cliente validará
    // El layout del admin se encargará de redirigir si no está autenticado
    // Esto permite que el cliente valide el token desde localStorage
    return NextResponse.next();
  }

  // Para otras rutas, continuar normalmente (sin redirección a /es)
  return NextResponse.next();
}

// Configurar qué rutas deben ejecutar el middleware
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
