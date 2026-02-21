'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getVendorById, updateVendor } from '@/lib/services/vendors';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Truck, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: vendorId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeIdFromQuery = searchParams.get('storeId') ?? '';

  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState(storeIdFromQuery);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [identityDocument, setIdentityDocument] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
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

  const loadVendor = useCallback(async () => {
    if (!vendorId || !storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const vendor = await getVendorById(vendorId, storeId);
      if (vendor) {
        setName(vendor.name ?? '');
        setPhone(vendor.phone ?? '');
        setEmail(vendor.email ?? '');
        setAddress(vendor.address ?? '');
        setIdentityDocument(vendor.identityDocument ?? '');
        setNotes(vendor.notes ?? '');
      } else {
        setMessage({ type: 'error', text: 'Proveedor no encontrado' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar el proveedor',
      });
    } finally {
      setLoading(false);
    }
  }, [vendorId, storeId]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setMessage({ type: 'error', text: 'Falta la tienda (storeId)' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const updated = await updateVendor(vendorId, {
        storeId,
        name: name.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        identityDocument: identityDocument.trim() || null,
        notes: notes.trim() || null,
      });
      if (updated) {
        setMessage({ type: 'success', text: 'Proveedor actualizado correctamente' });
        setTimeout(() => {
          router.push(`/admin/vendors?storeId=${encodeURIComponent(storeId)}`);
        }, 1200);
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar el proveedor' });
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

  if (!storeId) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin/vendors"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          Falta el parámetro de tienda. <Link href="/admin/vendors" className="underline hover:no-underline">Volver a proveedores</Link> y abre editar desde la lista.
        </div>
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
          href={`/admin/vendors?storeId=${encodeURIComponent(storeId)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">
            Editar proveedor
          </h1>
          <p className="text-sm text-neutral-400">
            Modifica los datos del proveedor.
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
          <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
          <div className="flex h-12 items-center rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 sm:h-auto sm:py-3">
            {authState.stores.find((s) => s.id === storeId)?.name ?? storeId}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Distribuidora XYZ"
            maxLength={255}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">RIF / Cédula</label>
          <input
            type="text"
            value={identityDocument}
            onChange={(e) => setIdentityDocument(e.target.value)}
            placeholder="Ej: J-12345678-9"
            maxLength={50}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Teléfono</label>
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
          <label className="mb-2 block text-sm font-medium text-neutral-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="proveedor@ejemplo.com"
            maxLength={255}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Dirección</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Av. Industrial, galpón 5"
            maxLength={500}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:h-auto sm:py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones adicionales..."
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
                <Truck className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
          <Link href={`/admin/vendors?storeId=${encodeURIComponent(storeId)}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
