'use client';

import { useEffect, useRef } from 'react';
import { trackViewCategory, trackViewItemList } from '@/lib/analytics/gtag';
import type { Product } from '@/types/product';

interface CategoryViewTrackerProps {
  storeId: string;
  storeName: string;
  categoryName: string;
  categorySlug: string;
  products?: Product[];
}

/**
 * Envía view_category y view_item_list al entrar a una categoría de una tienda.
 */
export function CategoryViewTracker({
  storeId,
  storeName,
  categoryName,
  categorySlug,
  products = [],
}: CategoryViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackViewCategory(storeId, storeName, categoryName, categorySlug);
    if (products.length > 0) {
      const basePrice = (p: Product) =>
        typeof p.basePrice === 'number' ? p.basePrice : parseFloat(String((p as { base_price?: string }).base_price ?? 0)) || 0;
      trackViewItemList(
        products.map((p) => ({
          id: p.id,
          name: p.name,
          price: basePrice(p),
          category: p.category,
          storeName: p.storeName ?? storeName,
        })),
        categorySlug,
        categoryName
      );
    }
  }, [storeId, storeName, categoryName, categorySlug, products]);
  return null;
}
