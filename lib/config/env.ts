/**
 * Configuración de variables de entorno
 * 
 * CONVENCIÓN DE NOMBRES EN NEXT.JS:
 * 
 * 1. Variables PRIVADAS (solo servidor):
 *    - Sin prefijo: GROK_API_KEY, DATABASE_URL, SECRET_KEY
 *    - Solo accesibles en: Server Components, API Routes, Server Actions
 *    - NO accesibles en Client Components
 * 
 * 2. Variables PÚBLICAS (cliente y servidor):
 *    - Con prefijo NEXT_PUBLIC_: NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_API_URL
 *    - Accesibles en: Cliente y servidor
 *    - Se inyectan en el bundle del cliente (visibles en el navegador)
 *    - ⚠️ NUNCA uses para claves secretas
 * 
 * REGLAS:
 * - Todas en MAYÚSCULAS
 * - Usa SNAKE_CASE (guiones bajos)
 * - Nombres descriptivos
 * 
 * Ejemplos:
 * ✅ GROK_API_KEY (privada)
 * ✅ NEXT_PUBLIC_BASE_URL (pública)
 * ❌ grokApiKey (minúsculas)
 * ❌ NEXT_PUBLIC_GROK_API_KEY (expondría la clave)
 */

export const env = {
  // Variables públicas (accesibles en cliente y servidor)
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com',
  
  // Variables privadas (solo servidor)
  grokApiKey: process.env.GROK_API_KEY || '',
} as const;

/**
 * Valida que las variables de entorno requeridas estén presentes
 */
export function validateEnv() {
  const requiredVars: string[] = [];
  
  // Agregar aquí las variables que son requeridas
  // if (!env.grokApiKey) {
  //   requiredVars.push('GROK_API_KEY');
  // }
  
  if (requiredVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${requiredVars.join(', ')}\n` +
      'Please check your .env file.'
    );
  }
}
