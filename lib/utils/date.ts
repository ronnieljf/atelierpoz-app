/**
 * Formatear fechas YYYY-MM-DD sin desplazamiento por zona horaria.
 * new Date("2026-03-16") se interpreta como medianoche UTC; en UTC-4 se muestra 15/03.
 * Usar new Date(y, m-1, d) crea fecha local correcta.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '—';
  const s = value.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
