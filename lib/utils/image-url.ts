/**
 * Resuelve URLs de imagen para mostrarlas correctamente.
 * Si el backend devuelve una URL relativa (ej. /uploads/...), la convierte a absoluta
 * usando la base del backend.
 */
const BACKEND_BASE =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '')
    : '';

export function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!BACKEND_BASE) return url; // sin backend configurado, devolver tal cual (puede fallar)
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_BASE}${path}`;
}
