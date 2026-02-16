/**
 * Servicio de reportes inteligentes (API backend).
 */

import { httpClient } from '@/lib/http/client';

export interface ReportPeriod {
  dateFrom: string;
  dateTo: string;
}

export interface SalesSummary {
  totalUnitsSold: number;
  totalRevenueFromOrders: number;
  totalRevenueFromManualReceivables: number;
  totalRevenueFromManualReceivablesByCurrency: Record<string, number>;
  totalRevenue: number;
  ordersCount: number;
  productsWithSales: number;
  manualReceivablesPaidCount: number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitsSold: number;
  revenue: number;
}

export interface SalesByCategory {
  categoryId: string | null;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  products: Array<{ productId: string; productName: string; unitsSold: number; revenue: number }>;
}

export interface ManualReceivablePaid {
  receivableId: string;
  receivableNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  amount: number;
  currency: string;
  paidAt: string;
}

export interface SalesReport {
  period: ReportPeriod;
  summary: SalesSummary;
  byProduct: SalesByProduct[];
  byCategory?: SalesByCategory[];
  manualReceivablesPaid?: ManualReceivablePaid[];
}

export interface UnsoldSummary {
  productsNotSold: number;
  totalProductsInStore: number;
  productsThatSold: number;
  onlyWithStock: boolean;
}

export interface ProductNotSold {
  productId: string;
  productName: string;
  sku: string | null;
  basePrice: number;
  currency: string;
  stock: number;
  categoryId: string | null;
  categoryName: string | null;
  visibleInStore: boolean;
}

export interface UnsoldReport {
  period: ReportPeriod;
  summary: UnsoldSummary;
  productsNotSold: ProductNotSold[];
}

export interface FullReportExecutive {
  period: ReportPeriod;
  totalUnitsSold: number;
  totalRevenueFromOrders: number;
  totalRevenueFromManualReceivables: number;
  totalRevenueFromManualReceivablesByCurrency: Record<string, number>;
  totalRevenue: number;
  ordersCompleted: number;
  manualReceivablesPaidCount: number;
  productsWithSales: number;
  productsWithNoSales: number;
  totalProductsInStore: number;
  conversionProducts: string;
}

export interface FullReport {
  executive: FullReportExecutive;
  sales: {
    summary: SalesSummary;
    byProduct: SalesByProduct[];
    byCategory?: SalesByCategory[];
    manualReceivablesPaid?: ManualReceivablePaid[];
  };
  unsold: {
    summary: UnsoldSummary;
    productsNotSold: ProductNotSold[];
  };
  period: ReportPeriod;
}

export interface RevenueBucket {
  date: string;
  ordersCount: number;
  revenueFromOrders: number;
  revenueFromManualReceivables: number;
  revenue: number;
  currency: string;
}

export interface RevenueOverTimeResponse {
  period: ReportPeriod;
  groupBy: string;
  buckets: RevenueBucket[];
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  unitsSold: number;
  revenue: number;
}

export interface TopProductsResponse {
  period: ReportPeriod;
  sortBy: string;
  top: TopProduct[];
}

export interface CancelledOrder {
  requestId: string;
  orderNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  total: number;
  currency: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CancelledOrdersReport {
  period: ReportPeriod;
  summary: { cancelledOrdersCount: number; totalValueLost: number };
  cancelledOrders: CancelledOrder[];
}

export interface ReportParams {
  storeId: string;
  dateFrom?: string;
  dateTo?: string;
  groupByCategory?: boolean;
  limit?: number;
  onlyWithStock?: boolean;
  limitSales?: number;
  limitUnsold?: number;
  sortBy?: 'units' | 'revenue';
}

function getParams(params: {
  storeId: string;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: string;
  groupByCategory?: boolean;
  limit?: number;
  onlyWithStock?: boolean;
  limitSales?: number;
  limitUnsold?: number;
  sortBy?: string;
}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = { storeId: params.storeId };
  if (params.dateFrom) out.dateFrom = params.dateFrom;
  if (params.dateTo) out.dateTo = params.dateTo;
  if (params.groupByCategory !== undefined) out.groupByCategory = params.groupByCategory;
  if (params.limit !== undefined) out.limit = params.limit;
  if (params.onlyWithStock !== undefined) out.onlyWithStock = params.onlyWithStock;
  if (params.limitSales !== undefined) out.limitSales = params.limitSales;
  if (params.limitUnsold !== undefined) out.limitUnsold = params.limitUnsold;
  if (params.sortBy) out.sortBy = params.sortBy;
  if (params.groupBy) out.groupBy = params.groupBy;
  return out;
}

export async function getSalesReport(
  storeId: string,
  options?: { dateFrom?: string; dateTo?: string; groupByCategory?: boolean; limit?: number }
): Promise<SalesReport> {
  const res = await httpClient.get<{ report: SalesReport }>('/api/reports/sales', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo reporte de ventas');
  const data = res.data as { report?: SalesReport };
  if (data.report) return data.report;
  return res.data as unknown as SalesReport;
}

export async function getUnsoldReport(
  storeId: string,
  options?: { dateFrom?: string; dateTo?: string; onlyWithStock?: boolean; limit?: number }
): Promise<UnsoldReport> {
  const res = await httpClient.get<{ report: UnsoldReport }>('/api/reports/unsold', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo reporte de no vendido');
  const data = res.data as { report?: UnsoldReport };
  if (data.report) return data.report;
  return res.data as unknown as UnsoldReport;
}

export async function getFullReport(
  storeId: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    limitSales?: number;
    limitUnsold?: number;
    onlyWithStock?: boolean;
  }
): Promise<FullReport> {
  const res = await httpClient.get<{ report: FullReport }>('/api/reports/full', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo reporte completo');
  const data = res.data as { report?: FullReport };
  if (data.report) return data.report;
  return res.data as unknown as FullReport;
}

export async function getRevenueOverTime(
  storeId: string,
  options?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }
): Promise<RevenueOverTimeResponse> {
  const res = await httpClient.get<RevenueOverTimeResponse>('/api/reports/revenue-over-time', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo ingresos en el tiempo');
  return res.data as RevenueOverTimeResponse;
}

export async function getTopProducts(
  storeId: string,
  options?: { dateFrom?: string; dateTo?: string; limit?: number; sortBy?: 'units' | 'revenue' }
): Promise<TopProductsResponse> {
  const res = await httpClient.get<TopProductsResponse>('/api/reports/top-products', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo top productos');
  return res.data as TopProductsResponse;
}

export async function getCancelledOrdersReport(
  storeId: string,
  options?: { dateFrom?: string; dateTo?: string; limit?: number }
): Promise<CancelledOrdersReport> {
  const res = await httpClient.get<{ report: CancelledOrdersReport }>('/api/reports/cancelled-orders', {
    params: getParams({ storeId, ...options }),
  });
  if (res.error || !res.data) throw new Error(res.error || 'Error obteniendo pedidos cancelados');
  const data = res.data as { report?: CancelledOrdersReport };
  if (data.report) return data.report;
  return res.data as unknown as CancelledOrdersReport;
}
