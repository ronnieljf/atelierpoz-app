/**
 * Genera un PDF de comprobante de venta: diseño minimalista y profesional.
 * Incluye mención de IVA y aclaración de que es un documento interno del sistema.
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

const MARGIN = 24;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LOGO_MAX_W = 40;
const LOGO_MAX_H = 14;

const FONT = 'helvetica';
const COLOR_TEXT = [45, 55, 72] as [number, number, number];
const COLOR_MUTED = [107, 114, 128] as [number, number, number];
const COLOR_BORDER = [229, 231, 235] as [number, number, number];

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

export async function generateSalePdf(
  sale: Sale,
  store: StoreInfoForPdf,
  options?: { fileName?: string }
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  // Logo (opcional, compacto)
  const logoUrl = store.logo ? resolveImageUrl(store.logo) : null;
  if (logoUrl) {
    const dataUrl = await loadImageAsDataUrl(logoUrl);
    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', MARGIN, y, LOGO_MAX_W, LOGO_MAX_H);
    }
  }

  // Nombre tienda
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(store.name, MARGIN, y + (logoUrl ? LOGO_MAX_H / 2 + 3 : 5));
  y += (logoUrl ? LOGO_MAX_H + 6 : 10);

  if (store.location && store.location.trim()) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    const locLines = doc.splitTextToSize(store.location.trim(), CONTENT_W);
    doc.text(locLines, MARGIN, y);
    y += locLines.length * 4 + 10;
  } else {
    y += 4;
  }

  // Número y fecha (línea única, minimalista)
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  const dateStr = new Date(sale.createdAt).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Comprobante #${sale.saleNumber}  ·  ${dateStr}`, MARGIN, y);
  y += 14;

  // Cliente (bloque breve)
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Cliente', MARGIN, y);
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_TEXT);
  const clientParts = [sale.clientName, sale.clientPhone].filter(Boolean);
  doc.text(clientParts.length ? clientParts.join(' · ') : '—', MARGIN, y);
  y += 8;

  // Tabla de ítems: ancho total = CONTENT_W para que quede centrada entre márgenes
  const colProducto = CONTENT_W - 18 - 30 - 34; // Cant, P. unit., Total
  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cant.', 'P. unit.', 'Total']],
    body: sale.items.map((item) => [
      item.productName + (item.sku ? ` (${item.sku})` : ''),
      String(item.quantity),
      `${item.unitPrice.toFixed(2)} ${sale.currency}`,
      `${item.total.toFixed(2)} ${sale.currency}`,
    ]),
    theme: 'plain',
    tableWidth: CONTENT_W,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: COLOR_TEXT,
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLOR_TEXT,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
    },
    tableLineWidth: 0.2,
    tableLineColor: COLOR_BORDER,
    columnStyles: {
      0: { cellWidth: colProducto, halign: 'left' },
      1: { cellWidth: 18, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 34, halign: 'right' },
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 8;

  // Total
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`Total: ${sale.total.toFixed(2)} ${sale.currency}`, PAGE_W - MARGIN - doc.getTextWidth(`Total: ${sale.total.toFixed(2)} ${sale.currency}`), y);
  y += 5;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('(IVA incluido cuando aplique)', PAGE_W - MARGIN - doc.getTextWidth('(IVA incluido cuando aplique)'), y);
  y += 12;

  if (sale.paymentMethod?.trim()) {
    doc.setFontSize(8);
    doc.text(`Forma de pago: ${sale.paymentMethod.trim()}`, MARGIN, y);
    y += 6;
  }
  if (sale.notes?.trim()) {
    const noteLines = doc.splitTextToSize(sale.notes.trim(), CONTENT_W);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 4 + 6;
  }

  // Pie: aclaración legal
  y = Math.max(y + 20, 265);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  const disclaimer = 'Comprobante interno del sistema. No es un documento tributario ni está vinculado a ningún ente gubernamental.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(disclaimerLines, MARGIN, y);
  y += disclaimerLines.length * 3.5 + 4;
  doc.text('Gracias por su compra.', MARGIN, y);

  const fileName = options?.fileName ?? `comprobante-${sale.saleNumber}.pdf`;
  doc.save(fileName);
}
