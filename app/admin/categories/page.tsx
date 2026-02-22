'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCategoriesForAdmin,
  deleteCategory,
  type Category,
} from '@/lib/services/categories';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { FolderTree, Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const storeIdFromUrl = searchParams.get('storeId') ?? '';
  const { state: authState } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeIdFromUrl);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (storeIdFromUrl && authState.stores.some((s) => s.id === storeIdFromUrl)) {
      setSelectedStoreId(storeIdFromUrl);
    } else if (authState.stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId, storeIdFromUrl]);

  const loadCategories = useCallback(async () => {
    if (!selectedStoreId) {
      setLoading(false);
      setCategories([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const list = await getCategoriesForAdmin(selectedStoreId);
      setCategories(list);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar categorías',
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (selectedStoreId) loadCategories();
    else {
      setCategories([]);
      setLoading(false);
    }
  }, [selectedStoreId, loadCategories]);

  const handleDelete = async (category: Category) => {
    if (!confirm('¿Eliminar esta categoría? Si tiene productos asignados no se podrá eliminar.')) return;
    setDeletingId(category.id);
    setMessage(null);
    try {
      const ok = await deleteCategory(category.id);
      if (ok) {
        setMessage({ type: 'success', text: 'Categoría eliminada' });
        loadCategories();
      } else {
        setMessage({ type: 'error', text: 'No se pudo eliminar la categoría' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al eliminar',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
            Categorías de Productos
          </h1>
          <p className="text-sm text-neutral-400">
            Organiza tus productos por categoría{selectedStoreId ? ` · ${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}` : ''}
          </p>
        </div>
        <Link href="/admin/categories/create" className="w-full sm:w-auto">
          <Button variant="primary" className="h-11 w-full justify-center sm:h-auto sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
        <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
        {authState.stores.length === 0 ? (
          <div className="text-sm text-neutral-400">No tienes acceso a ninguna tienda</div>
        ) : (
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setCategories([]);
            }}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3 sm:text-sm"
          >
            <option value="">Selecciona una tienda...</option>
            {authState.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-4 rounded-xl border p-4 sm:mb-6',
              message.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedStoreId ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <FolderTree className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Selecciona una tienda
          </h3>
          <p className="text-sm text-neutral-400 sm:text-base">
            Elige una tienda para ver y gestionar sus categorías
          </p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/80 sm:rounded-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <FolderTree className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Aún no hay categorías
          </h3>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">
            Crea categorías para organizar los productos de esta tienda.
          </p>
          <Link href="/admin/categories/create">
            <Button variant="primary" className="h-11 min-w-[180px] gap-2 px-5">
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-neutral-700 bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Slug</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-300 sm:px-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {categories.map((category) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="transition-colors hover:bg-neutral-800/30"
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <span className="text-sm font-medium text-neutral-100">{category.name}</span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 text-sm text-neutral-400">{category.slug}</td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/categories/${category.id}/edit?storeId=${selectedStoreId}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Edit className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={deletingId === category.id}
                          className="text-xs text-red-400 hover:border-red-500/50 hover:text-red-300"
                        >
                          {deletingId === category.id ? (
                            <Loader2 className="h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
