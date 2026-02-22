'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store/auth-store';
import { getSaleById, refundSale, cancelSale } from '@/lib/services/sales';
import type { Sale } from '@/types/sale';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Loader2,
  Receipt,
  RotateCcw,
  XCircle,
  Printer,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { generateSalePdf } from '@/lib/utils/generateSalePdf';

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const saleId = params?.id as string;
  const storeId = searchParams?.get('storeId') ?? '';
  const { state: authState } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'refund' | 'cancel' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    if (!saleId || !storeId) return;
    setLoading(true);
    getSaleById(saleId, storeId)
      .then(setSale)
      .catch(() => setMessage({ type: 'error', text: 'Venta no encontrada' }))
      .finally(() => setLoading(false));
  }, [saleId, storeId]);

  const handleRefund = async () => {
    if (!storeId || !saleId) return;
    setActionLoading('refund');
    setMessage(null);
    try {
      const updated = await refundSale(saleId, storeId);
      setSale(updated);
      setMessage({ type: 'success', text: 'Venta devuelta correctamente' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al devolver la venta',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!storeId || !saleId) return;
    if (!confirm('¿Cancelar esta venta? Se restaurará el stock.')) return;
    setActionLoading('cancel');
    setMessage(null);
    try {
      const updated = await cancelSale(saleId, storeId);
      setSale(updated);
      setMessage({ type: 'success', text: 'Venta cancelada correctamente' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al cancelar la venta',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!storeId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-neutral-500">Falta storeId en la URL.</p>
        <Link href="/admin/sales" className="mt-4 inline-block text-primary-400 hover:underline">
          Volver a Ventas
        </Link>
      </div>
    );
  }

  if (loading || !sale) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  const canRefundOrCancel = sale.status === 'completed';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/sales?storeId=${encodeURIComponent(storeId)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800/50 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl">
            Venta #{sale.saleNumber}
          </h1>
          <p className="text-sm text-neutral-500">
            {new Date(sale.createdAt).toLocaleString('es', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'mb-6 rounded-xl border p-4 text-sm',
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Status badge */}
        <div>
          <span
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-sm font-medium',
              sale.status === 'completed' && 'bg-green-500/20 text-green-400',
              sale.status === 'refunded' && 'bg-yellow-500/20 text-yellow-400',
              sale.status === 'cancelled' && 'bg-red-500/20 text-red-400'
            )}
          >
            {sale.status === 'completed' && 'Completada'}
            {sale.status === 'refunded' && 'Devuelta'}
            {sale.status === 'cancelled' && 'Cancelada'}
          </span>
        </div>

        {/* Client info */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <User className="h-4 w-4" />
            Cliente
          </h2>
          <p className="font-medium text-neutral-100">{sale.clientName ?? '—'}</p>
          {sale.clientPhone && (
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
              <Phone className="h-3.5 w-3.5" />
              {sale.clientPhone}
            </p>
          )}
          {sale.clientEmail && (
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
              <Mail className="h-3.5 w-3.5" />
              {sale.clientEmail}
            </p>
          )}
          {sale.clientAddress && (
            <p className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
              <MapPin className="h-3.5 w-3.5" />
              {sale.clientAddress}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
            <Receipt className="h-4 w-4" />
            Productos
          </h2>
          <ul className="space-y-2">
            {sale.items.map((item, i) => (
              <li
                key={`${item.productId}-${item.combinationId ?? 'base'}-${i}`}
                className="flex justify-between rounded-lg bg-neutral-800/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-neutral-100">
                  {item.productName}
                  {item.quantity > 1 && (
                    <span className="ml-2 text-neutral-500">× {item.quantity}</span>
                  )}
                </span>
                <span className="text-neutral-400">
                  {item.total.toFixed(2)} {sale.currency}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-neutral-700 pt-3">
            <p className="flex justify-between text-lg font-semibold text-neutral-100">
              Total: {sale.total.toFixed(2)} {sale.currency}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrint(true)}
            className="inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir ticket
          </Button>
          {canRefundOrCancel && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefund}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10"
              >
                {actionLoading === 'refund' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Devolver
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-2 text-red-400 hover:border-red-500/50 hover:bg-red-500/10"
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancelar venta
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print ticket / Descargar comprobante PDF */}
      {showPrint && sale && (() => {
        const store = authState.stores.find((s) => s.id === storeId);
        const storeInfo = {
          name: store?.name ?? sale.storeName ?? 'Tienda',
          logo: store?.logo ?? null,
          location: store?.location ?? null,
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-white p-6 text-neutral-900 shadow-xl">
              <h3 className="mb-4 border-b border-neutral-200 pb-2 text-center font-semibold">
                Comprobante #{sale.saleNumber}
              </h3>
              <p className="text-sm text-neutral-600">{storeInfo.name}</p>
              <p className="mt-1 text-sm text-neutral-600">
                Cliente: {sale.clientName ?? '—'} {sale.clientPhone ?? ''}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {new Date(sale.createdAt).toLocaleString('es')}
              </p>
              <p className="mt-3 border-t border-neutral-200 pt-3 text-center text-xl font-bold">
                Total: {sale.total.toFixed(2)} {sale.currency}
              </p>
              <p className="mt-1 text-center text-xs text-neutral-500">
                IVA incluido cuando aplique
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    generateSalePdf(sale, storeInfo, {
                      fileName: `comprobante-${sale.saleNumber}.pdf`,
                    });
                  }}
                  className="flex-1 bg-neutral-800 text-white border-0 hover:bg-neutral-700 focus:ring-neutral-600 shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Descargar PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrint(false)}
                  className="flex-1 border-2 border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100 hover:border-neutral-500 focus:ring-neutral-400"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
