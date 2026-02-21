/**
 * Tipos para gastos / cuentas por pagar (expenses)
 */

export type ExpenseStatus = 'pending' | 'paid' | 'cancelled';

export interface Expense {
  id: string;
  storeId: string;
  expenseNumber: number;
  createdBy: string;
  updatedBy?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  description?: string | null;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseData {
  storeId: string;
  categoryId?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  description?: string | null;
  amount: number;
  currency?: string;
  dueDate?: string | null;
}

export interface UpdateExpenseData {
  storeId: string;
  categoryId?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  description?: string | null;
  amount?: number;
  currency?: string;
  status?: ExpenseStatus;
  dueDate?: string | null;
}

export interface ExpensePayment {
  id: string;
  expenseId: string;
  amount: number;
  currency: string;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface CreateExpensePaymentData {
  storeId: string;
  amount: number;
  currency?: string;
  notes?: string;
}

/**
 * Categorías financieras (income o expense)
 */
export interface FinanceCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}
