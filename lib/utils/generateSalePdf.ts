/**
 * Genera un PDF de factura de venta con diseño elegante y profesional.
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

const MARGIN = 22;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LOGO_MAX_W = 42;
const LOGO_MAX_H = 16;

// Paleta profesional
const COLORS = {
  accent: [30, 64, 175] as [number, number, number],       // Azul elegante
  accentLight: [241, 245, 249] as [number, number, number],   // Fondo suave
  textPrimary: [30, 41, 59] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  headerBg: [30, 41, 59] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
};

const FONT = 'helvetica';

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

  // --- Barra superior de acento ---
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  y = 18;

  // --- Logo (si hay, el nombre de la tienda baja) ---
  const logoUrl = store.logo ? resolveImageUrl(store.logo) : null;
  if (logoUrl) {
    const dataUrl = await loadImageAsDataUrl(logoUrl);
    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', MARGIN, 8, LOGO_MAX_W, LOGO_MAX_H);
      y = 8 + LOGO_MAX_H + 8;
    }
  }

  // --- Nombre de la tienda ---
  doc.setFont(FONT, 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(store.name, MARGIN, y);
  y += 7;

  if (store.location && store.location.trim()) {
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const locationLines = doc.splitTextToSize(store.location.trim(), CONTENT_W);
    doc.text(locationLines, MARGIN, y);
    y += locationLines.length * 4.5 + 10;
  } else {
    y += 6;
  }

  // --- Bloque: Factura #N y Fecha (dos columnas) ---
  const facturaX = MARGIN;
  const metaX = PAGE_W - MARGIN - 55;
  doc.setFillColor(...COLORS.accentLight);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 1.5, 1.5, 'S');

  doc.setFont(FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('FACTURA', MARGIN + 6, y + 8);
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.accent);
  doc.text(`#${sale.saleNumber}`, MARGIN + 6, y + 16);

  const dateStr = new Date(sale.createdAt).toLocaleString('es', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Fecha', metaX, y + 8);
  doc.setFont(FONT, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(dateStr, metaX, y + 15);

  y += 22 + 12;

  // --- Cliente ---
  doc.setFont(FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('CLIENTE', MARGIN, y);
  y += 5;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textPrimary);
  const clientParts = [sale.clientName, sale.clientPhone, sale.clientEmail].filter(Boolean);
  const clientLine = clientParts.length ? clientParts.join(' · ') : '—';
  const clientLines = doc.splitTextToSize(clientLine, CONTENT_W);
  doc.text(clientLines, MARGIN, y);
  y += clientLines.length * 5;
  if (sale.clientAddress && sale.clientAddress.trim()) {
    const addrLines = doc.splitTextToSize(sale.clientAddress.trim(), CONTENT_W);
    doc.text(addrLines, MARGIN, y);
    y += addrLines.length * 5 + 4;
  }
  y += 8;

  // --- Tabla de ítems ---
  const tableStartY = y;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Descripción', 'Cant.', 'P. unit.', 'Total']],
    body: sale.items.map((item) => [
      item.productName + (item.sku ? ` · ${item.sku}` : ''),
      String(item.quantity),
      `${item.unitPrice.toFixed(2)} ${sale.currency}`,
      `${item.total.toFixed(2)} ${sale.currency}`,
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.textPrimary,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    margin: { left: MARGIN, right: MARGIN },
    tableLineWidth: 0.15,
    tableLineColor: COLORS.border,
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 18, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 4;

  // --- Línea y total ---
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.textPrimary);
  const totalStr = `Total: ${sale.total.toFixed(2)} ${sale.currency}`;
  doc.text(totalStr, PAGE_W - MARGIN - doc.getTextWidth(totalStr), y);
  y += 14;

  // --- Forma de pago y nota ---
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  if (sale.paymentMethod && sale.paymentMethod.trim()) {
    doc.text(`Forma de pago: ${sale.paymentMethod.trim()}`, MARGIN, y);
    y += 5;
  }
  if (sale.notes && sale.notes.trim()) {
    const noteLines = doc.splitTextToSize(`Nota: ${sale.notes.trim()}`, CONTENT_W);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 4.5 + 6;
  }

  // --- Pie de página ---
  y = Math.max(y + 16, 270);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Gracias por su compra', MARGIN, y);
  doc.setFontSize(8);
  doc.text('Documento generado electrónicamente', PAGE_W - MARGIN - doc.getTextWidth('Documento generado electrónicamente'), y);

  const fileName = options?.fileName ?? `factura-${sale.saleNumber}.pdf`;
  doc.save(fileName);
}
