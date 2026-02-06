/**
 * Utilidad para combinar clases de Tailwind CSS
 * Nota: Instala clsx y tailwind-merge para usar la versión completa:
 * npm install clsx tailwind-merge
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
