'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Envuelve el contenido con una transición suave al cambiar de ruta.
 * Usa solo CSS para no cargar framer-motion en rutas críticas (login, etc.).
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-transition-in w-full">
      {children}
    </div>
  );
}
