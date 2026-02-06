'use client';

import { useState } from 'react';
import { Store } from '@/lib/services/stores';
import { Store as StoreIcon, MapPin } from 'lucide-react';
import Link from 'next/link';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const [logoError, setLogoError] = useState(false);
  const showLogo = !!store.logo && !logoError;
  
  // Usar store_id (slug) para URL amigable cuando exista, sino el ID (UUID)
  const storeIdentifier = (store.store_id && store.store_id.trim()) ? store.store_id : store.id;

  return (
    <Link
      href={`/${storeIdentifier}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border border-neutral-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
    >
      {/* Contenido */}
      <div className="p-6 sm:p-8 flex flex-1 flex-col space-y-4">
        {/* Logo o icono */}
        <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600/20 to-primary-800/20 border border-primary-500/30 mb-2 group-hover:from-primary-600/30 group-hover:to-primary-800/30 transition-all duration-300">
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <StoreIcon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-400 shrink-0" />
          )}
        </div>

        {/* Nombre de la tienda */}
        <h3 className="text-xl sm:text-2xl font-semibold text-neutral-100 transition-colors group-hover:text-primary-400 leading-tight">
          {store.name}
        </h3>

        {/* Descripción (si existe) */}
        {store.description && (
          <p className="text-sm font-light text-neutral-400 line-clamp-2 whitespace-pre-line">
            {store.description}
          </p>
        )}

        {/* Ubicación (si existe) */}
        {store.location && (
          <p className="text-xs font-light text-neutral-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {store.location}
          </p>
        )}
      </div>

      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-primary-500/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </Link>
  );
}
