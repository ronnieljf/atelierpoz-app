'use client';

import { useState } from 'react';
import { Instagram, MapPin } from 'lucide-react';
import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils/image-url';
import { openWhatsAppToPhone } from '@/lib/utils/whatsapp';
import type { StoreContactUser } from '@/lib/services/stores';

interface StorePageHeaderProps {
  name: string;
  logo?: string | null;
  description?: string | null;
  location?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  /** Usuarios de contacto con teléfono (para WhatsApp) */
  contactUsers?: StoreContactUser[];
  /** Idioma para el mensaje predefinido ('es' | 'en') */
  locale?: string;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function getWhatsAppContactMessage(storeName: string, contactName: string, locale: string): string {
  const isSpanish = locale === 'es';
  return isSpanish
    ? `¡Hola ${contactName}! Vi la tienda ${storeName} y me gustaría hacerte una consulta. ¿Podrías ayudarme? 🙂`
    : `Hi ${contactName}! I saw ${storeName} and I'd like to ask you a question. Could you help me? 🙂`;
}

export function StorePageHeader({
  name,
  logo,
  description,
  location,
  instagram,
  tiktok,
  contactUsers = [],
  locale = 'es',
}: StorePageHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const contacts = contactUsers.filter((c) => c.phoneNumber?.trim());
  const [selectedPhone, setSelectedPhone] = useState(contacts[0]?.phoneNumber ?? '');
  const logoUrl = resolveImageUrl(logo ?? null) ?? logo ?? null;
  const showLogo = !!logoUrl && !logoError;
  const ig = instagram?.trim();
  const tt = tiktok?.trim();
  const hasSocial = !!(ig || tt || contacts.length > 0);

  return (
    <header className="mb-10 sm:mb-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Logo */}
        {showLogo && (
          <div className="flex justify-center sm:justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-neutral-700/50 sm:h-24 sm:w-24"
              onError={() => setLogoError(true)}
            />
          </div>
        )}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-light tracking-tight text-white sm:text-3xl md:text-4xl">
            {name}
          </h1>
          {(location || hasSocial) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-light text-neutral-400 sm:justify-start">
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
                  {location}
                </span>
              )}
              {ig && (
                <Link
                  href={`https://instagram.com/${ig.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-neutral-950 rounded px-1"
                  aria-label={`Instagram: @${ig.replace(/^@/, '')}`}
                >
                  <Instagram className="h-4 w-4 shrink-0" />
                  @{ig.replace(/^@/, '')}
                </Link>
              )}
              {tt && (
                <Link
                  href={`https://tiktok.com/@${tt.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-neutral-950 rounded px-1"
                  aria-label={`TikTok: @${tt.replace(/^@/, '')}`}
                >
                  <TikTokIcon className="h-4 w-4 shrink-0" />
                  @{tt.replace(/^@/, '')}
                </Link>
              )}
              {contacts.length > 0 && (
                <div className="inline-flex items-center gap-2">
                  <select
                    value={selectedPhone || contacts[0]?.phoneNumber}
                    onChange={(e) => setSelectedPhone(e.target.value)}
                    className="inline-flex appearance-none items-center gap-1 rounded border-0 bg-transparent py-0.5 pr-5 text-sm text-neutral-400 transition-colors hover:text-[#25D366] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-neutral-950 cursor-pointer max-w-[120px] truncate bg-no-repeat bg-right bg-[length:0.75rem] [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 fill%3D%22none%22 viewBox%3D%220 0 24 24%22 stroke%3D%22%239ca3af%22%3E%3Cpath stroke-linecap%3D%22round%22 stroke-linejoin%3D%22round%22 stroke-width%3D%222%22 d%3D%22M19 9l-7 7-7-7%22%2F%3E%3C%2Fsvg%3E')]"
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
                    onClick={() => {
                      const phone = selectedPhone || contacts[0]?.phoneNumber;
                      if (!phone) return;
                      const contact = contacts.find((c) => c.phoneNumber === phone);
                      const contactName = contact?.name ?? '';
                      const message = getWhatsAppContactMessage(name, contactName, locale);
                      openWhatsAppToPhone(phone, message);
                    }}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#25D366] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-neutral-950 rounded px-1 text-neutral-400"
                    aria-label={locale === 'es' ? 'Contáctanos por WhatsApp' : 'Contact via WhatsApp'}
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0 text-[#25D366]" aria-hidden />
                    {locale === 'es' ? 'WhatsApp' : 'WhatsApp'}
                  </button>
                </div>
              )}
            </div>
          )}
          {description && (
            <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-neutral-400 whitespace-pre-line">
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
