'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMyPermissions } from '@/lib/services/permissions';

/** Códigos de permiso que coinciden con el backend (módulo.accion). */
export type PermissionCode =
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'categories.view'
  | 'categories.create'
  | 'categories.edit'
  | 'sales.view'
  | 'sales.create'
  | 'sales.cancel'
  | 'receivables.view'
  | 'receivables.create'
  | 'receivables.edit'
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'vendors.view'
  | 'vendors.create'
  | 'vendors.edit'
  | 'purchases.view'
  | 'purchases.create'
  | 'purchases.edit'
  | 'expenses.view'
  | 'expenses.create'
  | 'expenses.edit'
  | 'finance_categories.view'
  | 'finance_categories.create'
  | 'finance_categories.edit'
  | 'requests.view'
  | 'requests.edit'
  | 'reports.view'
  | 'stores.view'
  | 'stores.manage_users'
  | 'posts.view'
  | 'posts.create'
  | 'posts.edit';

const ALL_PERMISSION_CODES: PermissionCode[] = [
  'products.view', 'products.create', 'products.edit',
  'categories.view', 'categories.create', 'categories.edit',
  'sales.view', 'sales.create', 'sales.cancel',
  'receivables.view', 'receivables.create', 'receivables.edit',
  'clients.view', 'clients.create', 'clients.edit',
  'vendors.view', 'vendors.create', 'vendors.edit',
  'purchases.view', 'purchases.create', 'purchases.edit',
  'expenses.view', 'expenses.create', 'expenses.edit',
  'finance_categories.view', 'finance_categories.create', 'finance_categories.edit',
  'requests.view', 'requests.edit',
  'reports.view',
  'stores.view', 'stores.manage_users',
  'posts.view', 'posts.create', 'posts.edit',
];

export interface UseStorePermissionsResult {
  /** Códigos asignados al usuario; null si es creador (tiene todos). */
  permissionCodes: string[] | null;
  /** True si el usuario es creador de la tienda (tiene todos los permisos). */
  isCreator: boolean;
  /** True si el usuario tiene este permiso (o es creador). */
  hasPermission: (code: string) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para permisos del usuario actual en una tienda.
 * Cuando storeId está vacío, hasPermission devuelve false y loading es false.
 */
export function useStorePermissions(storeId: string): UseStorePermissionsResult {
  const [permissionCodes, setPermissionCodes] = useState<string[] | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(!!storeId);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!storeId) {
      setPermissionCodes(null);
      setIsCreator(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getMyPermissions(storeId);
      setPermissionCodes(result.permissionCodes);
      setIsCreator(result.isCreator);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar permisos');
      setPermissionCodes([]);
      setIsCreator(false);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: string): boolean => {
      if (!storeId) return false;
      if (isCreator) return true;
      if (!permissionCodes) return false;
      return permissionCodes.includes(code);
    },
    [storeId, isCreator, permissionCodes]
  );

  return {
    permissionCodes,
    isCreator,
    hasPermission,
    loading,
    error,
    refetch: fetchPermissions,
  };
}

export { ALL_PERMISSION_CODES };
