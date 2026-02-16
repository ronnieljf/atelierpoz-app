/**
 * Tipos para ventas (POS)
 */

export interface SaleItem {
  productId: string;
  combinationId?: string | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  currency?: string;
  /** Para cuenta por cobrar: CartItem.selectedVariants */
  selectedVariants?: { attributeId: string; attributeName: string; variantId: string; variantName: string; variantValue: string }[];
}

export interface Sale {
  id: string;
  storeId: string;
  clientId: string;
  saleNumber: number;
  items: SaleItem[];
  total: number;
  currency: string;
  status: 'completed' | 'refunded' | 'cancelled';
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Usuario que creó la venta */
  createdBy?: string | null;
  /** Usuario que última actualizó (ej. devolución/cancelación) */
  updatedBy?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  storeName?: string | null;
}

export interface POSProduct {
  productId: string;
  combinationId: string | null;
  productName: string;
  sku: string | null;
  unitPrice: number;
  /** Precio unitario con IVA incluido (unitPrice * (1 + iva/100)). Usar para totales en ventas. */
  unitPriceWithIva?: number;
  /** IVA en porcentaje (ej. 19, 13). */
  iva?: number;
  stock: number;
  displayName: string;
  currency: string;
  /** Para convertir a CartItem al crear request (cuenta por cobrar) */
  selectedVariants?: { attributeId: string; attributeName: string; variantId: string; variantName: string; variantValue: string }[];
  /** Precio extra de la variante respecto al producto base (solo variantes). */
  priceModifier?: number;
}

export interface CreateSaleData {
  storeId: string;
  clientId: string;
  items: SaleItem[];
  total: number;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
}
