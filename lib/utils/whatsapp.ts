import { type Cart, type CartItem } from '@/types/product';
import { showWhatsAppBlockedNotification } from './whatsapp-fallback';

export interface WhatsAppDeliveryInfo {
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryRecipientName?: string;
  deliveryRecipientPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryNotes?: string;
}

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
 * @param eurToBs - Tasa euro (no se usa en el mensaje; se mantiene por compatibilidad de API).
 */
export function generateWhatsAppMessageForStore(
  items: CartItem[],
  storeName: string,
  locale: string,
  usdToBs?: number,
  eurToBs?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  orderNumber?: number | null,
  deliveryInfo?: WhatsAppDeliveryInfo | null
): string {
  const isSpanish = locale === 'es';

  const orderRef =
    orderNumber != null && orderNumber > 0
      ? ` #${orderNumber}`
      : '';
  const greeting = storeName
    ? isSpanish
      ? `Hola, aquí está mi pedido${orderRef} para ${storeName}:\n\n`
      : `Hi, here is my order${orderRef} for ${storeName}:\n\n`
    : isSpanish
      ? `Hola, aquí está mi pedido${orderRef}:\n\n`
      : `Hi, here is my order${orderRef}:\n\n`;

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
      ? `\n   Bs ${totalBsUsd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (tasa BCV USD del día)`
      : `\n   Bs ${totalBsUsd.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (BCV USD rate today)`;
    totalText += isSpanish
      ? '\n\nEntiendo que el precio en Bs puede variar según la tasa del día.'
      : '\n\nI understand the price in Bs may vary according to the rate of the day.';
  }

  let deliveryText = '';
  if (deliveryInfo && deliveryInfo.deliveryMethod === 'delivery') {
    const lines: string[] = [];
    lines.push(isSpanish ? '\n\n📦 *Datos de envío / delivery:*' : '\n\n📦 *Delivery details:*');
    if (deliveryInfo.deliveryAddress) {
      lines.push(`   ${isSpanish ? 'Dirección' : 'Address'}: ${deliveryInfo.deliveryAddress}`);
    }
    if (deliveryInfo.deliveryReference) {
      lines.push(`   ${isSpanish ? 'Referencia' : 'Reference'}: ${deliveryInfo.deliveryReference}`);
    }
    if (deliveryInfo.deliveryRecipientName) {
      lines.push(`   ${isSpanish ? 'Recibe' : 'Recipient'}: ${deliveryInfo.deliveryRecipientName}`);
    }
    if (deliveryInfo.deliveryRecipientPhone) {
      lines.push(`   ${isSpanish ? 'Tlf. de quien recibe' : 'Recipient phone'}: ${deliveryInfo.deliveryRecipientPhone}`);
    }
    if (deliveryInfo.deliveryDate) {
      let dateStr = deliveryInfo.deliveryDate;
      try {
        const d = new Date(deliveryInfo.deliveryDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch { /* keep raw */ }
      const timeStr = deliveryInfo.deliveryTime || '';
      lines.push(`   ${isSpanish ? 'Fecha' : 'Date'}: ${dateStr}${timeStr ? ` — ${timeStr}` : ''}`);
    } else if (deliveryInfo.deliveryTime) {
      lines.push(`   ${isSpanish ? 'Hora' : 'Time'}: ${deliveryInfo.deliveryTime}`);
    }
    if (deliveryInfo.deliveryNotes) {
      lines.push(`   ${isSpanish ? 'Nota/Dedicatoria' : 'Note/Dedication'}: ${deliveryInfo.deliveryNotes}`);
    }
    deliveryText = lines.join('\n');
  } else if (deliveryInfo && deliveryInfo.deliveryMethod === 'pickup') {
    deliveryText = isSpanish ? '\n\n🏪 *Retiro en tienda*' : '\n\n🏪 *Store pickup*';
  }

  const closing = isSpanish
    ? '\n\nQuedo atento. ¡Gracias!'
    : '\n\nI\'ll be waiting. Thank you!';

  return greeting + itemsText + totalText + deliveryText + closing;
}

/**
 * Genera el mensaje de WhatsApp con los productos del carrito (versión original para compatibilidad)
 */
export function generateWhatsAppMessage(cart: Cart, locale: string): string {
  return generateWhatsAppMessageForStore(cart.items, '', locale);
}

/**
 * Abre WhatsApp con el mensaje del pedido de una tienda específica.
 * Compatible con Safari - usa método seguro que evita bloqueo de popups.
 * Si se pasa customMessage (ej. urgencia, motivo), se concatena al inicio del mensaje.
 * Si se pasa usdToBs (tasa BCV dólar), se añade el total en Bs (tasa USD). Si eurToBs (tasa BCV euro), también el total en Bs (tasa EUR).
 * Si se pasa orderNumber (número de pedido devuelto al crear el pedido), se muestra en el mensaje (ej. Pedido #123).
 */
export function openWhatsAppForStore(
  items: CartItem[],
  storeName: string,
  locale: string,
  phoneNumber: string,
  customMessage?: string,
  usdToBs?: number,
  eurToBs?: number,
  orderNumber?: number | null,
  deliveryInfo?: WhatsAppDeliveryInfo | null
) {
  const base = generateWhatsAppMessageForStore(items, storeName, locale, usdToBs, eurToBs, orderNumber, deliveryInfo);
  const prefix = customMessage?.trim();
  const message = prefix ? `${prefix}\n\n${base}` : base;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  safeOpenLink(whatsappUrl);
}

/**
 * Abre WhatsApp con el mensaje del pedido (versión original para compatibilidad)
 * Compatible con Safari.
 */
export function openWhatsApp(cart: Cart, locale: string, phoneNumber: string) {
  const message = generateWhatsAppMessage(cart, locale);
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  safeOpenLink(whatsappUrl);
}

/** Datos mínimos de un pedido para generar mensaje de WhatsApp (admin) */
export interface RequestForWhatsApp {
  items: CartItem[];
  total: number;
  currency: string;
  customerName?: string | null;
  customMessage?: string | null;
  /** Número de pedido; si se pasa, se muestra "Pedido #X" */
  orderNumber?: number | null;
}

/**
 * Genera un mensaje amable de saludo sobre el pedido para enviar por WhatsApp al cliente desde el admin.
 * No es un cobro: es un mensaje cordial sobre el pedido que hizo. El cliente puede responder con confianza.
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
      ? `Hola ${name}, ¡gracias por tu pedido! Te dejamos el resumen por si lo quieres tener a mano:\n\n`
      : `Hi ${name}, thanks for your order! Here’s the summary for your reference:\n\n`
    : isSpanish
      ? 'Hola, ¡gracias por tu pedido! Te dejamos el resumen por si lo quieres tener a mano:\n\n'
      : 'Hi, thanks for your order! Here’s the summary for your reference:\n\n';

  const lines: string[] = [greeting.trim()];

  const orderNum = request.orderNumber != null && Number(request.orderNumber) > 0 ? Number(request.orderNumber) : null;
  if (orderNum != null) {
    lines.push(`Pedido #${orderNum}`, '');
  }

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
  lines.push(itemsText);

  const total = typeof request.total === 'number' ? request.total : (request.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
  const totalLabel = isSpanish ? 'Total del pedido' : 'Order total';
  lines.push('', `${totalLabel}: ${request.currency} ${total.toFixed(2)}`);

  const custom = request.customMessage?.trim();
  if (custom) {
    lines.push('', `${isSpanish ? 'Tu mensaje' : 'Your message'}: ${custom}`);
  }

  const closing = isSpanish
    ? '\n\nSi tienes alguna duda o quieres confirmar algo, puedes responder a este chat con toda confianza. ¡Gracias!'
    : "\n\nIf you have any questions or want to confirm anything, feel free to reply to this chat. Thank you!";
  lines.push(closing);

  return lines.join('\n');
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
  /** Número de la tienda al que el cliente debe responder (no a este mensaje). Si se pasa, se añade intro y cierre. */
  storeReplyPhoneNumber?: string | null;
  /** Nombre de la tienda a la que debe pagar (se muestra en intro/cierre junto al número). */
  storeName?: string | null;
  /** Sumatoria de montos por moneda cuando se envían varias cuentas agrupadas (ej. { USD: 150, VES: 200 }). */
  summaryByCurrency?: Record<string, number>;
  /** Cantidad de cuentas incluidas en el mensaje (cuando es envío masivo por número). */
  summaryCount?: number;
  /** true = contacto manual desde el admin (lista/detalle): mensaje amable, el cliente puede responder. false/undefined = recordatorio masivo: se añade texto de no responder y responder a la tienda. */
  forManualContact?: boolean;
  /** Número de pedido asociado (cuando la cuenta viene de un pedido). Si se pasa, se muestra "Pedido #<orderNumber>". */
  orderNumber?: number | null;
  /** Número de la cuenta por cobrar. Si no hay orderNumber, se usa para mostrar "Cuenta #<receivableNumber>". */
  receivableNumber?: number | null;
}

/**
 * Genera un mensaje con el detalle de la cuenta por cobrar para enviar por WhatsApp.
 * - Si está pendiente: mensaje amable con lo que debe, abonos realizados y el resto por pagar (corto).
 * - Si está cobrada: mensaje amable indicando que su cuenta ya está saldada, que ya no debe.
 * Si forManualContact es true (clic manual en lista/detalle): mensaje amable, sin indicar "no responder".
 * Si forManualContact es false/undefined (recordatorio masivo): se añade intro/cierre indicando que responda a la tienda.
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
  const isPaid = receivable.status === 'paid';

  const isManualContact = receivable.forManualContact === true;
  const storePhone = receivable.storeReplyPhoneNumber?.trim();
  const storeName = receivable.storeName?.trim() || 'la tienda';
  const introOutro =
    !isManualContact &&
    storePhone &&
    `_Por favor, no respondas a este mensaje._ Debes pagar y responder a *${storeName}* al número: ${storePhone}`;

  const lines: string[] = [];
  if (introOutro) {
    lines.push(introOutro);
    lines.push('');
  }

  const orderNum = receivable.orderNumber != null && Number(receivable.orderNumber) > 0 ? Number(receivable.orderNumber) : null;
  const recNum = receivable.receivableNumber != null && Number(receivable.receivableNumber) > 0 ? Number(receivable.receivableNumber) : null;
  const refLabel = orderNum != null ? `Pedido #${orderNum}` : recNum != null ? `Cuenta #${recNum}` : null;

  if (isPaid) {
    // Cuenta cobrada: mensaje amable indicando que ya está saldada
    lines.push(`Hola ${name}, ¡buenas noticias! 🙂`, '');
    lines.push('Te escribo para confirmarte que *tu cuenta ya está saldada*.');
    if (refLabel) lines.push(refLabel);
    lines.push('');
    lines.push(`El total de ${receivable.currency} ${total.toFixed(2)} ya fue cubierto en su totalidad.`);
    if (totalPaid > 0 && Array.isArray(receivable.payments) && receivable.payments.length > 0) {
      lines.push('');
      lines.push('Resumen de tus abonos:');
      receivable.payments.forEach((p, i) => {
        const pDate = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '';
        lines.push(`${i + 1}. ${p.currency} ${Number(p.amount).toFixed(2)}${pDate ? ` (${pDate})` : ''}`);
      });
      lines.push(`Total pagado: ${receivable.currency} ${totalPaid.toFixed(2)}`);
    }
    lines.push('');
    lines.push('*Esta cuenta ya quedó saldada.* Si tienes alguna duda, puedes responder a este chat con toda confianza.');
    lines.push('');
    lines.push('¡Gracias por tu confianza!');
  } else {
    // Cuenta pendiente: mensaje amable con lo que debe, abonos y resto
    const greeting = isManualContact
      ? `Hola ${name}, te escribo con gusto respecto a tu cuenta:`
      : `Hola ${name}, te escribo respecto a tu cuenta por cobrar:`;
    lines.push(greeting, '');

    const hasSummary = receivable.summaryCount != null && receivable.summaryCount > 0 && receivable.summaryByCurrency && Object.keys(receivable.summaryByCurrency).length > 0;
    if (hasSummary) {
      const summaryByCurrency = receivable.summaryByCurrency ?? {};
      const parts = Object.entries(summaryByCurrency)
        .map(([curr, amt]) => `${curr} ${Number(amt).toFixed(2)}`)
        .join(', ');
      lines.push(`*Sumatoria (${receivable.summaryCount} ${receivable.summaryCount === 1 ? 'cuenta' : 'cuentas'}):* ${parts}`);
    } else {
      if (refLabel) lines.push(refLabel);
      lines.push(`*Total a cobrar:* ${receivable.currency} ${total.toFixed(2)}`);

      if (totalPaid > 0 || (Array.isArray(receivable.payments) && receivable.payments.length > 0)) {
        lines.push('');
        lines.push('*Abonos realizados:*');
        if (Array.isArray(receivable.payments) && receivable.payments.length > 0) {
          receivable.payments.forEach((p, i) => {
            const pDate = p.createdAt
              ? new Date(p.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : '';
            const note = p.notes?.trim() ? ` — ${p.notes.trim()}` : '';
            lines.push(`${i + 1}. ${p.currency} ${Number(p.amount).toFixed(2)}${pDate ? ` (${pDate})` : ''}${note}`);
          });
        }
        lines.push(`Total abonado: ${receivable.currency} ${totalPaid.toFixed(2)}`);
        lines.push('');
        lines.push(`*Restante por pagar:* ${receivable.currency} ${pending.toFixed(2)}`);
      } else {
        lines.push(`*Por pagar:* ${receivable.currency} ${pending.toFixed(2)}`);
      }
    }

    if (isManualContact) {
      lines.push(
        '',
        'Cuando puedas, te agradezco que confirmes o me cuentes si tienes alguna duda. Puedes responder a este chat con toda confianza.',
        '',
        '¡Gracias!'
      );
    } else {
      lines.push('', 'Cuando puedas, te agradezco que confirmes.');
      const supportWaUrl = 'https://wa.me/584120893949';
      lines.push('');
      lines.push(`📱 Para contacto o soporte, escríbenos aquí: ${supportWaUrl}`);
      if (introOutro) {
        lines.push('');
        lines.push(introOutro);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Abre WhatsApp con el cliente de una cuenta por cobrar y un mensaje con el detalle de la cuenta.
 * Compatible con Safari.
 */
export function openWhatsAppForReceivable(receivable: ReceivableForWhatsApp): void {
  const phone = receivable.customerPhone?.trim();
  if (!phone) return;
  const message = generateWhatsAppMessageForReceivable({ ...receivable, forManualContact: true });
  openWhatsAppToPhone(phone, message);
}

/**
 * Intenta abrir un link de forma segura, compatible con Safari.
 * En Safari, siempre muestra una notificación de respaldo porque puede bloquear popups silenciosamente.
 */
function safeOpenLink(url: string): boolean {
  // Detectar si es Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  try {
    // Método universal: crear link temporal y hacer click
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // En Safari, SIEMPRE mostrar notificación de respaldo
    // Porque Safari puede bloquear el popup sin avisar
    if (isSafari) {
      setTimeout(() => {
        console.log('[WhatsApp] Safari detectado - mostrando notificación de respaldo');
        showWhatsAppBlockedNotification(url);
      }, 500);
    }
    
    return true;
  } catch (error) {
    console.error('[WhatsApp] Error abriendo link:', error);
    
    // Fallback: Mostrar notificación elegante
    showWhatsAppBlockedNotification(url);
    
    return false;
  }
}

/**
 * Abre WhatsApp con un número de teléfono (ej. cliente de una cuenta por cobrar).
 * El teléfono puede tener formato +58 412 1234567; se normaliza a dígitos para wa.me.
 * Compatible con Safari - no usa window.open() directamente.
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
  safeOpenLink(url);
}

/**
 * Abre WhatsApp con el cliente de un pedido desde el admin.
 * Compatible con Safari - usa método seguro.
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
  safeOpenLink(whatsappUrl);
}
