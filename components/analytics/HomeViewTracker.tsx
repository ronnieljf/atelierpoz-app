'use client';

import { useEffect, useRef } from 'react';
import { trackViewHome } from '@/lib/analytics/gtag';

/**
 * Envía view_home cuando el usuario está en la página de inicio.
 */
export function HomeViewTracker() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackViewHome();
  }, []);
  return null;
}
