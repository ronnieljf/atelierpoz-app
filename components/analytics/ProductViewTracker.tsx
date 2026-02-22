'use client';

import { useEffect, useRef } from 'react';
import { trackViewItem } from '@/lib/analytics/gtag';
import type { Product } from '@/types/product';

interface ProductViewTrackerProps {
  product: Product;
}

/**
 * Envía view_item al ver el detalle de un producto.
 */
export function ProductViewTracker({ product }: ProductViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current || !product?.id) return;
    sentRef.current = true;
    const basePrice =
      typeof product.basePrice === 'number'
        ? product.basePrice
        : parseFloat(String((product as { base_price?: string }).base_price ?? 0)) || 0;
    trackViewItem({
      id: product.id,
      name: product.name,
      price: basePrice,
      currency: product.currency ?? 'USD',
      category: product.category,
      storeId: product.storeId,
      storeName: product.storeName ?? undefined,
    });
  }, [product]);
  return null;
}
