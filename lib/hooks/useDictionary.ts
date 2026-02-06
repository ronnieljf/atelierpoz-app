'use client';

import { useMemo } from 'react';
import { type Dictionary } from '@/lib/i18n/dictionary';

/**
 * Hook para obtener el diccionario en componentes del cliente
 * Nota: Este hook requiere que el diccionario se pase como prop desde un Server Component
 * o que se use una estrategia diferente para cargar traducciones en el cliente
 */
export function useDictionary(dictionary: Dictionary): Dictionary {
  return useMemo(() => dictionary, [dictionary]);
}
