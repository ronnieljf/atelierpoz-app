/**
 * Utilidades para formateo y validación de números de teléfono.
 * Asegura código de país y sin ceros a la izquierda para compatibilidad con WhatsApp.
 */

/**
 * Formatea un número de teléfono para uso en recordatorios/WhatsApp.
 * - Quita espacios, guiones y otros caracteres no numéricos
 * - Elimina ceros a la izquierda
 * - Si no tiene código de país, asume Venezuela (+58) cuando el número tiene 10 dígitos
 *   que comienzan con 4 (móvil) o 2 (fijo)
 * @param phone - Número en cualquier formato (ej: 0412-1234567, +58 412 123 4567)
 * @returns Número formateado con + y código de país, o string vacío si no es válido
 */
export function formatContactPhone(phone: string | null | undefined): string {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Quitar ceros a la izquierda
  digits = digits.replace(/^0+/, '') || '';

  // Si ya tiene código de país: 58 (Venezuela), 1 (USA/Canadá), 34 (España), 52 (México), etc.
  // Mínimo 11 dígitos para números con código (ej: 58 + 9 dígitos)
  if (digits.length >= 11) {
    return '+' + digits;
  }

  // Números venezolanos sin código: 10 dígitos (4121234567) o 9 (212123456)
  // Móviles 04xx, fijos 02xx
  if (digits.length === 10 && (digits.startsWith('4') || digits.startsWith('2'))) {
    return '+58' + digits;
  }
  if (digits.length === 9 && (digits.startsWith('4') || digits.startsWith('2'))) {
    return '+58' + digits;
  }

  // Otros países: 10 dígitos asumir que ya incluye código (ej: USA 10 dígitos)
  if (digits.length === 10) {
    return '+' + digits;
  }

  // Número incompleto: devolver tal cual para permitir edición
  return trimmed;
}
