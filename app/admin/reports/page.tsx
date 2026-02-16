'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getFullReport,
  getRevenueOverTime,
  type FullReport,
  type RevenueOverTimeResponse,
  type RevenueBucket,
} from '@/lib/services/reports';
import { useAuth } from '@/lib/store/auth-store';
import { BarChart3, Loader2, Calendar, Store, DollarSign, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils/cn';

const ALL_STORES_ID = '';

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

/** Agrega buckets de varias tiendas por fecha (suma ingresos y pedidos). */
function mergeRevenueBuckets(bucketsByStore: { storeName: string; buckets: RevenueBucket[] }[]): RevenueBucket[] {
  const byDate = new Map<string, RevenueBucket>();
  for (const { buckets } of bucketsByStore) {
    for (const b of buckets) {
      const existing = byDate.get(b.date);
      if (!existing) {
        byDate.set(b.date, { ...b });
      } else {
        existing.ordersCount += b.ordersCount;
        existing.revenueFromOrders += b.revenueFromOrders;
        existing.revenueFromManualReceivables += b.revenueFromManualReceivables;
        existing.revenue += b.revenue;
      }
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export default function ReportsPage() {
  const { state: authState, loadStores } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(ALL_STORES_ID);
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultMonthRange();
  const [dateFrom, setDateFrom] = useState(defFrom);
  const [dateTo, setDateTo] = useState(defTo);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [fullReportsByStore, setFullReportsByStore] = useState<{ storeId: string; storeName: string; report: FullReport }[]>([]);
  const [revenueOverTimeByStore, setRevenueOverTimeByStore] = useState<{ storeId: string; storeName: string; data: RevenueOverTimeResponse }[]>([]);
  const [aggregatedBuckets, setAggregatedBuckets] = useState<RevenueBucket[]>([]);

  useEffect(() => {
    if (authState.user && authState.stores.length === 0 && loadStores) {
      loadStores().catch(() => setMessage({ type: 'error', text: 'Error al cargar tiendas' }));
    }
  }, [authState.user, authState.stores.length, loadStores]);

  useEffect(() => {
    if (authState.stores.length === 1 && selectedStoreId === ALL_STORES_ID) {
      setSelectedStoreId(authState.stores[0].id);
    }
  }, [authState.stores, selectedStoreId]);

  const runReport = useCallback(async () => {
    const stores = selectedStoreId === ALL_STORES_ID ? authState.stores : authState.stores.filter((s) => s.id === selectedStoreId);
    if (stores.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona al menos una tienda o "Todas las tiendas".' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setFullReportsByStore([]);
    setRevenueOverTimeByStore([]);
    setAggregatedBuckets([]);
    try {
      const opts = { dateFrom, dateTo, limitSales: 50, limitUnsold: 50 };
      const fullPromises = stores.map((s) =>
        getFullReport(s.id, opts).then((report) => ({ storeId: s.id, storeName: s.name, report }))
      );
      const revenuePromises = stores.map((s) =>
        getRevenueOverTime(s.id, { dateFrom, dateTo, groupBy: 'day' }).then((data) => ({ storeId: s.id, storeName: s.name, data }))
      );
      const fullResults = await Promise.all(fullPromises);
      const revenueResults = await Promise.all(revenuePromises);

      setFullReportsByStore(fullResults);
      setRevenueOverTimeByStore(revenueResults);
      if (revenueResults.length > 0) {
        const merged = mergeRevenueBuckets(revenueResults.map((r) => ({ storeName: r.storeName, buckets: r.data.buckets })));
        setAggregatedBuckets(merged);
      }
      setMessage({ type: 'success', text: 'Reporte generado.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al generar el reporte',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, dateFrom, dateTo, authState.stores]);

  const isAllStores = selectedStoreId === ALL_STORES_ID;
  const hasData = fullReportsByStore.length > 0;

  const summary = hasData
    ? fullReportsByStore.reduce(
        (acc, { report }) => {
          const e = report.executive;
          acc.totalRevenue += e.totalRevenue;
          acc.ordersCompleted += e.ordersCompleted;
          acc.receivablesPaidCount += e.receivablesPaidCount ?? e.manualReceivablesPaidCount ?? 0;
          acc.totalUnitsSold += e.totalUnitsSold;
          acc.totalRevenueFromSales += e.totalRevenueFromSales ?? 0;
          acc.totalRevenueFromReceivablesPaid += e.totalRevenueFromReceivablesPaid ?? 0;
          acc.totalRevenueFromOrders += e.totalRevenueFromOrders;
          acc.totalRevenueFromOrdersExcludingLinked += e.totalRevenueFromOrdersExcludingLinked ?? 0;
          acc.totalRevenueFromManualReceivables += e.totalRevenueFromManualReceivables;
          return acc;
        },
        {
          totalRevenue: 0,
          ordersCompleted: 0,
          receivablesPaidCount: 0,
          totalUnitsSold: 0,
          totalRevenueFromSales: 0,
          totalRevenueFromReceivablesPaid: 0,
          totalRevenueFromOrders: 0,
          totalRevenueFromOrdersExcludingLinked: 0,
          totalRevenueFromManualReceivables: 0,
        }
      )
    : null;

  const chartData = aggregatedBuckets.map((b) => ({
    fecha: formatDate(b.date),
    date: b.date,
    Ingresos: b.revenue,
    Pedidos: b.revenueFromOrders,
    CuentasCobradas: b.revenueFromManualReceivables,
    PedidosCount: b.ordersCount,
  }));

  return (
    <div className="space-y-6 px-2 sm:px-0 max-w-full overflow-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-100 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary-400" />
          Reportes
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Ventas, pedidos y cuentas por cobrar por rango de fechas y por tienda.
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Tienda</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              >
                <option value={ALL_STORES_ID}>Todas las tiendas</option>
                {authState.stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-neutral-700/80 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={runReport}
              disabled={loading || authState.stores.length === 0}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
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

      {!hasData && !loading && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-8 sm:p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-neutral-600" />
          <p className="mt-4 text-neutral-300 font-medium">Ver reportes</p>
          <p className="mt-2 text-sm text-neutral-500 max-w-sm mx-auto">
            Elige el rango de fechas y una tienda (o Todas). Pulsa <strong className="text-neutral-400">Generar reporte</strong> para ver resumen, tabla por tienda y gráfico de ingresos.
          </p>
        </div>
      )}

      {hasData && summary && (
        <div className="space-y-6">
          {/* Resumen: tarjetas simples. Total = Ventas + Cuentas cobradas + Pedidos (sin cuenta vinculada) */}
          {(() => {
            const sales = summary.totalRevenueFromSales ?? 0;
            const receivables = summary.totalRevenueFromReceivablesPaid ?? 0;
            const ordersExcl = summary.totalRevenueFromOrdersExcludingLinked ?? 0;
            const computedTotal = sales + receivables + ordersExcl;
            return (
          <div>
            <p className="text-xs text-neutral-500 mb-2">
              {fullReportsByStore[0] && (
                <>
                  Periodo: {formatDate(fullReportsByStore[0].report.period.dateFrom)} – {formatDate(fullReportsByStore[0].report.period.dateTo)}
                </>
              )}
            </p>
            <h2 className="text-sm font-medium text-neutral-400 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumen del periodo
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
                <p className="text-xs font-medium text-primary-300/90">Ingresos totales</p>
                <p className="text-xl font-semibold text-neutral-100 mt-1">{formatMoney(computedTotal)}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Ventas: {formatMoney(sales)} + Cuentas cobradas: {formatMoney(receivables)} + Pedidos (sin cuenta vinculada): {formatMoney(ordersExcl)}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/50 p-4">
                <p className="text-xs font-medium text-neutral-400">Pedidos completados</p>
                <p className="text-xl font-semibold text-neutral-100 mt-1">{summary.ordersCompleted}</p>
                <p className="text-xs text-neutral-500 mt-0.5">Ingresos por pedidos sin cuenta vinculada: {formatMoney(ordersExcl)}</p>
              </div>
              <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/50 p-4">
                <p className="text-xs font-medium text-neutral-400">Cuentas por cobrar cobradas</p>
                <p className="text-xl font-semibold text-neutral-100 mt-1">{summary.receivablesPaidCount}</p>
                <p className="text-xs text-neutral-500 mt-0.5">Ingresos por cuentas cobradas (manual y con pedido): {formatMoney(receivables)}</p>
              </div>
              <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/50 p-4">
                <p className="text-xs font-medium text-neutral-400">Unidades vendidas</p>
                <p className="text-xl font-semibold text-neutral-100 mt-1">{summary.totalUnitsSold.toLocaleString('es-ES')}</p>
              </div>
            </div>
          </div>
            );
          })()}

          {/* Por tienda (tabla simple) */}
          <div>
            <h2 className="text-sm font-medium text-neutral-400 mb-3 flex items-center gap-2">
              <Store className="h-4 w-4" />
              Por tienda
            </h2>
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-neutral-700/80 text-left text-neutral-400">
                      <th className="px-4 py-3 font-medium">Tienda</th>
                      <th className="px-4 py-3 text-right font-medium">Ingresos</th>
                      <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                      <th className="px-4 py-3 text-right font-medium">Cuentas cobradas</th>
                      <th className="px-4 py-3 text-right font-medium">Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullReportsByStore.map(({ storeName, report }, idx) => {
                      const e = report.executive;
                      const storeTotal = (e.totalRevenueFromSales ?? 0) + (e.totalRevenueFromReceivablesPaid ?? 0) + (e.totalRevenueFromOrdersExcludingLinked ?? 0);
                      return (
                        <tr
                          key={report.period.dateFrom + storeName}
                          className={cn(
                            'border-b border-neutral-800/60',
                            idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'
                          )}
                        >
                          <td className="px-4 py-3 text-neutral-200 font-medium">{storeName}</td>
                          <td className="px-4 py-3 text-right text-neutral-200">{formatMoney(storeTotal)}</td>
                          <td className="px-4 py-3 text-right text-neutral-200">{e.ordersCompleted}</td>
                          <td className="px-4 py-3 text-right text-neutral-200">{e.receivablesPaidCount ?? e.manualReceivablesPaidCount}</td>
                          <td className="px-4 py-3 text-right text-neutral-200">{e.totalUnitsSold}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Gráfico: ingresos en el tiempo */}
          {chartData.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-neutral-400 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Ingresos en el tiempo
              </h2>
              <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-4 sm:p-5">
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#a3a3a3', fontSize: 11 }}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgb(38 38 38)',
                          border: '1px solid rgb(64 64 64)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#e5e5e5' }}
                        formatter={(value: number | undefined) => [value != null ? formatMoney(value) : '—', '']}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={() => 'Ingresos'}
                        iconType="rect"
                        iconSize={10}
                      />
                      <Bar dataKey="Ingresos" fill="rgb(168 85 247)" radius={[4, 4, 0, 0]} name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {chartData.length === 0 && hasData && (
            <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-6 text-center text-sm text-neutral-500">
              No hay ingresos registrados día a día en este periodo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
