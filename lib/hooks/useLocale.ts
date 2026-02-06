'use client';

import { useParams } from 'next/navigation';
import { type Locale } from '@/constants/locales';

/**
 * Hook para obtener el locale actual en componentes del cliente
 */
export function useLocale(): Locale {
  const params = useParams();
  const locale = params.locale as Locale;
  
  return locale || 'en';
}
