/**
 * Servicio de gastos / cuentas por pagar (expenses)
 */

import { httpClient } from '@/lib/http/client';
import type { Expense, ExpensePayment, CreateExpenseData, UpdateExpenseData, CreateExpensePaymentData } from '@/types/expense';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiExpense = Record<string, any>;
type ApiPayment = Record<string, any>;

function formatExpense(r: ApiExpense): Expense {
  return {
    id: r.id,
    storeId: r.storeId ?? r.store_id,
    expenseNumber: parseInt(r.expenseNumber ?? r.expense_number, 10),
    createdBy: r.createdBy ?? r.created_by,
    updatedBy: r.updatedBy ?? r.updated_by ?? null,
    createdByName: r.createdByName ?? r.created_by_name ?? null,
    updatedByName: r.updatedByName ?? r.updated_by_name ?? null,
    categoryId: r.categoryId ?? r.category_id ?? null,
    categoryName: r.categoryName ?? r.category_name ?? null,
    categoryColor: r.categoryColor ?? r.category_color ?? null,
    vendorId: r.vendorId ?? r.vendor_id ?? null,
    vendorName: r.vendorName ?? r.vendor_name ?? null,
    vendorPhone: r.vendorPhone ?? r.vendor_phone ?? null,
    description: r.description ?? null,
    amount: parseFloat(r.amount),
    currency: r.currency || 'USD',
    status: r.status,
    dueDate: r.dueDate ?? r.due_date ?? null,
    paidAt: r.paidAt ?? r.paid_at ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
    totalPaid:
      typeof r.totalPaid === 'number'
        ? r.totalPaid
        : typeof r.total_paid === 'number'
          ? r.total_paid
          : typeof r.total_paid === 'string'
            ? parseFloat(r.total_paid)
            : undefined,
  };
}

function formatPayment(r: ApiPayment): ExpensePayment {
  return {
    id: r.id,
    expenseId: r.expenseId ?? r.expense_id,
    amount: parseFloat(r.amount),
    currency: r.currency || 'USD',
    notes: r.notes ?? null,
    createdBy: r.createdBy ?? r.created_by ?? null,
    createdByName: r.createdByName ?? r.created_by_name ?? null,
    createdAt: r.createdAt ?? r.created_at,
  };
}

export async function getExpenses(
  storeId: string,
  options?: { status?: string; categoryId?: string; limit?: number; offset?: number }
): Promise<{ expenses: Expense[]; total: number }> {
  const params = new URLSearchParams();
  params.set('storeId', storeId);
  if (options?.status) params.set('status', options.status);
  if (options?.categoryId) params.set('categoryId', options.categoryId);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const response = await httpClient.get<{ success: boolean; expenses: ApiExpense[]; total: number }>(
    `/api/expenses?${params.toString()}`
  );
  if (response.success && response.data) {
    return {
      expenses: (response.data.expenses || []).map(formatExpense),
      total: response.data.total ?? 0,
    };
  }
  return { expenses: [], total: 0 };
}

export async function getPendingTotal(storeId: string): Promise<{ currency: string; total: number }[]> {
  const response = await httpClient.get<{ success: boolean; totals: { currency: string; total: number }[] }>(
    `/api/expenses/pending-total?storeId=${storeId}`
  );
  return response.success && response.data?.totals ? response.data.totals : [];
}

export async function getExpenseById(expenseId: string, storeId: string): Promise<Expense | null> {
  const response = await httpClient.get<{ success: boolean; expense: ApiExpense }>(
    `/api/expenses/${expenseId}?storeId=${storeId}`
  );
  return response.success && response.data?.expense ? formatExpense(response.data.expense) : null;
}

export async function createExpense(data: CreateExpenseData): Promise<Expense> {
  const response = await httpClient.post<{ success: boolean; expense: ApiExpense }>('/api/expenses', data);
  if (!response.success || !response.data?.expense) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear gasto');
  }
  return formatExpense(response.data.expense);
}

export async function updateExpense(expenseId: string, data: UpdateExpenseData): Promise<Expense> {
  const response = await httpClient.put<{ success: boolean; expense: ApiExpense }>(`/api/expenses/${expenseId}`, data);
  if (!response.success || !response.data?.expense) {
    throw new Error((response as { error?: string }).error ?? 'Error al actualizar gasto');
  }
  return formatExpense(response.data.expense);
}

export async function getExpensePayments(expenseId: string): Promise<ExpensePayment[]> {
  const response = await httpClient.get<{ success: boolean; payments: ApiPayment[] }>(
    `/api/expenses/${expenseId}/payments`
  );
  return response.success && response.data?.payments ? response.data.payments.map(formatPayment) : [];
}

export async function createExpensePayment(expenseId: string, data: CreateExpensePaymentData): Promise<ExpensePayment> {
  const response = await httpClient.post<{ success: boolean; payment: ApiPayment }>(
    `/api/expenses/${expenseId}/payments`,
    data
  );
  if (!response.success || !response.data?.payment) {
    throw new Error((response as { error?: string }).error ?? 'Error al registrar pago');
  }
  return formatPayment(response.data.payment);
}

/**
 * Reabrir una cuenta por pagar pagada (volver a pendiente).
 */
export async function reopenExpense(expenseId: string, storeId: string): Promise<Expense | null> {
  const response = await httpClient.post<{ success: boolean; expense: ApiExpense }>(
    `/api/expenses/${expenseId}/reopen`,
    { storeId }
  );
  if (!response.success || !response.data?.expense) return null;
  return formatExpense(response.data.expense);
}

/**
 * Eliminar un abono de una cuenta por pagar.
 */
export async function deleteExpensePayment(
  expenseId: string,
  paymentId: string,
  storeId: string
): Promise<{ expense: Expense; payments: ExpensePayment[] } | null> {
  const response = await httpClient.delete<{
    success: boolean;
    expense: ApiExpense;
    payments: ApiPayment[];
  }>(`/api/expenses/${expenseId}/payments/${paymentId}?storeId=${encodeURIComponent(storeId)}`);
  if (!response.success || !response.data?.expense) return null;
  return {
    expense: formatExpense(response.data.expense),
    payments: (response.data.payments || []).map(formatPayment),
  };
}
