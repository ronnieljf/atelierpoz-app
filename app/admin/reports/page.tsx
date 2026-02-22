'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getFullReport,
  type FullReport,
} from '@/lib/services/reports';
import { getSales } from '@/lib/services/sales';
import { getExpenses } from '@/lib/services/expenses';
import { getPurchases } from '@/lib/services/purchases';
import { getPendingTotal as getReceivablesPendingTotal } from '@/lib/services/receivables';
import { useAuth } from '@/lib/store/auth-store';
import {
  BarChart3,
  Loader2,
  Calendar,
  Store,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDefaultMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-01`,
    dateTo: `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`,
  };
}

interface ReportData {
  income: {
    sales: number;
    salesCount: number;
    receivablesPaid: number;
    receivablesPaidCount: number;
    orders: number;
    ordersCount: number;
    unitsSold: number;
    receivablesPending: number;
  };
  expenses: {
    purchases: number;
    purchasesCount: number;
    accountsPayable: number;
    accountsPayableCount: number;
    accountsPayablePending: number;
    accountsPayablePendingCount: number;
  };
}

export default function ReportsPage() {
  const { state: authState } = useAuth();
  const [storeId, setStoreId] = useState('');
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultMonthRange();
  const [dateFrom, setDateFrom] = useState(defFrom);
  const [dateTo, setDateTo] = useState(defTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (authState.stores.length > 0 && !storeId) setStoreId(authState.stores[0].id);
  }, [authState.stores, storeId]);

  const runReport = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const [fullReport, salesResult, expensesResult, purchasesResult, expensesPaidResult, receivablesPending] = await Promise.all([
        getFullReport(storeId, { dateFrom, dateTo, limitSales: 0, limitUnsold: 0 }),
        getSales(storeId, { dateFrom, dateTo, limit: 1, offset: 0 }),
        getExpenses(storeId, { limit: 9999 }),
        getPurchases(storeId, { limit: 9999 }),
        getExpenses(storeId, { status: 'paid', limit: 9999 }),
        getReceivablesPendingTotal(storeId),
      ]);

      const exec = fullReport.executive;
      const salesTotal = exec.totalRevenueFromSales ?? 0;
      const receivablesPaid = exec.totalRevenueFromReceivablesPaid ?? 0;
      const receivablesPaidCount = exec.receivablesPaidCount ?? exec.manualReceivablesPaidCount ?? 0;
      const ordersRevenue = exec.totalRevenueFromOrdersExcludingLinked ?? 0;

      const allExpenses = expensesResult.expenses;
      const paidExpenses = expensesPaidResult.expenses;
      const pendingExpenses = allExpenses.filter(e => e.status === 'pending');
      const expPaidTotal = paidExpenses.reduce((s, e) => s + e.amount, 0);
      const expPendingTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0);

      const allPurchases = purchasesResult.purchases.filter(p => p.status === 'completed');
      const purchasesTotal = allPurchases.reduce((s, p) => s + p.total, 0);

      const recPendingByCurrency = receivablesPending.byCurrency;
      const recPendingTotal = Object.values(recPendingByCurrency).reduce((s, v) => s + v, 0);

      setData({
        income: {
          sales: salesTotal,
          salesCount: salesResult.total,
          receivablesPaid,
          receivablesPaidCount,
          orders: ordersRevenue,
          ordersCount: exec.ordersCompleted,
          unitsSold: exec.totalUnitsSold,
          receivablesPending: recPendingTotal,
        },
        expenses: {
          purchases: purchasesTotal,
          purchasesCount: allPurchases.length,
          accountsPayable: expPaidTotal,
          accountsPayableCount: paidExpenses.length,
          accountsPayablePending: expPendingTotal,
          accountsPayablePendingCount: pendingExpenses.length,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  }, [storeId, dateFrom, dateTo]);

  const totalIncome = data
    ? data.income.sales + data.income.receivablesPaid + data.income.orders
    : 0;
  const totalExpenses = data
    ? data.expenses.purchases + data.expenses.accountsPayable
    : 0;
  const balance = totalIncome - totalExpenses;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary-400" />
          Reportes
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Resumen financiero de tu negocio: ingresos, egresos y balance.
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-400">Tienda</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option value="">{authState.stores.length === 0 ? 'No hay tiendas' : 'Selecciona una tienda...'}</option>
                {authState.stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
                className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
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
                className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 pl-9 pr-3 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={runReport}
              disabled={loading || !storeId}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
              ) : (
                <><BarChart3 className="h-4 w-4" /> Generar reporte</>
              )}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Estado vacío */}
      {!data && !loading && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <BarChart3 className="mx-auto h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mt-4 mb-2 text-lg font-medium text-neutral-200">Genera un reporte</h3>
          <p className="text-sm text-neutral-400 max-w-sm mx-auto">
            Selecciona un rango de fechas y pulsa &ldquo;Generar reporte&rdquo; para ver el resumen financiero de tu negocio.
          </p>
        </div>
      )}

      {/* Resultados */}
      {data && (
        <div className="space-y-6">
          {/* ═══ BALANCE GENERAL ═══ */}
          <div className={cn(
            'rounded-2xl border p-5 sm:rounded-3xl sm:p-6',
            balance >= 0
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          )}>
            <div className="flex items-center gap-3 mb-4">
              <Scale className={cn('h-5 w-5', balance >= 0 ? 'text-green-400' : 'text-red-400')} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">Balance del periodo</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-center sm:text-left">
                <p className="text-xs text-green-400 font-medium mb-1">Total ingresos</p>
                <p className="text-2xl font-bold text-green-400">{formatMoney(totalIncome)}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-red-400 font-medium mb-1">Total egresos</p>
                <p className="text-2xl font-bold text-red-400">{formatMoney(totalExpenses)}</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-xs text-neutral-400 font-medium mb-1">Resultado</p>
                <p className={cn('text-2xl font-bold', balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {balance >= 0 ? '+' : ''}{formatMoney(balance)}
                </p>
              </div>
            </div>
          </div>

          {/* ═══ INGRESOS ═══ */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl overflow-hidden">
            <div className="border-b border-neutral-800 bg-green-500/5 px-5 py-3 sm:px-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-green-400">
                <TrendingUp className="h-4 w-4" />
                Ingresos
                <span className="ml-auto text-lg font-bold">{formatMoney(totalIncome)}</span>
              </h2>
            </div>
            <div className="divide-y divide-neutral-800/60">
              <Row
                label="Ventas al contado"
                amount={data.income.sales}
                detail={`${data.income.salesCount} ventas`}
                icon={<ArrowUpRight className="h-4 w-4 text-green-400" />}
              />
              <Row
                label="Cuentas por cobrar (cobradas)"
                amount={data.income.receivablesPaid}
                detail={`${data.income.receivablesPaidCount} cuentas cobradas`}
                icon={<ArrowUpRight className="h-4 w-4 text-green-400" />}
              />
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 bg-amber-500/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <ArrowUpRight className="h-4 w-4 text-amber-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-300">Cuentas por cobrar (pendientes)</p>
                    <p className="text-xs text-amber-400/70">Total pendiente de cobro a clientes</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-amber-400 shrink-0 ml-3">
                  {formatMoney(data.income.receivablesPending)}
                </p>
              </div>
              <Row
                label="Pedidos completados"
                amount={data.income.orders}
                detail={`${data.income.ordersCount} pedidos · ${data.income.unitsSold} unidades`}
                icon={<ArrowUpRight className="h-4 w-4 text-green-400" />}
              />
            </div>
          </div>

          {/* ═══ EGRESOS ═══ */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl overflow-hidden">
            <div className="border-b border-neutral-800 bg-red-500/5 px-5 py-3 sm:px-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
                <TrendingDown className="h-4 w-4" />
                Egresos
                <span className="ml-auto text-lg font-bold">{formatMoney(totalExpenses)}</span>
              </h2>
            </div>
            <div className="divide-y divide-neutral-800/60">
              <Row
                label="Compras al contado"
                amount={data.expenses.purchases}
                detail={`${data.expenses.purchasesCount} compras`}
                icon={<ArrowDownRight className="h-4 w-4 text-red-400" />}
                negative
              />
              <Row
                label="Cuentas por pagar (pagadas)"
                amount={data.expenses.accountsPayable}
                detail={`${data.expenses.accountsPayableCount} cuentas pagadas`}
                icon={<ArrowDownRight className="h-4 w-4 text-red-400" />}
                negative
              />
              <div className="flex items-center justify-between px-5 py-4 sm:px-6 bg-amber-500/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <ArrowDownRight className="h-4 w-4 text-amber-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-amber-300">Cuentas por pagar (pendientes)</p>
                    <p className="text-xs text-amber-400/70">{data.expenses.accountsPayablePendingCount} cuentas pendientes de pago</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-amber-400 shrink-0 ml-3">
                  {formatMoney(data.expenses.accountsPayablePending)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  amount,
  detail,
  icon,
  negative,
}: {
  label: string;
  amount: number;
  detail: string;
  icon: React.ReactNode;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          negative ? 'bg-red-500/10' : 'bg-green-500/10'
        )}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-200">{label}</p>
          <p className="text-xs text-neutral-500">{detail}</p>
        </div>
      </div>
      <p className={cn(
        'text-sm font-semibold shrink-0 ml-3',
        negative ? 'text-red-400' : 'text-green-400'
      )}>
        {formatMoney(amount)}
      </p>
    </div>
  );
}
