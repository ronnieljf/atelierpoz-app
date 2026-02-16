/**
 * Tipos para cuentas por cobrar (receivables)
 */

export type ReceivableStatus = 'pending' | 'paid' | 'cancelled';

export interface Receivable {
  id: string;
  storeId: string;
  receivableNumber?: number | null;
  createdBy: string;
  /** Usuario que última actualizó el registro */
  updatedBy?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  customerName: string | null;
  customerPhone: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: ReceivableStatus;
  requestId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  storeName?: string;
  /** Número de productos (líneas) cuando la cuenta viene de un pedido; null si es manual o no aplica. */
  itemsCount?: number | null;
  /** Número de pedido (order_number del request vinculado) cuando la cuenta viene de un pedido. */
  orderNumber?: number | null;
}

export interface InitialPaymentData {
  amount: number;
  notes?: string;
}

export interface CreateReceivableData {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  amount: number;
  currency?: string;
  /** Abono inicial opcional al crear la cuenta */
  initialPayment?: InitialPaymentData;
}

export interface CreateReceivableFromRequestData {
  storeId: string;
  requestId: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  /** Monto total de la cuenta (por defecto el total del pedido). Permite ajustar sin modificar el pedido. */
  amount?: number;
  /** Abono inicial opcional al crear la cuenta */
  initialPayment?: InitialPaymentData;
}

export interface UpdateReceivableData {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  amount?: number;
  currency?: string;
  status?: ReceivableStatus;
}

/** Abono (pago parcial) de una cuenta por cobrar */
export interface ReceivablePayment {
  id: string;
  receivableId: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface CreateReceivablePaymentData {
  storeId: string;
  amount: number;
  currency?: string;
  notes?: string;
}
