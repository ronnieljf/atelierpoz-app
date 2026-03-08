import type { Product } from '@/types/product';

/**
 * Obtiene el rango de precios (min, max) cuando un producto tiene variantes
 * o combinaciones con precios distintos.
 * Retorna null si hay un solo precio o si hidePrice.
 */
export function getProductPriceRange(product: Product): { min: number; max: number } | null {
  if (product.hidePrice) return null;

  const base = typeof product.basePrice === 'number' ? product.basePrice : parseFloat(String(product.basePrice ?? 0)) || 0;
  const prices: number[] = [];

  if (product.combinations && product.combinations.length > 0) {
    product.combinations.forEach((combo) => {
      const mod = typeof combo.priceModifier === 'number' ? combo.priceModifier : parseFloat(String(combo.priceModifier ?? 0)) || 0;
      prices.push(base + mod);
    });
  } else if (product.attributes && product.attributes.length > 0) {
    let sumMin = 0;
    let sumMax = 0;
    for (const attr of product.attributes) {
      const mods = attr.variants.map((v) =>
        typeof v.price === 'number' ? v.price : parseFloat(String(v.price ?? 0)) || 0
      );
      if (mods.length > 0) {
        sumMin += Math.min(...mods);
        sumMax += Math.max(...mods);
      }
    }
    prices.push(base + sumMin, base + sumMax);
  } else {
    return null;
  }

  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return null;
  return { min, max };
}
