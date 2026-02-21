/**
 * Tipos para compras al contado (purchases) — espejo de sale.ts
 */

export type PurchaseStatus = 'completed' | 'refunded' | 'cancelled';

export interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  storeId: string;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  createdBy: string;
  createdByName?: string | null;
  purchaseNumber: number;
  categoryId?: string | null;
  categoryName?: string | null;
  description?: string | null;
  items: PurchaseItem[];
  total: number;
  currency: string;
  status: PurchaseStatus;
  paymentMethod?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseData {
  storeId: string;
  vendorId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  items: PurchaseItem[];
  total: number;
  currency?: string;
  paymentMethod?: string | null;
  notes?: string | null;
}
