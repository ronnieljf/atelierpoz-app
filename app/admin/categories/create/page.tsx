'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCategory } from '@/lib/services/categories';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { FolderTree, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function CreateCategoryPage() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slugManuallyEditedRef = useRef(false);

  function slugFromName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  useEffect(() => {
    if (authState.stores.length === 1 && !storeId) {
      setStoreId(authState.stores[0].id);
    }
  }, [authState.stores, storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setMessage({ type: 'error', text: 'Selecciona una tienda' });
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', text: 'El nombre es obligatorio' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await createCategory({
        storeId,
        name: trimmedName,
        slug: slug.trim() || undefined,
      });
      setMessage({ type: 'success', text: 'Categoría creada correctamente' });
      setTimeout(() => {
        router.push(`/admin/categories?storeId=${encodeURIComponent(storeId)}`);
      }, 1200);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear la categoría',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/categories"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">Nueva categoría</h1>
          <p className="text-sm text-neutral-400">
            Crea una categoría para organizar los productos de la tienda. El slug se genera solo si no lo indicas.
          </p>
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
          <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda *</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          >
            <option value="">Selecciona una tienda...</option>
            {authState.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              const newName = e.target.value;
              setName(newName);
              if (!slugManuallyEditedRef.current) {
                setSlug(slugFromName(newName));
              }
            }}
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
            onChange={(e) => {
              const v = e.target.value;
              if (!v.trim()) slugManuallyEditedRef.current = false;
              else slugManuallyEditedRef.current = true;
              setSlug(v);
            }}
            placeholder="Se genera del nombre si está vacío"
            maxLength={100}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-neutral-800 pt-6">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <FolderTree className="mr-2 h-4 w-4" />
                Crear categoría
              </>
            )}
          </Button>
          <Link href="/admin/categories">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
