'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/services/clients';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { UserCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function CreateClientPage() {
  const router = useRouter();
  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

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
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName && !trimmedPhone && !trimmedEmail) {
      setMessage({ type: 'error', text: 'Indica al menos nombre, teléfono o email' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await createClient({
        storeId,
        name: trimmedName || undefined,
        phone: trimmedPhone || undefined,
        email: trimmedEmail || undefined,
      });
      setMessage({ type: 'success', text: 'Cliente creado correctamente' });
      setTimeout(() => {
        router.push(`/admin/clients?storeId=${encodeURIComponent(storeId)}`);
      }, 1200);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear el cliente',
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/clients"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">
            Nuevo cliente
          </h1>
          <p className="text-sm text-neutral-400">
            Agrega un cliente a la cartera de la tienda. Todos los campos son opcionales, pero conviene indicar al menos uno.
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
          <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María García"
            maxLength={255}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Teléfono (opcional)</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +58 412 1234567"
            maxLength={50}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Email (opcional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
            maxLength={255}
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
                <UserCircle className="mr-2 h-4 w-4" />
                Crear cliente
              </>
            )}
          </Button>
          <Link href="/admin/clients">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
