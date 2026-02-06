/**
 * Cache en memoria para fetches de productos.
 * TTL: 1 minuto. Evita caché HTTP larga y unifica duración del cache.
 */

const TTL_MS = 60 * 1000; // 1 minuto

const cache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();

function isExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

export function getProductCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || isExpired(entry.expiresAt)) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setProductCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function productCacheKey(
  type: 'recent' | 'store' | 'product',
  ...parts: (string | number)[]
): string {
  return [type, ...parts.map(String)].join(':');
}
