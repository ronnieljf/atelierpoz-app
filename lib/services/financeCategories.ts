/**
 * Servicio de categorías financieras (income_categories / expense_categories)
 */

import { httpClient } from '@/lib/http/client';
import type { FinanceCategory } from '@/types/expense';

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiCat = Record<string, any>;

function formatCategory(r: ApiCat): FinanceCategory {
  return {
    id: r.id,
    storeId: r.storeId ?? r.store_id,
    name: r.name,
    description: r.description ?? null,
    color: r.color ?? null,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
  };
}

type CatType = 'income' | 'expense';

export async function getFinanceCategories(type: CatType, storeId: string): Promise<FinanceCategory[]> {
  const response = await httpClient.get<{ success: boolean; categories: ApiCat[] }>(
    `/api/finance-categories/${type}?storeId=${storeId}`
  );
  return response.success && response.data?.categories ? response.data.categories.map(formatCategory) : [];
}

export async function createFinanceCategory(
  type: CatType,
  data: { storeId: string; name: string; description?: string; color?: string }
): Promise<FinanceCategory> {
  const response = await httpClient.post<{ success: boolean; category: ApiCat }>(
    `/api/finance-categories/${type}`,
    data
  );
  if (!response.success || !response.data?.category) {
    throw new Error((response as { error?: string }).error ?? 'Error al crear categoría');
  }
  return formatCategory(response.data.category);
}

export async function updateFinanceCategory(
  type: CatType,
  categoryId: string,
  data: { name?: string; description?: string; color?: string }
): Promise<FinanceCategory> {
  const response = await httpClient.put<{ success: boolean; category: ApiCat }>(
    `/api/finance-categories/${type}/${categoryId}`,
    data
  );
  if (!response.success || !response.data?.category) {
    throw new Error((response as { error?: string }).error ?? 'Error al actualizar categoría');
  }
  return formatCategory(response.data.category);
}

export async function deleteFinanceCategory(type: CatType, categoryId: string): Promise<void> {
  await httpClient.delete(`/api/finance-categories/${type}/${categoryId}`);
}
