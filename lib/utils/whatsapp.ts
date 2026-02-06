import { type Cart, type CartItem } from '@/types/product';

/** Imagen del ítem: variante/combinación si existe, sino imagen del producto */
function getItemImage(item: CartItem): string {
  const variants = item.selectedVariants ?? [];
  const withImage = variants.find((v) => v.variantImage);
  return withImage?.variantImage ?? item.productImage ?? '';
}

/** SKU del ítem: producto + variantes/combinación si hay */
function getItemSku(item: CartItem): string {
  const base = item.productSku ?? '';
  const variants = item.selectedVariants ?? [];
  const variantSkus = variants.map((v) => v.variantSku).filter(Boolean) as string[];
  if (variantSkus.length === 0) return base;
  return [base, ...variantSkus].join(' / ');
}

/**
 * Genera el mensaje de WhatsApp con los productos del carrito de una tienda específica.
 * Compatible con productos con variantes simples o combinaciones (ej. Color × Talla):
 * - selectedVariants puede tener varias entradas (Color: Rojo, Talla: M).
 * - totalPrice de cada ítem ya incluye precio base + modificador de combinación/variante.
 * @param usdToBs - Tasa de cambio USD → Bs (ej. BCV dólar). Si > 0, se añade el total en Bs (tasa USD).
 * @param _eurToBs - Tasa euro no se usa (comentado a petición: no mostrar total a tasa EUR en el mensaje).
 */
export function generateWhatsAppMessageForStore(
  items: CartItem[],
  storeName: string,
  locale: string,
  usdToBs?: number,
  _eurToBs?: number
): string {
  const isSpanish = locale === 'es';

  const greeting = storeName
    ? isSpanish
      ? `Pedido - ${storeName}\n\n`
      : `Order - ${storeName}\n\n`
    : isSpanish
      ? 'Pedido\n\n'
      : 'Order\n\n';

  const itemsText = items
    .map((item, index) => {
      const variants = item.selectedVariants ?? [];
      const variantsText =
        variants.length > 0
          ? ` (${variants.map((v) => `${v.attributeName || ''}: ${v.variantValue || ''}`).filter(Boolean).join(', ')})`
          : '';
      const quantityLabel = isSpanish ? 'Cant.' : 'Qty';
      const skuLabel = isSpanish ? 'Código' : 'SKU';
      const sku = getItemSku(item);
      const img = getItemImage(item);
      const imgLine = img ? `\n   ${isSpanish ? 'Imagen' : 'Image'}: ${img}` : '';
      const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;
      return `${index + 1}. ${item.productName}${variantsText}\n   ${skuLabel}: ${sku}\n   ${quantityLabel}: ${item.quantity} x $${unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}${imgLine}`;
    })
    .join('\n\n');

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalLabel = isSpanish ? 'Total del pedido' : 'Order total';
  let totalText = `\n\n${totalLabel}: $${total.toFixed(2)}`;
  const rateUsd = usdToBs != null && usdToBs > 0 && !Number.isNaN(usdToBs) ? usdToBs : 0;
  if (rateUsd > 0) {
    const totalBsUsd = total * rateUsd;
    totalText += isSpanish
      ? `\n   Bs ${totalBsUsd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (tasa BCV USD)`
      : `\n   Bs ${totalBsUsd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (BCV USD rate)`;
  }
  // Total a tasa euro quitado del mensaje de WhatsApp
  const closing = isSpanish ? '\n\nGracias!' : '\n\nThank you!';

  return greeting + itemsText + totalText + closing;
}

/**
 * Genera el mensaje de WhatsApp con los productos del carrito (versión original para compatibilidad)
 */
export function generateWhatsAppMessage(cart: Cart, locale: string): string {
  return generateWhatsAppMessageForStore(cart.items, '', locale);
}

/**
 * Abre WhatsApp con el mensaje del pedido de una tienda específica.
 * Si se pasa customMessage (ej. urgencia, motivo), se concatena al inicio del mensaje.
 * Si se pasa usdToBs (tasa BCV dólar), se añade el total en Bs (tasa USD). Si eurToBs (tasa BCV euro), también el total en Bs (tasa EUR).
 */
export function openWhatsAppForStore(
  items: CartItem[],
  storeName: string,
  locale: string,
  phoneNumber: string,
  customMessage?: string,
  usdToBs?: number,
  eurToBs?: number
) {
  const base = generateWhatsAppMessageForStore(items, storeName, locale, usdToBs, eurToBs);
  const prefix = customMessage?.trim();
  const message = prefix ? `${prefix}\n\n${base}` : base;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

/**
 * Abre WhatsApp con el mensaje del pedido (versión original para compatibilidad)
 */
export function openWhatsApp(cart: Cart, locale: string, phoneNumber: string) {
  const message = generateWhatsAppMessage(cart, locale);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}

/** Datos mínimos de un pedido para generar mensaje de WhatsApp (admin) */
export interface RequestForWhatsApp {
  items: CartItem[];
  total: number;
  currency: string;
  customerName?: string | null;
  customMessage?: string | null;
}

/**
 * Genera un mensaje amable para enviar por WhatsApp al cliente desde el admin.
 * Es un pedido (el cliente aún no ha pagado): tono cercano y respetuoso, sin dar a entender que debe algo.
 */
export function generateWhatsAppMessageForRequest(
  request: RequestForWhatsApp,
  storeName: string,
  locale: string
): string {
  const isSpanish = locale === 'es';
  const name = request.customerName?.trim() || '';
  const greeting = name
    ? isSpanish
      ? `Hola ${name}, te comparto el resumen de tu pedido:\n\n`
      : `Hi ${name}, here is the summary of your order:\n\n`
    : isSpanish
      ? 'Hola, te comparto el resumen de tu pedido:\n\n'
      : 'Hi, here is the summary of your order:\n\n';

  const itemsText = (request.items || [])
    .map((item, index) => {
      const variants = item.selectedVariants ?? [];
      const variantsText =
        variants.length > 0
          ? ` (${variants.map((v) => `${v.attributeName || ''}: ${v.variantValue || ''}`).filter(Boolean).join(', ')})`
          : '';
      const quantityLabel = isSpanish ? 'Cant.' : 'Qty';
      const skuLabel = isSpanish ? 'Código' : 'SKU';
      const sku = getItemSku(item);
      const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;
      return `${index + 1}. ${item.productName}${variantsText}\n   ${skuLabel}: ${sku}\n   ${quantityLabel}: ${item.quantity} x $${unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}`;
    })
    .join('\n\n');

  const total = typeof request.total === 'number' ? request.total : (request.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
  const totalLabel = isSpanish ? 'Total del pedido' : 'Order total';
  const totalText = `\n\n${totalLabel}: ${request.currency} ${total.toFixed(2)}`;
  const custom = request.customMessage?.trim();
  const customBlock = custom ? `\n\n${isSpanish ? 'Tu mensaje' : 'Your message'}: ${custom}` : '';
  const closing = isSpanish ? '\n\nCualquier duda, quedo atento. ¡Gracias!' : '\n\nIf you have any questions, I\'m here. Thank you!';

  return greeting + itemsText + totalText + customBlock + closing;
}

/** Abono para mostrar en el mensaje de WhatsApp */
export interface ReceivablePaymentForWhatsApp {
  amount: number;
  currency: string;
  createdAt?: string;
  notes?: string | null;
}

/** Producto del pedido para mostrar en el mensaje de WhatsApp */
export interface ReceivableOrderItemForWhatsApp {
  productName: string;
  quantity: number;
  totalPrice: number;
  variantLabel?: string | null;
}

/** Datos mínimos de una cuenta por cobrar para generar mensaje de WhatsApp */
export interface ReceivableForWhatsApp {
  customerName?: string | null;
  customerPhone?: string | null;
  description?: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt?: string;
  /** Lista de abonos (opcional; si no se pasa, no se detallan en el mensaje) */
  payments?: ReceivablePaymentForWhatsApp[];
  /** Total ya abonado (opcional; si no se pasa pero hay payments, se calcula de la lista) */
  totalPaid?: number;
  /** Productos del pedido (opcional; solo cuando la cuenta viene de un pedido) */
  orderItems?: ReceivableOrderItemForWhatsApp[];
}

/**
 * Genera un mensaje con el detalle de la cuenta por cobrar para enviar por WhatsApp.
 * Incluye abonos y lo que falta por cobrar cuando se pasan payments o totalPaid.
 */
export function generateWhatsAppMessageForReceivable(receivable: ReceivableForWhatsApp): string {
  const name = receivable.customerName?.trim() || 'Cliente';
  const total = Number(receivable.amount);
  const totalPaid =
    receivable.totalPaid ??
    (Array.isArray(receivable.payments) && receivable.payments.length > 0
      ? receivable.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      : 0);
  const pending = Math.max(0, total - totalPaid);

  const lines: string[] = [
    `Hola ${name}, te escribo respecto a la cuenta por cobrar:`,
    '',
    `*Monto total:* ${receivable.currency} ${total.toFixed(2)}`,
    `*Estado:* ${receivable.status === 'pending' ? 'Pendiente' : receivable.status === 'paid' ? 'Cobrada' : 'Cancelada'}`,
  ];
  if (receivable.description?.trim()) {
    lines.push(`*Descripción:* ${receivable.description.trim()}`);
  }
  if (receivable.createdAt) {
    const date = new Date(receivable.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    lines.push(`*Fecha:* ${date}`);
  }

  if (Array.isArray(receivable.orderItems) && receivable.orderItems.length > 0) {
    lines.push('');
    lines.push('*Productos:*');
    receivable.orderItems.forEach((item, i) => {
      const name = item.productName?.trim() || 'Producto';
      const total = Number(item.totalPrice);
      const variant = item.variantLabel?.trim();
      const qty = typeof item.quantity === 'number' && item.quantity > 1 ? ` x${item.quantity}` : '';
      const line = variant
        ? `${i + 1}. ${name} (${variant})${qty}: ${receivable.currency} ${total.toFixed(2)}`
        : `${i + 1}. ${name}${qty}: ${receivable.currency} ${total.toFixed(2)}`;
      lines.push(line);
    });
  }

  if (totalPaid > 0 || (Array.isArray(receivable.payments) && receivable.payments.length > 0)) {
    lines.push('');
    lines.push('*Abonos:*');
    if (Array.isArray(receivable.payments) && receivable.payments.length > 0) {
      receivable.payments.forEach((p, i) => {
        const pDate = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '';
        const note = p.notes?.trim() ? ` — ${p.notes.trim()}` : '';
        lines.push(`${i + 1}. ${p.currency} ${Number(p.amount).toFixed(2)}${pDate ? ` (${pDate})` : ''}${note}`);
      });
    }
    lines.push(`*Total abonado:* ${receivable.currency} ${totalPaid.toFixed(2)}`);
  }

  if (pending > 0) {
    lines.push(`*Total a pagar:* ${receivable.currency} ${pending.toFixed(2)}`);
  }

  lines.push('', 'Cuando puedas, te agradezco que me confirmes.');
  return lines.join('\n');
}

/**
 * Abre WhatsApp con el cliente de una cuenta por cobrar y un mensaje con el detalle de la cuenta.
 */
export function openWhatsAppForReceivable(receivable: ReceivableForWhatsApp): void {
  const phone = receivable.customerPhone?.trim();
  if (!phone) return;
  const message = generateWhatsAppMessageForReceivable(receivable);
  openWhatsAppToPhone(phone, message);
}

/**
 * Abre WhatsApp con un número de teléfono (ej. cliente de una cuenta por cobrar).
 * El teléfono puede tener formato +58 412 1234567; se normaliza a dígitos para wa.me.
 * @param phone - Número con o sin código de país
 * @param message - Mensaje opcional para prellenar el chat
 */
export function openWhatsAppToPhone(phone: string, message?: string): void {
  const trimmed = (phone || '').trim();
  if (!trimmed) return;
  const phoneDigits = trimmed.replace(/\D/g, '');
  if (!phoneDigits.length) return;
  const base = `https://wa.me/${phoneDigits}`;
  const url = message?.trim()
    ? `${base}?text=${encodeURIComponent(message.trim())}`
    : base;
  window.open(url, '_blank');
}

/**
 * Abre WhatsApp con el cliente de un pedido desde el admin.
 * Usa un mensaje amable con los datos del pedido.
 * El teléfono debe tener código de país (ej. +584121234567); se elimina el + para wa.me.
 */
export function openWhatsAppForRequest(
  request: RequestForWhatsApp & { customerPhone?: string | null },
  storeName: string,
  locale: string
): void {
  const phone = request.customerPhone?.trim();
  if (!phone) return;
  const phoneDigits = phone.replace(/\D/g, '');
  if (!phoneDigits.length) return;
  const message = generateWhatsAppMessageForRequest(request, storeName, locale);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
}
