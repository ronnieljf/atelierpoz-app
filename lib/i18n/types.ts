import { type Dictionary } from './dictionary';

/**
 * Tipos auxiliares para trabajar con traducciones
 */
export type { Dictionary };

/**
 * Helper type para obtener el tipo de una sección específica del diccionario
 */
export type DictionarySection<T extends keyof Dictionary> = Dictionary[T];
