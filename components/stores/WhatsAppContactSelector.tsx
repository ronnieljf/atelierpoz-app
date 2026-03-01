'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { openWhatsAppToPhone } from '@/lib/utils/whatsapp';
import type { StoreContactUser } from '@/lib/services/stores';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function getContactMessage(storeName: string, contactName: string, locale: string): string {
  const isSpanish = locale === 'es';
  return isSpanish
    ? `¡Hola ${contactName}! Vi la tienda ${storeName} y me gustaría hacerte una consulta. ¿Podrías ayudarme? 🙂`
    : `Hi ${contactName}! I saw ${storeName} and I'd like to ask you a question. Could you help me? 🙂`;
}

interface WhatsAppContactSelectorProps {
  storeName: string;
  locale?: string;
  /** Contactos con teléfono (obtenidos en servidor) */
  contacts: StoreContactUser[];
}

/**
 * Selector de contacto por WhatsApp: muestra un select para elegir a quién contactar
 * y el botón de WhatsApp. Los contactos se pasan como props (obtenidos en servidor).
 */
export function WhatsAppContactSelector({ storeName, locale = 'es', contacts }: WhatsAppContactSelectorProps) {
  const firstPhone = contacts[0]?.phoneNumber ?? '';
  const [selectedPhone, setSelectedPhone] = useState<string>(firstPhone);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Evitar hydration mismatch: portal solo después del montaje en cliente
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleContact = () => {
    if (!selectedPhone?.trim()) return;
    const contact = contacts.find((c) => c.phoneNumber === selectedPhone);
    const name = contact?.name || '';
    const message = getContactMessage(storeName, name, locale);
    openWhatsAppToPhone(selectedPhone, message);
  };

  if (contacts.length === 0 || !mounted) return null;

  const content = (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 md:bottom-8 md:right-8">
      <div className="flex flex-col gap-2 rounded-2xl bg-neutral-900/95 border border-neutral-700/80 shadow-xl p-3 min-w-[200px] max-w-[280px] backdrop-blur-md">
        <label htmlFor="store-contact-select" className="text-xs font-medium text-neutral-400">
          {locale === 'es' ? 'Contactar a' : 'Contact'}
        </label>
        <div className="flex gap-2">
          <select
            id="store-contact-select"
            value={selectedPhone}
            onChange={(e) => setSelectedPhone(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3 py-2.5 text-sm text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 pr-8 [appearance:auto]"
            aria-label={locale === 'es' ? 'Seleccionar contacto' : 'Select contact'}
          >
            {contacts.map((c) => (
              <option key={c.phoneNumber} value={c.phoneNumber}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleContact}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-all hover:scale-105 hover:bg-[#20BD5A] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 md:h-11 md:w-11"
            aria-label={locale === 'es' ? 'Contáctanos por WhatsApp' : 'Contact via WhatsApp'}
          >
            <WhatsAppIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </div>
    </div>
  );

  // Portal a document.body: evita que overflow-x-hidden y transform (page-transition-in)
  // del contenedor padre creen un nuevo containing block y oculten el botón fixed
  return createPortal(content, document.body);
}
