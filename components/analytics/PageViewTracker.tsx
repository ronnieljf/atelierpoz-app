'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics/gtag';

/**
 * Envía page_view a GA4 en cada cambio de ruta (solo rutas públicas, no admin).
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;

    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      trackPageView(pathname, typeof document !== 'undefined' ? document.title : undefined);
    }
  }, [pathname]);

  return null;
}
