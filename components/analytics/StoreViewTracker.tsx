'use client';

import { useEffect, useRef } from 'react';
import { trackStoreView, trackViewItemList } from '@/lib/analytics/gtag';
import type { Product } from '@/types/product';

interface StoreViewTrackerProps {
  storeId: string;
  storeName: string;
  storeSlug: string;
  products?: Product[];
}

/**
 * Envía view_store y opcionalmente view_item_list al entrar a la página de una tienda.
 */
export function StoreViewTracker({ storeId, storeName, storeSlug, products = [] }: StoreViewTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackStoreView(storeId, storeName, storeSlug);
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
        `store_${storeId}`,
        storeName
      );
    }
  }, [storeId, storeName, storeSlug, products]);
  return null;
}
