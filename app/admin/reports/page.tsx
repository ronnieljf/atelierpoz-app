'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getFullReport,
  getRevenueOverTime,
  getTopProducts,
  getCancelledOrdersReport,
  type FullReport,
  type RevenueOverTimeResponse,
  type TopProductsResponse,
  type CancelledOrdersReport,
} from '@/lib/services/reports';
import { useAuth } from '@/lib/store/auth-store';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Package,
  XCircle,
  Calendar,
  Store,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDefaultMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const dateTo = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;
  const dateFrom = `${y}-${m}-01`;
  return { dateFrom, dateTo };
}

export default function ReportsPage() {
  const { state: authState, loadStores } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultMonthRange();
  const [dateFrom, setDateFrom] = useState(defFrom);
  const [dateTo, setDateTo] = useState(defTo);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasReport, setHasReport] = useState(false);

  const [fullReport, setFullReport] = useState<FullReport | null>(null);
  const [revenueOverTime, setRevenueOverTime] = useState<RevenueOverTimeResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsResponse | null>(null);
  const [cancelledReport, setCancelledReport] = useState<CancelledOrdersReport | null>(null);

  const [openSection, setOpenSection] = useState<string>('executive');

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

  useEffect(() => {
    if (authState.stores.length === 1 && !selectedStoreId) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId]);

  const runReport = useCallback(async () => {
    if (!selectedStoreId) {
      setMessage({ type: 'error', text: 'Selecciona una tienda' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setFullReport(null);
    setRevenueOverTime(null);
    setTopProducts(null);
    setCancelledReport(null);
    setHasReport(false);
    try {
      const [full, revenue, top, cancelled] = await Promise.all([
        getFullReport(selectedStoreId, { dateFrom, dateTo, limitSales: 200, limitUnsold: 200 }),
        getRevenueOverTime(selectedStoreId, { dateFrom, dateTo, groupBy: 'day' }),
        getTopProducts(selectedStoreId, { dateFrom, dateTo, limit: 20, sortBy: 'revenue' }),
        getCancelledOrdersReport(selectedStoreId, { dateFrom, dateTo, limit: 50 }),
      ]);
      setFullReport(full);
      setRevenueOverTime(revenue);
      setTopProducts(top);
      setCancelledReport(cancelled);
      setHasReport(true);
      setMessage({ type: 'success', text: 'Listo. Abre cada sección para ver el detalle.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al generar el reporte',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, dateFrom, dateTo]);

  const toggleSection = (id: string) => {
    setOpenSection((s) => (s === id ? '' : id));
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 max-w-full overflow-hidden">
      {/* Título */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-100 flex items-center gap-2 flex-wrap">
          <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400 flex-shrink-0" />
          Reportes
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Revisa ventas, ingresos, productos más vendidos y pedidos cancelados por periodo.
        </p>
        <div className="mt-3 rounded-xl border border-primary-500/15 bg-primary-500/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm">
          <p className="font-medium text-primary-200/90 mb-1.5">¿Cómo funciona?</p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-xs sm:text-[13px]">
            <li>Elige la tienda y las fechas que quieres ver.</li>
            <li>Pulsa <strong className="text-neutral-300">Generar reporte</strong>.</li>
            <li>Abre cada sección para ver el detalle (resumen, ventas, ingresos por día, etc.).</li>
          </ol>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3 sm:p-5 shadow-sm min-w-0">
        {hasReport && fullReport && (
          <p className="mb-3 text-xs font-medium text-primary-400/90">
            Reporte: {formatDate(fullReport.period.dateFrom)} – {formatDate(fullReport.period.dateTo)}
          </p>
        )}
        <p className="mb-3 text-xs text-neutral-500">
          {hasReport ? 'Cambia tienda o fechas y vuelve a generar para ver otro periodo.' : 'Por defecto se usa el mes actual.'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Tienda</label>
            <div className="relative min-w-0">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full min-w-0 min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50 touch-manipulation"
              >
                <option value="">Seleccionar tienda</option>
                {authState.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Desde</label>
            <div className="relative min-w-0 overflow-hidden">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-w-0 max-w-full min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50 touch-manipulation"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Hasta</label>
            <div className="relative min-w-0 overflow-hidden">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-w-0 max-w-full min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50 touch-manipulation"
              />
            </div>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1 min-w-0">
            <button
              type="button"
              onClick={runReport}
              disabled={loading || !selectedStoreId}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando…
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Generar reporte
                </>
              )}
            </button>
          </div>
        </div>
        {message && (
          <p
            className={cn(
              'mt-3 text-sm',
              message.type === 'error' ? 'text-red-400' : 'text-green-400'
            )}
          >
            {message.text}
          </p>
        )}
      </div>

      {!hasReport && !loading && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-6 sm:p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-neutral-800/80">
            <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 text-neutral-500" />
          </div>
          <p className="mt-4 text-neutral-200 font-medium">Ver tu reporte</p>
          <p className="mt-2 max-w-sm mx-auto text-sm text-neutral-500 px-2">
            Elige una tienda, las fechas y pulsa <strong className="text-neutral-400">Generar reporte</strong>. En unos segundos tendrás el resumen listo.
          </p>
        </div>
      )}

      {hasReport && fullReport && (
        <div className="space-y-3">
          {/* Resumen ejecutivo */}
          <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('executive')}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
            >
              <div className="text-left min-w-0 flex-1">
                <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                  <TrendingUp className="h-4 w-4 text-primary-400 flex-shrink-0" />
                  Resumen del periodo
                </span>
                <p className="mt-0.5 text-xs font-normal text-neutral-500">
                  Lo más importante en un vistazo: ingresos, ventas y pedidos
                </p>
              </div>
              {openSection === 'executive' ? (
                <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              )}
            </button>
            {openSection === 'executive' && (
              <div className="border-t border-neutral-800/80 px-3 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
                <p className="text-xs text-neutral-500 mb-4">
                  Periodo: {formatDate(fullReport.period.dateFrom)} – {formatDate(fullReport.period.dateTo)}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-primary-500/20 bg-primary-500/10 p-3 min-w-0">
                    <p className="text-xs font-medium text-primary-300/90">Ingresos totales</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Pedidos + cuentas manuales cobradas</p>
                    <p className="text-lg sm:text-xl font-semibold text-neutral-100 mt-1 break-words">
                      {formatMoney(fullReport.executive.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-neutral-800/50 p-3 min-w-0">
                    <p className="text-xs font-medium text-neutral-400">Unidades vendidas</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Cantidad total de productos vendidos</p>
                    <p className="text-lg font-semibold text-neutral-100 mt-1">
                      {fullReport.executive.totalUnitsSold.toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-neutral-800/50 p-3 min-w-0">
                    <p className="text-xs font-medium text-neutral-400">Pedidos completados</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Número de pedidos que se cerraron</p>
                    <p className="text-lg font-semibold text-neutral-100 mt-1">
                      {fullReport.executive.ordersCompleted}
                    </p>
                  </div>
                  <div className="rounded-lg bg-neutral-800/50 p-3 min-w-0">
                    <p className="text-xs font-medium text-neutral-400">Cuentas manuales cobradas</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Cuentas por cobrar sin pedido cobradas en el periodo</p>
                    <p className="text-lg font-semibold text-neutral-100 mt-1">
                      {fullReport.executive.manualReceivablesPaidCount}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {formatMoney(fullReport.executive.totalRevenueFromManualReceivables)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-neutral-800/50 p-3 min-w-0">
                    <p className="text-xs font-medium text-neutral-400">Conversión de productos</p>
                    <p className="text-xs text-neutral-500 mt-0.5">% del catálogo que vendió al menos 1 unidad</p>
                    <p className="text-lg font-semibold text-neutral-100 mt-1">
                      {fullReport.executive.conversionProducts}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-800/60 flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-x-4 text-xs sm:text-sm text-neutral-400">
                  <span>Ingresos por pedidos: {formatMoney(fullReport.executive.totalRevenueFromOrders)}</span>
                  <span>Cuentas manuales cobradas: {formatMoney(fullReport.executive.totalRevenueFromManualReceivables)}</span>
                  <span>Productos con ventas: {fullReport.executive.productsWithSales}</span>
                  <span>Productos sin ventas: {fullReport.executive.productsWithNoSales}</span>
                </div>
              </div>
            )}
          </section>

          {/* Ventas por producto */}
          <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('sales')}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
            >
              <div className="text-left min-w-0 flex-1">
                <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                  <Package className="h-4 w-4 text-primary-400 flex-shrink-0" />
                  Lo que sí vendiste ({fullReport.sales.byProduct.length} productos
                  {(fullReport.sales.manualReceivablesPaid?.length ?? 0) > 0 &&
                    `, ${fullReport.sales.manualReceivablesPaid?.length ?? 0} cuentas manuales cobradas`}
                  )
                </span>
                <p className="mt-0.5 text-xs font-normal text-neutral-500">
                  Productos vendidos en el periodo y cuentas por cobrar manuales (sin pedido) cobradas
                </p>
              </div>
              {openSection === 'sales' ? (
                <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              )}
            </button>
            {openSection === 'sales' && (
              <div className="border-t border-neutral-800/80">
                {fullReport.sales.byProduct.length === 0 && (!fullReport.sales.manualReceivablesPaid || fullReport.sales.manualReceivablesPaid.length === 0) ? (
                  <p className="py-6 text-center text-sm text-neutral-500 px-3">
                    No hubo ventas de productos ni cuentas manuales cobradas en este periodo.
                  </p>
                ) : (
                  <>
                    {/* Mobile: cards */}
                    <div className="md:hidden divide-y divide-neutral-800/60">
                      {fullReport.sales.byProduct.map((row) => (
                        <div key={row.productId} className="px-3 py-3 bg-neutral-900/30 first:bg-transparent">
                          <p className="font-medium text-neutral-100 text-sm">{row.productName}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{row.categoryName ?? '—'}</p>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-neutral-400">Unidades</span>
                            <span className="text-neutral-200">{row.unitsSold}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-400">Ingresos</span>
                            <span className="text-neutral-200 font-medium">{formatMoney(row.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead>
                          <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                            <th className="px-4 py-3 font-medium">Producto</th>
                            <th className="px-4 py-3 font-medium">Categoría</th>
                            <th className="px-4 py-3 font-medium text-right">Unidades</th>
                            <th className="px-4 py-3 font-medium text-right">Ingresos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullReport.sales.byProduct.map((row, idx) => (
                            <tr key={row.productId} className={cn('border-b border-neutral-800/60', idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent', 'hover:bg-neutral-800/40')}>
                              <td className="px-4 py-2.5 text-neutral-200">{row.productName}</td>
                              <td className="px-4 py-2.5 text-neutral-400">{row.categoryName ?? '—'}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-200">{row.unitsSold}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-200">{formatMoney(row.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(fullReport.sales.manualReceivablesPaid?.length ?? 0) > 0 && (
                      <div className="px-3 sm:px-4 py-3 border-t border-neutral-700/80">
                        <p className="text-xs font-medium text-neutral-400 mb-0.5">Cuentas por cobrar manuales cobradas en el periodo</p>
                        <p className="text-xs text-neutral-500 mb-2">Cuentas creadas sin pedido que se cobraron en el rango de fechas seleccionado.</p>
                        <ul className="space-y-1 text-sm text-neutral-300">
                          {(fullReport.sales.manualReceivablesPaid ?? []).map((r) => (
                            <li key={r.receivableId}>
                              #{r.receivableNumber} {r.customerName ?? 'Sin nombre'} – {formatMoney(r.amount, r.currency)} ({formatDate(r.paidAt)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Productos no vendidos */}
          <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection('unsold')}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
            >
              <div className="text-left min-w-0 flex-1">
                <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                  <Package className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  Lo que no vendiste ({fullReport.unsold.productsNotSold.length} productos)
                </span>
                <p className="mt-0.5 text-xs font-normal text-neutral-500">
                  Productos del catálogo que no tuvieron ninguna venta en el periodo
                </p>
              </div>
              {openSection === 'unsold' ? (
                <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
              )}
            </button>
            {openSection === 'unsold' && (
              <div className="border-t border-neutral-800/80">
                {fullReport.unsold.productsNotSold.length === 0 ? (
                  <p className="py-6 text-center text-sm text-neutral-500 px-3">Todos los productos tuvieron al menos una venta en este periodo.</p>
                ) : (
                  <>
                    <div className="md:hidden divide-y divide-neutral-800/60">
                      {fullReport.unsold.productsNotSold.map((row) => (
                        <div key={row.productId} className="px-3 py-3 bg-neutral-900/30 first:bg-transparent">
                          <p className="font-medium text-neutral-100 text-sm">{row.productName}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{row.categoryName ?? '—'}</p>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-neutral-400">Precio base</span>
                            <span className="text-neutral-200">{formatMoney(row.basePrice, row.currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-400">Stock</span>
                            <span className="text-neutral-200">{row.stock}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                            <th className="px-4 py-3 font-medium">Producto</th>
                            <th className="px-4 py-3 font-medium">Categoría</th>
                            <th className="px-4 py-3 font-medium text-right">Precio base</th>
                            <th className="px-4 py-3 font-medium text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullReport.unsold.productsNotSold.map((row, idx) => (
                            <tr key={row.productId} className={cn('border-b border-neutral-800/60', idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent', 'hover:bg-neutral-800/40')}>
                              <td className="px-4 py-2.5 text-neutral-200">{row.productName}</td>
                              <td className="px-4 py-2.5 text-neutral-400">{row.categoryName ?? '—'}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-200">{formatMoney(row.basePrice, row.currency)}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-200">{row.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Ingresos en el tiempo */}
          {revenueOverTime && (
            <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('revenue')}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
              >
                <div className="text-left min-w-0 flex-1">
                  <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                    <DollarSign className="h-4 w-4 text-primary-400 flex-shrink-0" />
                    Ingresos día a día
                  </span>
                  <p className="mt-0.5 text-xs font-normal text-neutral-500">
                    Cuánto entró cada día (pedidos y cuentas cobradas)
                  </p>
                </div>
                {openSection === 'revenue' ? (
                  <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                )}
              </button>
              {openSection === 'revenue' && (
                <div className="border-t border-neutral-800/80 px-3 pb-4 pt-2 sm:px-5 sm:pb-5">
                  {revenueOverTime.buckets.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-500">No hay ingresos registrados en este periodo.</p>
                  ) : (
                    <>
                      <div className="md:hidden divide-y divide-neutral-800/60">
                        {revenueOverTime.buckets.map((b) => (
                          <div key={b.date} className="py-3 first:pt-2">
                            <p className="font-medium text-neutral-100 text-sm">{formatDate(b.date)}</p>
                            <div className="mt-1 flex justify-between text-sm">
                              <span className="text-neutral-400">Pedidos</span>
                              <span className="text-neutral-200">{b.ordersCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-400">Ingresos</span>
                              <span className="text-neutral-200 font-medium">{formatMoney(b.revenue, b.currency)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm min-w-[320px]">
                          <thead>
                            <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                              <th className="py-2 font-medium">Fecha</th>
                              <th className="py-2 text-right font-medium">Pedidos</th>
                              <th className="py-2 text-right font-medium">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenueOverTime.buckets.map((b, idx) => (
                              <tr key={b.date} className={cn('border-b border-neutral-800/60', idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent', 'hover:bg-neutral-800/40')}>
                                <td className="py-2 text-neutral-200">{formatDate(b.date)}</td>
                                <td className="py-2 text-right text-neutral-200">{b.ordersCount}</td>
                                <td className="py-2 text-right text-neutral-200">{formatMoney(b.revenue, b.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Top productos */}
          {topProducts && (
            <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('top')}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
              >
                <div className="text-left min-w-0 flex-1">
                  <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                    <TrendingUp className="h-4 w-4 text-primary-400 flex-shrink-0" />
                    Los que más ingresos generaron {topProducts.top.length > 0 && `(${topProducts.top.length})`}
                  </span>
                  <p className="mt-0.5 text-xs font-normal text-neutral-500">
                    Ordenados por dinero generado en el periodo
                  </p>
                </div>
                {openSection === 'top' ? (
                  <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                )}
              </button>
              {openSection === 'top' && (
                <div className="border-t border-neutral-800/80">
                  {topProducts.top.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-500 px-3">No hay ventas en este periodo.</p>
                  ) : (
                    <>
                      <div className="md:hidden divide-y divide-neutral-800/60">
                        {topProducts.top.map((row, idx) => (
                          <div key={row.productId} className="px-3 py-3 bg-neutral-900/30 first:bg-transparent">
                            <p className="font-medium text-neutral-100 text-sm">
                              {idx + 1}. {row.productName}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5">{row.categoryName ?? '—'}</p>
                            <div className="mt-2 flex justify-between text-sm">
                              <span className="text-neutral-400">Unidades</span>
                              <span className="text-neutral-200">{row.unitsSold}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-400">Ingresos</span>
                              <span className="text-neutral-200 font-medium">{formatMoney(row.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                              <th className="px-4 py-3 font-medium">Producto</th>
                              <th className="px-4 py-3 font-medium">Categoría</th>
                              <th className="px-4 py-3 font-medium text-right">Unidades</th>
                              <th className="px-4 py-3 font-medium text-right">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topProducts.top.map((row, idx) => (
                              <tr key={row.productId} className={cn('border-b border-neutral-800/60', idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent', 'hover:bg-neutral-800/40')}>
                                <td className="px-4 py-2.5 text-neutral-200">{row.productName}</td>
                                <td className="px-4 py-2.5 text-neutral-400">{row.categoryName ?? '—'}</td>
                                <td className="px-4 py-2.5 text-right text-neutral-200">{row.unitsSold}</td>
                                <td className="px-4 py-2.5 text-right text-neutral-200">{formatMoney(row.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Pedidos cancelados */}
          {cancelledReport && (
            <section className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('cancelled')}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5 text-left hover:bg-neutral-800/30 transition-colors rounded-t-xl touch-manipulation min-w-0"
              >
                <div className="text-left min-w-0 flex-1">
                  <span className="font-medium text-neutral-100 flex items-center gap-2 flex-wrap">
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    Pedidos cancelados ({cancelledReport.summary.cancelledOrdersCount})
                  </span>
                  <p className="mt-0.5 text-xs font-normal text-neutral-500">
                    Pedidos que se cancelaron en el periodo (valor que no se cobró)
                  </p>
                </div>
                {openSection === 'cancelled' ? (
                  <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-neutral-500 flex-shrink-0" />
                )}
              </button>
              {openSection === 'cancelled' && (
                <div className="border-t border-neutral-800/80 px-3 pb-4 pt-2 sm:px-5 sm:pb-5">
                  <p className="text-sm text-neutral-400 mb-3">
                    <strong>Valor que no se cobró:</strong> {formatMoney(cancelledReport.summary.totalValueLost)}
                  </p>
                  {cancelledReport.cancelledOrders.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-500">No hay pedidos cancelados en este periodo.</p>
                  ) : (
                    <>
                      <div className="md:hidden divide-y divide-neutral-800/60">
                        {cancelledReport.cancelledOrders.map((o) => (
                          <div key={o.requestId} className="py-3 first:pt-0">
                            <p className="font-medium text-neutral-100 text-sm">#{o.orderNumber}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{o.customerName ?? o.customerPhone ?? '—'}</p>
                            <div className="mt-2 flex justify-between text-sm">
                              <span className="text-neutral-400">Total</span>
                              <span className="text-neutral-200 font-medium">{formatMoney(o.total, o.currency)}</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">{formatDate(o.updatedAt)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm min-w-[400px]">
                          <thead>
                            <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                              <th className="py-2 font-medium">Pedido</th>
                              <th className="py-2 font-medium">Cliente</th>
                              <th className="py-2 text-right font-medium">Total</th>
                              <th className="py-2 font-medium">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cancelledReport.cancelledOrders.map((o, idx) => (
                              <tr key={o.requestId} className={cn('border-b border-neutral-800/60', idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent', 'hover:bg-neutral-800/40')}>
                                <td className="py-2 text-neutral-200">#{o.orderNumber}</td>
                                <td className="py-2 text-neutral-400">{o.customerName ?? o.customerPhone ?? '—'}</td>
                                <td className="py-2 text-right text-neutral-200">{formatMoney(o.total, o.currency)}</td>
                                <td className="py-2 text-neutral-400">{formatDate(o.updatedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
