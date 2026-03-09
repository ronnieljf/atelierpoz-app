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
  /** Suma de abonos registrados (solo en listado cuando el backend lo incluye). */
  totalPaid?: number;
  /** Nombres de productos resumidos (para el listado), si la cuenta viene de un pedido. */
  productNames?: string | null;
  /** Número de factura asociado (opcional). */
  invoiceNumber?: string | null;
  /** Fecha de vencimiento (opcional). */
  dueDate?: string | null;
}

/** Recordatorio programable por cuenta por cobrar */
export interface ReceivableReminder {
  id: string;
  receivableId: string;
  storeId: string;
  customerName: string | null;
  storeName: string | null;
  invoiceOrAccount: string | null;
  fechaVencimiento: string | null;
  datosPagomovil: string | null;
  datosTransferencia: string | null;
  datosBinance: string | null;
  datosContacto: string | null;
  fechaEnvio: string | null;
  /** true si es recordatorio por mora (atraso) */
  esMora?: boolean;
  /** Cuántas veces se repetirá automáticamente (0 = no repetir) */
  repetirVeces?: number;
  /** Cada cuántos días se repetirá (0 = no repetir) */
  repetirCadaDias?: number;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceivableReminderData {
  storeId: string;
  receivableId: string;
  fechaEnvio: string; // YYYY-MM-DD
  customerName?: string;
  storeName?: string;
  invoiceOrAccount?: string;
  fechaVencimiento?: string;
  datosPagomovil?: string;
  datosTransferencia?: string;
  datosBinance?: string;
  datosContacto?: string;
  esMora?: boolean;
  repetirVeces?: number;
  repetirCadaDias?: number;
}

export interface UpdateReceivableReminderData {
  storeId: string;
  customerName?: string;
  storeName?: string;
  invoiceOrAccount?: string;
  fechaVencimiento?: string;
  fechaEnvio?: string;
  datosPagomovil?: string;
  datosTransferencia?: string;
  datosBinance?: string;
  datosContacto?: string;
  esMora?: boolean;
  repetirVeces?: number;
  repetirCadaDias?: number;
  status?: 'pending' | 'sent' | 'cancelled';
}

export interface InitialPaymentData {
  amount: number;
  notes?: string;
  /** Comprobante opcional del abono inicial (imagen o PDF) */
  file?: File | null;
}

export interface CreateReceivableData {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  amount: number;
  currency?: string;
  invoiceNumber?: string;
  /** Fecha de vencimiento (YYYY-MM-DD) opcional */
  dueDate?: string | null;
  /** Abono inicial opcional al crear la cuenta */
  initialPayment?: InitialPaymentData;
  /** Comprobante opcional (imagen o PDF) sin abono. Si hay abono, se envía en initialPayment.file */
  file?: File | null;
}

export interface CreateReceivableFromRequestData {
  storeId: string;
  requestId: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  /** Monto total de la cuenta (por defecto el total del pedido). Permite ajustar sin modificar el pedido. */
  amount?: number;
  /** Número de factura asociado (opcional). */
  invoiceNumber?: string;
  /** Fecha de vencimiento (YYYY-MM-DD) opcional */
  dueDate?: string | null;
  /** Abono inicial opcional al crear la cuenta */
  initialPayment?: InitialPaymentData;
  /** Comprobante opcional (imagen o PDF) sin abono. Si hay abono, se envía en initialPayment.file */
  file?: File | null;
}

export interface UpdateReceivableData {
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  amount?: number;
  currency?: string;
  /** Fecha de vencimiento (YYYY-MM-DD) */
  dueDate?: string | null;
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
  /** Archivo opcional (comprobante de pago). Si se envía, se usa FormData. */
  file?: File | null;
}

/** Adjunto (comprobante) de una cuenta por cobrar */
export interface ReceivableAttachment {
  id: string;
  receivableId: string;
  paymentId: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
  createdBy?: string | null;
}
