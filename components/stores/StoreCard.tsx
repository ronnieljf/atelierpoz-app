'use client';

import { useState } from 'react';
import { Store } from '@/lib/services/stores';
import { Store as StoreIcon, MapPin, Instagram } from 'lucide-react';
import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils/image-url';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = resolveImageUrl(store.logo ?? null) ?? store.logo ?? null;
  const showLogo = !!logoUrl && !logoError;
  
  // Usar store_id (slug) para URL amigable cuando exista, sino el ID (UUID)
  const storeIdentifier = (store.store_id && store.store_id.trim()) ? store.store_id : store.id;
  const instagram = store.instagram?.trim() || null;
  const tiktok = store.tiktok?.trim() || null;
  const hasSocial = !!(instagram || tiktok);

  return (
    <Link
      href={`/${storeIdentifier}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900/90 via-neutral-800/90 to-neutral-900/90 border border-neutral-700/30 shadow-xl hover:shadow-2xl hover:shadow-primary-900/20 transition-all duration-700 hover:-translate-y-3 backdrop-blur-sm hover:backdrop-blur-lg"
    >
      {/* Borde brillante animado */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-600/20 via-primary-500/30 to-primary-600/20 blur-sm" />
      </div>
      
      {/* Efectos de resplandor en esquinas */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Contenido */}
      <div className="p-6 sm:p-8 flex flex-1 flex-col space-y-4 relative z-10">
        {/* Logo o icono con efecto mejorado */}
        <div className="relative w-fit">
          <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600/20 to-primary-800/20 border border-primary-500/30 mb-2 group-hover:from-primary-600/40 group-hover:to-primary-800/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <StoreIcon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-400 shrink-0 group-hover:text-primary-300 transition-colors" />
            )}
          </div>
          {/* Resplandor detrás del logo */}
          <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Nombre de la tienda con efecto */}
        <h3 className="text-xl sm:text-2xl font-semibold text-neutral-100 transition-all duration-300 group-hover:text-primary-300 group-hover:drop-shadow-lg leading-tight">
          {store.name}
        </h3>

        {/* Descripción (si existe) */}
        {store.description && (
          <p className="text-sm font-light text-neutral-400 group-hover:text-neutral-300 line-clamp-2 whitespace-pre-line transition-colors duration-300">
            {store.description}
          </p>
        )}

        {/* Ubicación (si existe) */}
        {store.location && (
          <p className="text-xs font-light text-neutral-500 group-hover:text-neutral-400 flex items-center gap-1 transition-colors duration-300">
            <MapPin className="h-3.5 w-3.5 shrink-0 group-hover:text-primary-400" />
            {store.location}
          </p>
        )}

        {/* Instagram / TikTok (si existen) */}
        {hasSocial && (
          <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-light text-neutral-500 transition-colors hover:bg-neutral-700/60 hover:text-pink-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label={`Instagram: @${instagram.replace(/^@/, '')}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="h-3.5 w-3.5 shrink-0" />
                <span>@{instagram.replace(/^@/, '')}</span>
              </a>
            )}
            {tiktok && (
              <a
                href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-light text-neutral-500 transition-colors hover:bg-neutral-700/60 hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                aria-label={`TikTok: @${tiktok.replace(/^@/, '')}`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span>@{tiktok.replace(/^@/, '')}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Efecto de brillo en hover mejorado */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-primary-500/15 to-transparent transform rotate-12 translate-x-[-100%] translate-y-[-100%] group-hover:translate-x-[100%] group-hover:translate-y-[100%] transition-transform duration-1500 ease-out" />
      </div>
    </Link>
  );
}
