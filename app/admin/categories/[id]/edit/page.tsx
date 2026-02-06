'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCategoriesForAdmin, getCategories, updateCategory, type Category } from '@/lib/services/categories';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { FolderTree, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: categoryId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeIdFromQuery = searchParams.get('storeId') ?? '';

  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState(storeIdFromQuery);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeIdFromQuery) setStoreId(storeIdFromQuery);
  }, [storeIdFromQuery]);

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

  const loadCategory = useCallback(async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      let list: Category[] = [];
      if (storeId) {
        list = await getCategoriesForAdmin(storeId);
      } else {
        list = await getCategories();
      }
      const category = list.find((c) => c.id === categoryId);
      if (category) {
        setName(category.name);
        setSlug(category.slug ?? '');
      } else {
        setMessage({ type: 'error', text: 'Categoría no encontrada' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar la categoría',
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId, storeId]);

  useEffect(() => {
    loadCategory();
  }, [loadCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await updateCategory(categoryId, {
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      if (updated) {
        setMessage({ type: 'success', text: 'Categoría actualizada correctamente' });
        setTimeout(() => {
          router.push(storeId ? `/admin/categories?storeId=${encodeURIComponent(storeId)}` : '/admin/categories');
        }, 1200);
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar la categoría' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authState.user && authState.stores.length === 0 && !message) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-neutral-400">Cargando tiendas...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={storeId ? `/admin/categories?storeId=${encodeURIComponent(storeId)}` : '/admin/categories'}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">Editar categoría</h1>
          <p className="text-sm text-neutral-400">Modifica el nombre o el slug de la categoría.</p>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'mb-6 rounded-xl border p-4',
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm sm:rounded-3xl sm:p-8"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Accesorios"
            maxLength={255}
            required
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Slug (opcional)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="identificador-url"
            maxLength={100}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-6">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <FolderTree className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
          <Link href={storeId ? `/admin/categories?storeId=${encodeURIComponent(storeId)}` : '/admin/categories'}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
