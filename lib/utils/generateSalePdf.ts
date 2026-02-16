/**
 * Genera un PDF de factura/ticket de venta con diseño profesional.
 * Incluye logo y ubicación de la tienda si están disponibles.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { resolveImageUrl } from '@/lib/utils/image-url';
import type { Sale } from '@/types/sale';

export interface StoreInfoForPdf {
  name: string;
  logo?: string | null;
  location?: string | null;
}

const MARGIN = 20;
const PAGE_W = 210; // A4 mm
const LOGO_MAX_W = 45;
const LOGO_MAX_H = 18;
const FONT_PRIMARY = 'helvetica';
const FONT_BOLD = 'helvetica';

/**
 * Carga una imagen desde URL y la convierte a base64 para incrustar en el PDF.
 * Si falla (CORS, 404, etc.) retorna null.
 */
function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > LOGO_MAX_W * 4 || height > LOGO_MAX_H * 4) {
          const r = Math.min((LOGO_MAX_W * 4) / width, (LOGO_MAX_H * 4) / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Genera el PDF de la factura y lo abre en nueva pestaña o descarga.
 */
export async function generateSalePdf(
  sale: Sale,
  store: StoreInfoForPdf,
  options?: { fileName?: string }
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = PAGE_W;
  let y = MARGIN;

  // --- Logo (si hay) ---
  const logoUrl = store.logo ? resolveImageUrl(store.logo) : null;
  if (logoUrl) {
    const dataUrl = await loadImageAsDataUrl(logoUrl);
    if (dataUrl) {
      const imgW = LOGO_MAX_W;
      const imgH = LOGO_MAX_H;
      doc.addImage(dataUrl, 'PNG', MARGIN, y, imgW, imgH);
      y += imgH + 4;
    }
  }

  // --- Nombre de la tienda ---
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(store.name, MARGIN, y);
  y += 8;

  // --- Ubicación (si hay) ---
  if (store.location && store.location.trim()) {
    doc.setFont(FONT_PRIMARY, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const locationLines = doc.splitTextToSize(store.location.trim(), pageW - 2 * MARGIN);
    doc.text(locationLines, MARGIN, y);
    y += locationLines.length * 5 + 4;
  }

  doc.setTextColor(0, 0, 0);
  y += 2;

  // --- Línea separadora ---
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 10;

  // --- Título: FACTURA ---
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(16);
  doc.text('FACTURA', MARGIN, y);
  doc.setFont(FONT_PRIMARY, 'normal');
  doc.setFontSize(11);
  doc.text(`#${sale.saleNumber}`, pageW - MARGIN - doc.getTextWidth(`#${sale.saleNumber}`), y);
  y += 10;

  // --- Fecha ---
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const dateStr = new Date(sale.createdAt).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(dateStr, MARGIN, y);
  y += 7;

  // --- Cliente ---
  const clientLine =
    [sale.clientName, sale.clientPhone, sale.clientEmail].filter(Boolean).join(' · ') || '—';
  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_PRIMARY, 'normal');
  doc.text('Cliente:', MARGIN, y);
  doc.text(clientLine, MARGIN + 22, y);
  y += 8;

  if (sale.clientAddress && sale.clientAddress.trim()) {
    const addrLines = doc.splitTextToSize(sale.clientAddress.trim(), pageW - 2 * MARGIN - 22);
    doc.text(addrLines, MARGIN + 22, y);
    y += addrLines.length * 5 + 4;
  } else {
    y += 2;
  }

  // --- Tabla de ítems ---
  const tableStartY = y;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Descripción', 'Cant.', 'P. unit.', 'Total']],
    body: sale.items.map((item) => [
      item.productName + (item.sku ? ` (${item.sku})` : ''),
      String(item.quantity),
      `${item.unitPrice.toFixed(2)} ${sale.currency}`,
      `${item.total.toFixed(2)} ${sale.currency}`,
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [55, 55, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: { left: MARGIN, right: MARGIN },
    tableLineWidth: 0.1,
    tableLineColor: [220, 220, 220],
    columnStyles: {
      0: { cellWidth: 99 },
      1: { cellWidth: 15, halign: 'right' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 8;

  // --- Total ---
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(12);
  doc.text(
    `Total: ${sale.total.toFixed(2)} ${sale.currency}`,
    pageW - MARGIN - doc.getTextWidth(`Total: ${sale.total.toFixed(2)} ${sale.currency}`),
    y
  );
  y += 10;

  // --- Método de pago y notas (si hay) ---
  doc.setFont(FONT_PRIMARY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (sale.paymentMethod && sale.paymentMethod.trim()) {
    doc.text(`Forma de pago: ${sale.paymentMethod.trim()}`, MARGIN, y);
    y += 5;
  }
  if (sale.notes && sale.notes.trim()) {
    const noteLines = doc.splitTextToSize(`Nota: ${sale.notes.trim()}`, pageW - 2 * MARGIN);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 5 + 4;
  }

  y += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 8;
  doc.setFont(FONT_PRIMARY, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Gracias por su compra', MARGIN, y);

  const fileName = options?.fileName ?? `factura-${sale.saleNumber}.pdf`;
  doc.save(fileName);
}
