'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store/auth-store';
import { getClients, createClient, updateClient, type Client } from '@/lib/services/clients';
import {
  getTopSoldProducts,
  searchProductsForPOS,
  getProductPOSOptions,
  createSale,
  getSales,
  getSaleById,
  type POSProduct,
  type SaleItem,
} from '@/lib/services/sales';
import type { Sale } from '@/types/sale';
import { generateSalePdf } from '@/lib/utils/generateSalePdf';
import { createRequest } from '@/lib/services/requests';
import { createReceivableFromRequest } from '@/lib/services/receivables';
import { Button } from '@/components/ui/Button';
import {
  ShoppingCart,
  Search,
  UserPlus,
  UserCircle,
  Loader2,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  FileText,
  ChevronDown,
  X,
  Printer,
  History,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type PaymentType = 'contado' | 'cuenta';

interface CartLine extends SaleItem {
  displayName: string;
  selectedVariants?: POSProduct['selectedVariants'];
}

function isHexColor(value: string | undefined): boolean {
  if (value == null || typeof value !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value.trim());
}

export default function SalesPage() {
  const router = useRouter();
  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [view, setView] = useState<'pos' | 'history'>('pos');

  // Client
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [loadingRecentClients, setLoadingRecentClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCedulaPrefix, setNewClientCedulaPrefix] = useState<'V' | 'E'>('V');
  const [newClientCedulaNumber, setNewClientCedulaNumber] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Modal: completar cédula del cliente (cuando no tiene y va a cobrar/crear cuenta)
  const [showUpdateCedulaModal, setShowUpdateCedulaModal] = useState(false);
  const [updateCedulaPrefix, setUpdateCedulaPrefix] = useState<'V' | 'E'>('V');
  const [updateCedulaNumber, setUpdateCedulaNumber] = useState('');
  const [updatingCedula, setUpdatingCedula] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<POSProduct[]>([]);
  const [topProducts, setTopProducts] = useState<POSProduct[]>([]);
  const [loadingTopProducts, setLoadingTopProducts] = useState(false);
  const [searching, setSearching] = useState(false);

  // Cart
  const [cart, setCart] = useState<CartLine[]>([]);
  const [currency, setCurrency] = useState('USD');

  // Payment
  const [paymentType, setPaymentType] = useState<PaymentType>('contado');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [initialPaymentNote, setInitialPaymentNote] = useState('');
  const [receivableNote, setReceivableNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showTicketPreview, setShowTicketPreview] = useState(false);

  // Variant/combination choice modal (when product has multiple variants)
  const [variantChoiceModal, setVariantChoiceModal] = useState<{
    productName: string;
    options: POSProduct[];
  } | null>(null);
  const [loadingVariantOptionsForProductId, setLoadingVariantOptionsForProductId] = useState<string | null>(null);

  // History (paginación / infinite scroll)
  const HISTORY_PAGE_SIZE = 20;
  const [sales, setSales] = useState<{ id: string; saleNumber: number; total: number; status: string; clientName?: string; createdAt: string; lastUpdatedBy?: string }[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const historySentinelRef = useRef<HTMLDivElement>(null);

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

  // Al cambiar de tienda, limpiar todos los datos para no mezclar entre tiendas
  useEffect(() => {
    if (!storeId) return;
    setTopProducts([]);
    setRecentClients([]);
    setProductResults([]);
    setClientResults([]);
    setSelectedClient(null);
    setProductSearch('');
    setClientSearch('');
    setCart([]);
    setShowClientDropdown(false);
  }, [storeId]);

  // Cargar hasta 1000 productos más vendidos para búsqueda rápida en el front
  useEffect(() => {
    if (!storeId || view !== 'pos') return;
    setLoadingTopProducts(true);
    getTopSoldProducts(storeId, 1000)
      .then(setTopProducts)
      .catch(() => setTopProducts([]))
      .finally(() => setLoadingTopProducts(false));
  }, [storeId, view]);

  // Cargar hasta 1000 clientes para búsqueda rápida en el front
  useEffect(() => {
    if (!storeId || view !== 'pos') return;
    setLoadingRecentClients(true);
    getClients(storeId, { limit: 1000 })
      .then((r) => setRecentClients(r.clients))
      .catch(() => setRecentClients([]))
      .finally(() => setLoadingRecentClients(false));
  }, [storeId, view]);

  // Búsqueda: primero filtrar localmente en topProducts, si no hay resultados buscar en backend
  useEffect(() => {
    if (!storeId) {
      setProductResults([]);
      return;
    }
    const q = productSearch.trim().toLowerCase();
    if (!q) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      // Primero buscar en los 1000 cargados localmente
      const localMatches = topProducts.filter(
        (p) =>
          (p.productName?.toLowerCase().includes(q) ||
            p.displayName?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.sku === productSearch.trim())
      );
      if (localMatches.length > 0) {
        setProductResults(localMatches.slice(0, 20));
        setSearching(false);
        return;
      }
      // Si no hay resultados locales, buscar en backend
      searchProductsForPOS(storeId, productSearch.trim(), 20)
        .then(setProductResults)
        .catch(() => setProductResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [storeId, productSearch, topProducts]);

  // Búsqueda de cliente: primero filtrar localmente en recentClients, si no hay resultados buscar en backend
  useEffect(() => {
    if (!storeId) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }
    const q = clientSearch.trim().toLowerCase();
    if (!q) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }
    const t = setTimeout(() => {
      const localMatches = recentClients.filter(
        (c) =>
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
      );
      if (localMatches.length > 0) {
        setClientResults(localMatches.slice(0, 15));
        setShowClientDropdown(true);
        return;
      }
      getClients(storeId, { search: clientSearch.trim(), limit: 15 })
        .then((r) => {
          setClientResults(r.clients);
          setShowClientDropdown(true);
        })
        .catch(() => {
          setClientResults([]);
          setShowClientDropdown(true);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [storeId, clientSearch, recentClients]);

  const addToCart = useCallback(
    (p: POSProduct, qty = 1) => {
      const unitPrice = p.unitPriceWithIva ?? p.unitPrice;
      const quantity = Math.max(1, Math.min(qty, p.stock));
      const total = unitPrice * quantity;
      const key = `${p.productId}-${p.combinationId ?? 'base'}`;
      setCart((prev) => {
        const idx = prev.findIndex(
          (c) => `${c.productId}-${c.combinationId ?? 'base'}` === key
        );
        if (idx >= 0) {
          const newQty = Math.min(prev[idx].quantity + quantity, p.stock);
          const newTotal = unitPrice * newQty;
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: newQty, total: newTotal };
          return next;
        }
        const line: CartLine = {
          productId: p.productId,
          combinationId: p.combinationId ?? undefined,
          productName: p.productName,
          sku: p.sku ?? undefined,
          quantity,
          unitPrice,
          total,
          currency: p.currency,
          displayName: p.displayName,
          selectedVariants: p.selectedVariants,
        };
        return [...prev, line];
      });
    },
    []
  );

  const updateCartQty = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      const newQty = Math.max(0, item.quantity + delta);
      if (newQty === 0) {
        next.splice(index, 1);
        return next;
      }
      next[index] = { ...item, quantity: newQty, total: item.unitPrice * newQty };
      return next;
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const cartTotal = cart.reduce((s, c) => s + c.total, 0);

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    const name = newClientName.trim();
    const phone = newClientPhone.trim();
    const cedulaNum = newClientCedulaNumber.trim();
    if (!name || !phone) {
      setMessage({ type: 'error', text: 'Nombre y teléfono son obligatorios' });
      return;
    }
    if (!cedulaNum) {
      setMessage({ type: 'error', text: 'La cédula de identidad es obligatoria' });
      return;
    }
    const cedula = `${newClientCedulaPrefix}-${cedulaNum}`;
    setCreatingClient(true);
    setMessage(null);
    try {
      const client = await createClient({
        storeId,
        identityDocument: cedula,
        name: name || undefined,
        phone: phone || undefined,
        email: newClientEmail.trim() || undefined,
        address: newClientAddress.trim() || undefined,
      });
      setSelectedClient(client);
      setRecentClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)].slice(0, 1000));
      setClientSearch('');
      setShowNewClientModal(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientCedulaPrefix('V');
      setNewClientCedulaNumber('');
      setNewClientEmail('');
      setNewClientAddress('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al crear cliente',
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleUpdateClientCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !selectedClient) return;
    const num = updateCedulaNumber.trim();
    if (!num) {
      setMessage({ type: 'error', text: 'La cédula de identidad es obligatoria' });
      return;
    }
    setUpdatingCedula(true);
    setMessage(null);
    try {
      const updated = await updateClient(selectedClient.id, {
        storeId,
        identityDocument: `${updateCedulaPrefix}-${num}`,
      });
      if (updated) {
        setSelectedClient(updated);
        setRecentClients((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setShowUpdateCedulaModal(false);
        setUpdateCedulaNumber('');
        setUpdateCedulaPrefix('V');
        setMessage({ type: 'success', text: 'Cédula actualizada. Ya puedes cobrar o crear la cuenta.' });
      } else {
        setMessage({ type: 'error', text: 'No se pudo actualizar el cliente' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al actualizar',
      });
    } finally {
      setUpdatingCedula(false);
    }
  };

  const handleCompleteSale = async () => {
    if (!storeId || !selectedClient || cart.length === 0) {
      setMessage({
        type: 'error',
        text: 'Selecciona un cliente y agrega productos al carrito',
      });
      return;
    }
    const cedula = (selectedClient.identityDocument ?? '').trim();
    if (!cedula) {
      setMessage({
        type: 'error',
        text: 'El cliente debe tener cédula de identidad. Complétala a continuación.',
      });
      const doc = (selectedClient.identityDocument ?? '').trim();
      const match = doc.match(/^(V|E)[-\s]?(.*)$/i);
      if (match) {
        setUpdateCedulaPrefix((match[1]?.toUpperCase() ?? 'V') as 'V' | 'E');
        setUpdateCedulaNumber(match[2] ?? '');
      } else {
        setUpdateCedulaPrefix('V');
        setUpdateCedulaNumber('');
      }
      setShowUpdateCedulaModal(true);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const items: SaleItem[] = cart.map((c) => ({
        productId: c.productId,
        combinationId: c.combinationId ?? null,
        productName: c.productName,
        sku: c.sku ?? null,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        total: c.total,
        currency: c.currency,
        selectedVariants: c.selectedVariants,
      }));

      if (paymentType === 'contado') {
        const sale = await createSale({
          storeId,
          clientId: selectedClient.id,
          items,
          total: cartTotal,
          currency,
          paymentMethod: paymentMethod.trim() || undefined,
          notes: saleNote.trim() || undefined,
        });
        setLastSale(sale);
        setShowTicketPreview(true);
        setCart([]);
        setPaymentMethod('');
        setSaleNote('');
        setMessage({ type: 'success', text: `Venta #${sale.saleNumber} registrada` });
      } else {
        const storeName = authState.stores.find((s) => s.id === storeId)?.name ?? 'Tienda';
        const cartItems = items.map((i, idx) => ({
          id: `pos-${idx}-${i.productId}`,
          productId: i.productId,
          productName: i.productName,
          productImage: '',
          productSku: i.sku ?? '',
          basePrice: i.unitPrice,
          quantity: i.quantity,
          selectedVariants: i.selectedVariants ?? [],
          totalPrice: i.total,
          storeId,
          storeName,
        }));
        const req = await createRequest({
          storeId,
          customerName: selectedClient.name ?? undefined,
          customerPhone: selectedClient.phone ?? undefined,
          customerEmail: selectedClient.email ?? undefined,
          items: cartItems,
          total: cartTotal,
          currency,
          status: 'pending',
        });
        if (!req) throw new Error('No se pudo crear el pedido');
        const abonoNum = initialPaymentAmount.trim() ? parseFloat(initialPaymentAmount.replace(',', '.')) : 0;
        const hasValidAbono = !Number.isNaN(abonoNum) && abonoNum > 0;
        const rec = await createReceivableFromRequest({
          storeId,
          requestId: req.id,
          description: receivableNote.trim() || undefined,
          initialPayment:
            hasValidAbono
              ? { amount: abonoNum, notes: initialPaymentNote.trim() || undefined }
              : undefined,
        });
        if (!rec) throw new Error('No se pudo crear la cuenta por cobrar');
        setMessage({
          type: 'success',
          text: `Cuenta por cobrar #${rec.receivableNumber} creada. Redirigiendo...`,
        });
        setCart([]);
        setInitialPaymentAmount('');
        setInitialPaymentNote('');
        setReceivableNote('');
        setTimeout(() => {
          router.push(`/admin/receivables/${rec.id}?storeId=${storeId}`);
        }, 1200);
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al procesar la venta',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!storeId) return;
    setLoadingHistory(true);
    try {
      const r = await getSales(storeId, { limit: HISTORY_PAGE_SIZE, offset: 0 });
      setSales(
        r.sales.map((s) => ({
          id: s.id,
          saleNumber: s.saleNumber,
          total: s.total,
          status: s.status,
          clientName: s.clientName ?? undefined,
          createdAt: s.createdAt,
          lastUpdatedBy: s.updatedByName ?? s.createdByName ?? undefined,
        }))
      );
      setSalesTotal(r.total);
    } catch {
      setSales([]);
      setSalesTotal(0);
    } finally {
      setLoadingHistory(false);
    }
  }, [storeId]);

  const loadMoreHistory = useCallback(async () => {
    if (!storeId || loadingMoreHistory || loadingHistory || sales.length >= salesTotal) return;
    setLoadingMoreHistory(true);
    try {
      const r = await getSales(storeId, { limit: HISTORY_PAGE_SIZE, offset: sales.length });
      setSales((prev) =>
        prev.concat(
          r.sales.map((s) => ({
            id: s.id,
            saleNumber: s.saleNumber,
            total: s.total,
            status: s.status,
            clientName: s.clientName ?? undefined,
            createdAt: s.createdAt,
            lastUpdatedBy: s.updatedByName ?? s.createdByName ?? undefined,
          }))
        )
      );
      setSalesTotal(r.total);
    } catch {
      // no append on error
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [storeId, loadingMoreHistory, loadingHistory, sales.length, salesTotal]);

  const handleDownloadPdfFromHistory = useCallback(
    async (saleId: string) => {
      if (!storeId) return;
      setDownloadingPdfId(saleId);
      try {
        const sale = await getSaleById(saleId, storeId);
        if (sale) {
          const store = authState.stores.find((s) => s.id === storeId);
          await generateSalePdf(
            sale,
            {
              name: store?.name ?? sale.storeName ?? 'Tienda',
              logo: store?.logo ?? null,
              location: store?.location ?? null,
            },
            { fileName: `factura-${sale.saleNumber}.pdf` }
          );
        }
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [storeId, authState.stores]
  );

  useEffect(() => {
    if (view === 'history' && storeId) loadHistory();
  }, [view, storeId, loadHistory]);

  const hasMoreHistory = sales.length < salesTotal;

  useEffect(() => {
    if (view !== 'history' || !hasMoreHistory || loadingMoreHistory || loadingHistory) return;
    const el = historySentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreHistory();
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, hasMoreHistory, loadingMoreHistory, loadingHistory, loadMoreHistory]);

  if (!storeId && authState.stores.length > 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 pb-safe">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-medium text-neutral-100 sm:text-2xl">Ventas</h1>
          <p className="text-xs text-neutral-400 sm:text-sm">Caja rápida · Registrar ventas</p>
        </div>
        <div className="flex flex-col gap-2 xs:flex-row xs:flex-wrap xs:items-center xs:gap-2">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="h-12 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation xs:w-auto xs:min-w-[180px]"
          >
            <option value="">Tienda...</option>
            {authState.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-700 bg-neutral-800/40 p-1.5 touch-manipulation sm:flex">
            <button
              type="button"
              onClick={() => setView('pos')}
              className={cn(
                'flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                view === 'pos' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200 active:bg-neutral-700/50'
              )}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              Caja
            </button>
            <button
              type="button"
              onClick={() => setView('history')}
              className={cn(
                'flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                view === 'history' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200 active:bg-neutral-700/50'
              )}
            >
              <History className="h-4 w-4 shrink-0" />
              Historial
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'mb-4 rounded-xl border p-4 text-sm',
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          )}
        >
          {message.text}
        </div>
      )}

      {view === 'history' && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-medium text-neutral-100">Ventas recientes</h2>
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
          ) : sales.length === 0 ? (
            <p className="py-8 text-center text-neutral-500">No hay ventas</p>
          ) : (
            <>
              {/* Mobile: cards con scroll infinito */}
              <div className="space-y-3 lg:hidden">
                {sales.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-neutral-700/80 bg-neutral-800/40 p-4 transition-colors hover:border-neutral-600 hover:bg-neutral-800/60"
                  >
                    <Link
                      href={`/admin/sales/${s.id}?storeId=${storeId}`}
                      className="block"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-100">Venta #{s.saleNumber}</p>
                          <p className="mt-0.5 truncate text-sm text-neutral-400">{s.clientName ?? 'Sin cliente'}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {s.lastUpdatedBy && <span className="text-neutral-400">{s.lastUpdatedBy} · </span>}
                            {new Date(s.createdAt).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold text-primary-400">
                            {s.total.toFixed(2)} {currency}
                          </p>
                          <span
                            className={cn(
                              'mt-1 inline-block rounded-full px-2 py-0.5 text-xs',
                              s.status === 'completed' && 'bg-green-500/20 text-green-400',
                              s.status === 'refunded' && 'bg-yellow-500/20 text-yellow-400',
                              s.status === 'cancelled' && 'bg-red-500/20 text-red-400'
                            )}
                          >
                            {s.status === 'completed' && 'Completada'}
                            {s.status === 'refunded' && 'Devuelta'}
                            {s.status === 'cancelled' && 'Cancelada'}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="mt-3 flex gap-2 border-t border-neutral-700/80 pt-3">
                      <Link
                        href={`/admin/sales/${s.id}?storeId=${storeId}`}
                        className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800/60 py-2 text-center text-sm text-neutral-200 transition-colors hover:bg-neutral-700/60"
                      >
                        Ver detalle
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingPdfId === s.id}
                        onClick={() => handleDownloadPdfFromHistory(s.id)}
                        className="shrink-0 border-neutral-600 text-neutral-200 hover:bg-neutral-700/60"
                      >
                        {downloadingPdfId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">Factura PDF</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabla con scroll infinito */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700 text-left text-neutral-400">
                        <th className="pb-3 pr-4">#</th>
                        <th className="pb-3 pr-4">Cliente</th>
                        <th className="pb-3 pr-4">Total</th>
                        <th className="pb-3 pr-4">Estado</th>
                        <th className="pb-3 pr-4">Usuario</th>
                        <th className="pb-3 pr-4">Fecha</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s.id} className="border-b border-neutral-800/80">
                          <td className="py-3 pr-4 font-medium text-neutral-100">{s.saleNumber}</td>
                          <td className="py-3 pr-4 text-neutral-300">{s.clientName ?? '—'}</td>
                          <td className="py-3 pr-4 text-neutral-200">
                            {s.total.toFixed(2)} {currency}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs',
                                s.status === 'completed' && 'bg-green-500/20 text-green-400',
                                s.status === 'refunded' && 'bg-yellow-500/20 text-yellow-400',
                                s.status === 'cancelled' && 'bg-red-500/20 text-red-400'
                              )}
                            >
                              {s.status === 'completed' && 'Completada'}
                              {s.status === 'refunded' && 'Devuelta'}
                              {s.status === 'cancelled' && 'Cancelada'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-neutral-400 text-sm">{s.lastUpdatedBy ?? '—'}</td>
                          <td className="py-3 pr-4 text-neutral-500">
                            {new Date(s.createdAt).toLocaleDateString('es', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/admin/sales/${s.id}?storeId=${storeId}`}
                                className="text-primary-400 hover:underline"
                              >
                                Ver
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdfFromHistory(s.id)}
                                disabled={downloadingPdfId === s.id}
                                className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-100 disabled:opacity-50"
                              >
                                {downloadingPdfId === s.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FileDown className="h-3.5 w-3.5" />
                                )}
                                Factura
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sentinel y estado para scroll infinito (compartido mobile/desktop) */}
              <div ref={historySentinelRef} className="h-4 shrink-0" aria-hidden />
              {loadingMoreHistory && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
              )}
              {!hasMoreHistory && sales.length > 0 && (
                <p className="py-3 text-center text-xs text-neutral-500">
                  {sales.length} de {salesTotal} ventas
                </p>
              )}
            </>
          )}
        </div>
      )}

      {view === 'pos' && (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Col 1: Product search + results — scrollable on mobile */}
          <div className="flex min-h-0 flex-1 flex-col lg:col-span-2">
            <div className="relative mb-3 shrink-0 sm:mb-4">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-12 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-12 pr-4 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
              />
            </div>
            <div className="min-h-[200px] flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/40 lg:max-h-[320px] lg:flex-none">
              {searching ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
              ) : productSearch.trim() && productResults.length === 0 ? (
                <p className="py-8 text-center text-neutral-500">Sin resultados</p>
              ) : (
                <div className="divide-y divide-neutral-800/80">
                  {(() => {
                    const byProductId = new Map<string, POSProduct[]>();
                    for (const p of productResults) {
                      const list = byProductId.get(p.productId) ?? [];
                      list.push(p);
                      byProductId.set(p.productId, list);
                    }
                    return Array.from(byProductId.entries()).map(([productId, options]) => {
                      const single = options.length === 1;
                      const p = options[0]!;
                      const isVariant = p.combinationId != null || (p.selectedVariants?.length ?? 0) > 0;
                      const priceDisplay = p.unitPriceWithIva ?? p.unitPrice;
                      const hasStock = options.some((o) => o.stock > 0);
                      const productHasVariants =
                        p.combinationId != null || (p.selectedVariants?.length ?? 0) > 0;
                      const showVariantModal =
                        !single
                          ? true
                          : productHasVariants; /* con una sola fila, si tiene variantes pedir todas las opciones */

                      return (
                        <button
                          key={productId}
                          type="button"
                          onClick={async () => {
                            if (showVariantModal) {
                              if (!single) {
                                setVariantChoiceModal({ productName: p.productName, options });
                              } else if (storeId) {
                                setLoadingVariantOptionsForProductId(productId);
                                try {
                                  const allOptions = await getProductPOSOptions(storeId, productId);
                                  if (allOptions.length > 0) {
                                    setVariantChoiceModal({
                                      productName: p.productName,
                                      options: allOptions,
                                    });
                                  } else {
                                    addToCart(p);
                                  }
                                } catch {
                                  addToCart(p);
                                } finally {
                                  setLoadingVariantOptionsForProductId(null);
                                }
                              }
                            } else {
                              addToCart(p);
                            }
                          }}
                          disabled={loadingVariantOptionsForProductId != null || (!showVariantModal && !hasStock)}
                          className="flex min-h-[52px] w-full touch-manipulation items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-neutral-800/70 hover:bg-neutral-800/50 disabled:opacity-50 disabled:hover:bg-transparent sm:min-h-0 sm:py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-neutral-100">
                              {single && !productHasVariants ? p.displayName : p.productName}
                            </p>
                            {single && isVariant && p.selectedVariants && p.selectedVariants.length > 0 && !showVariantModal && (
                              <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-xs text-neutral-400">
                                {p.selectedVariants.map((sv) => (
                                  <span key={sv.attributeId}>
                                    {sv.attributeName}: {sv.variantValue}
                                  </span>
                                ))}
                              </p>
                            )}
                            {(!single || productHasVariants) && (
                              <p className="mt-0.5 text-xs text-primary-400">
                                {single
                                  ? 'Tiene variantes · Elegir cuál agregar'
                                  : `${options.length} variantes · Elegir cuál agregar`}
                              </p>
                            )}
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-neutral-500">
                              {single && p.sku && <span>Cód: {p.sku}</span>}
                              {single ? (
                                <span>Stock: {p.stock}</span>
                              ) : (
                                <span>{options.filter((o) => o.stock > 0).length} con stock</span>
                              )}
                              {single && isVariant && p.priceModifier != null && p.priceModifier !== 0 && (
                                <span>
                                  {p.priceModifier > 0 ? '+' : ''}{p.priceModifier.toFixed(2)} extra
                                </span>
                              )}
                            </div>
                          </div>
                          {single && !showVariantModal ? (
                            <>
                              <span className="shrink-0 text-sm text-neutral-400">
                                {priceDisplay.toFixed(2)} {p.currency}
                              </span>
                              <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                            </>
                          ) : (
                            <>
                              {loadingVariantOptionsForProductId === productId ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                              )}
                            </>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Cart + Client + Payment — sticky on mobile for easy reach */}
          <div className="sticky bottom-0 z-10 space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.3)] backdrop-blur-sm lg:static lg:border lg:bg-neutral-900/60 lg:shadow-none lg:backdrop-blur-none">
            {/* Client */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                Cliente *
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar o registrar..."
                  value={selectedClient ? `${selectedClient.name ?? ''} ${selectedClient.phone ?? ''}`.trim() : clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setSelectedClient(null);
                  }}
                  className="h-12 min-h-[48px] w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-11 pr-12 text-base text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation sm:h-10 sm:min-h-0 sm:rounded-lg sm:pr-10 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(true)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 touch-manipulation active:bg-neutral-600 sm:h-8 sm:w-8"
                  title="Nuevo cliente"
                  aria-label="Nuevo cliente"
                >
                  <UserPlus className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              </div>
              {showClientDropdown && !selectedClient && clientResults.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-neutral-700 bg-neutral-800 py-1 shadow-xl">
                  {clientResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientSearch('');
                          setShowClientDropdown(false);
                        }}
                        className="min-h-[44px] w-full touch-manipulation px-4 py-3 text-left text-sm text-neutral-200 active:bg-neutral-700 hover:bg-neutral-700"
                      >
                        {c.name || 'Sin nombre'} · {c.phone || ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Cart */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-200">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                Carrito ({cart.length})
              </h3>
              <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain sm:max-h-48">
                {cart.length === 0 ? (
                  <p className="py-4 text-center text-sm text-neutral-500">Vacío</p>
                ) : (
                  cart.map((line, i) => (
                    <div
                      key={`${line.productId}-${line.combinationId ?? 'base'}-${i}`}
                      className="flex items-center gap-2 rounded-xl bg-neutral-800/40 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-100">
                          {line.displayName}
                        </p>
                        {line.selectedVariants && line.selectedVariants.length > 0 && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400">
                            {line.selectedVariants.map((sv) =>
                              isHexColor(sv.variantValue) ? (
                                <span key={sv.attributeId} className="inline-flex items-center gap-1">
                                  <span
                                    className="h-3 w-3 shrink-0 rounded-full border border-neutral-600"
                                    style={{ backgroundColor: sv.variantValue }}
                                    title={sv.variantName || sv.variantValue}
                                  />
                                  <span>{sv.attributeName}: {sv.variantName || sv.variantValue}</span>
                                </span>
                              ) : (
                                <span key={sv.attributeId}>
                                  {sv.attributeName}: {sv.variantValue}
                                </span>
                              )
                            )}
                          </p>
                        )}
                        <p className="text-xs text-neutral-500">
                          {line.quantity} × {line.unitPrice.toFixed(2)} = {line.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(i, -1)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 touch-manipulation active:bg-neutral-600 sm:h-8 sm:w-8"
                          aria-label="Menos"
                        >
                          <Minus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(i, 1)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 touch-manipulation active:bg-neutral-600 sm:h-8 sm:w-8"
                          aria-label="Más"
                        >
                          <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(i)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-400/80 hover:bg-red-500/20 hover:text-red-400 touch-manipulation active:bg-red-500/30 sm:h-8 sm:w-8"
                          aria-label="Quitar"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 border-t border-neutral-700 pt-3">
                <p className="flex justify-between text-lg font-semibold text-neutral-100">
                  Total: <span>{cartTotal.toFixed(2)} {currency}</span>
                </p>
              </div>
            </div>

            {/* Payment type */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('contado')}
                className={cn(
                  'flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors active:scale-[0.98]',
                  paymentType === 'contado'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
                )}
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                Contado
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('cuenta')}
                className={cn(
                  'flex min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors active:scale-[0.98]',
                  paymentType === 'cuenta'
                    ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                Cuenta por cobrar
              </button>
            </div>

            {/* Modo de pago y nota (solo cuando es al contado, opcionales) */}
            {paymentType === 'contado' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Modo de pago (opcional)
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
                  >
                    <option value="">No especificado</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta débito">Tarjeta débito</option>
                    <option value="Tarjeta crédito">Tarjeta crédito</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Pago móvil">Pago móvil</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Nota (opcional)
                  </label>
                  <textarea
                    value={saleNote}
                    onChange={(e) => setSaleNote(e.target.value)}
                    placeholder="Ej: pago en dos partes, referencia de transferencia..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
                  />
                </div>
              </div>
            )}

            {/* Abono inicial y nota de la cuenta (solo cuando es cuenta por cobrar, opcionales) */}
            {paymentType === 'cuenta' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Abono inicial (opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">{currency}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-10 pr-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Nota del abono (opcional)
                  </label>
                  <input
                    type="text"
                    value={initialPaymentNote}
                    onChange={(e) => setInitialPaymentNote(e.target.value)}
                    placeholder="Ej: referencia de transferencia..."
                    className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Nota de la cuenta por cobrar (opcional)
                  </label>
                  <textarea
                    value={receivableNote}
                    onChange={(e) => setReceivableNote(e.target.value)}
                    placeholder="Ej: pagar en 2 cuotas, condiciones especiales..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 touch-manipulation"
                  />
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleCompleteSale}
              disabled={submitting || !selectedClient || cart.length === 0}
              className="min-h-[52px] w-full touch-manipulation text-base font-semibold active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : paymentType === 'contado' ? (
                <>
                  <Receipt className="h-5 w-5" />
                  Cobrar
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Crear cuenta por cobrar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* New client modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-neutral-100">Nuevo cliente</h3>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleNewClient} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Nombre *</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Teléfono *</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Cédula de identidad *</label>
                <div className="flex gap-2">
                  <select
                    value={newClientCedulaPrefix}
                    onChange={(e) => setNewClientCedulaPrefix(e.target.value as 'V' | 'E')}
                    className="h-10 w-14 shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  <input
                    type="text"
                    value={newClientCedulaNumber}
                    onChange={(e) => setNewClientCedulaNumber(e.target.value)}
                    required
                    placeholder="12345678"
                    className="h-10 flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Email (opcional)</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Dirección (opcional)</label>
                <input
                  type="text"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewClientModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creatingClient} className="flex-1">
                  {creatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: completar cédula del cliente (obligatoria para cobrar/crear cuenta) */}
      {showUpdateCedulaModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-neutral-100">Completar cédula del cliente</h3>
              <button
                type="button"
                onClick={() => {
                  setShowUpdateCedulaModal(false);
                  setMessage(null);
                }}
                className="rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-neutral-400">
              El cliente <strong className="text-neutral-200">{selectedClient.name || selectedClient.phone || 'seleccionado'}</strong> no tiene cédula registrada. Es obligatoria para cobrar o crear cuenta por cobrar.
            </p>
            <form onSubmit={handleUpdateClientCedula} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-neutral-400">Cédula de identidad *</label>
                <div className="flex gap-2">
                  <select
                    value={updateCedulaPrefix}
                    onChange={(e) => setUpdateCedulaPrefix(e.target.value as 'V' | 'E')}
                    className="h-10 w-14 shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  <input
                    type="text"
                    value={updateCedulaNumber}
                    onChange={(e) => setUpdateCedulaNumber(e.target.value)}
                    required
                    placeholder="12345678"
                    className="h-10 flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-neutral-100"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUpdateCedulaModal(false);
                    setMessage(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatingCedula} className="flex-1">
                  {updatingCedula ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cédula'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant/combination choice modal */}
      {variantChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-medium text-neutral-100">
                Elegir variante · {variantChoiceModal.productName}
              </h3>
              <button
                type="button"
                onClick={() => setVariantChoiceModal(null)}
                className="rounded p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-sm text-neutral-400">
              Selecciona la combinación que deseas agregar al carrito.
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {variantChoiceModal.options.map((opt) => {
                const priceDisplay = opt.unitPriceWithIva ?? opt.unitPrice;
                const isVariant = opt.combinationId != null || (opt.selectedVariants?.length ?? 0) > 0;
                const displayTitle = (() => {
                  let title = opt.displayName;
                  if (opt.selectedVariants) {
                    for (const sv of opt.selectedVariants) {
                      if (isHexColor(sv.variantValue) && (sv.variantName ?? '').trim()) {
                        const escaped = sv.variantValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        title = title.replace(new RegExp(escaped, 'gi'), sv.variantName);
                      }
                    }
                  }
                  return title;
                })();
                return (
                  <button
                    key={`${opt.productId}-${opt.combinationId ?? 'base'}`}
                    type="button"
                    onClick={() => {
                      addToCart(opt);
                      setVariantChoiceModal(null);
                    }}
                    disabled={opt.stock <= 0}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left transition-colors hover:bg-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-100">
                        {displayTitle}
                      </p>
                      {isVariant && opt.selectedVariants && opt.selectedVariants.length > 0 && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                          {opt.selectedVariants.map((sv) =>
                            isHexColor(sv.variantValue) ? (
                              <span key={sv.attributeId} className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full border border-neutral-600"
                                  style={{ backgroundColor: sv.variantValue }}
                                  title={`${sv.attributeName}: ${sv.variantName || sv.variantValue}`}
                                />
                                <span>{sv.attributeName}: {sv.variantName || sv.variantValue}</span>
                              </span>
                            ) : (
                              <span key={sv.attributeId}>
                                {sv.attributeName}: {sv.variantValue}
                              </span>
                            )
                          )}
                        </p>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                        {opt.sku && <span>Cód: {opt.sku}</span>}
                        <span>Stock: {opt.stock}</span>
                        {isVariant && opt.priceModifier != null && opt.priceModifier !== 0 && (
                          <span>
                            {opt.priceModifier > 0 ? '+' : ''}{opt.priceModifier.toFixed(2)} extra
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-neutral-200">
                      {priceDisplay.toFixed(2)} {opt.currency}
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ticket preview */}
      {showTicketPreview && lastSale && (() => {
        const store = authState.stores.find((s) => s.id === storeId);
        const storeInfo = {
          name: store?.name ?? lastSale.storeName ?? 'Tienda',
          logo: store?.logo ?? null,
          location: store?.location ?? null,
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-neutral-700 bg-white p-6 text-neutral-900 shadow-xl">
              <h3 className="mb-4 border-b border-neutral-200 pb-2 text-center font-semibold">
                Factura #{lastSale.saleNumber}
              </h3>
              <p className="text-center text-2xl font-bold">
                {lastSale.total.toFixed(2)} {lastSale.currency}
              </p>
              <p className="mt-2 text-center text-sm text-neutral-600">
                {new Date(lastSale.createdAt).toLocaleString('es')}
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    generateSalePdf(lastSale, storeInfo, {
                      fileName: `factura-${lastSale.saleNumber}.pdf`,
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
                  onClick={() => {
                    setShowTicketPreview(false);
                    setLastSale(null);
                  }}
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
