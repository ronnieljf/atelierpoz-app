'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/lib/services/stores';
import { Store as StoreIcon, MapPin, Instagram } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils/image-url';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const router = useRouter();
  const [logoError, setLogoError] = useState(false);
  const logoUrl = resolveImageUrl(store.logo ?? null) ?? store.logo ?? null;
  const showLogo = !!logoUrl && !logoError;

  const storeIdentifier = (store.store_id && store.store_id.trim()) ? store.store_id : store.id;
  const instagram = store.instagram?.trim() || null;
  const tiktok = store.tiktok?.trim() || null;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/${storeIdentifier}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/${storeIdentifier}`);
        }
      }}
      className="group relative flex aspect-square w-full cursor-pointer overflow-hidden rounded-xl border border-neutral-700/40 bg-neutral-800/80 shadow-md transition-all duration-300 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-900/15"
    >
      {/* Solo logo: ocupa toda la card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            onError={() => setLogoError(true)}
          />
        ) : (
          <StoreIcon className="h-16 w-16 text-primary-500/60 sm:h-20 sm:w-20" />
        )}
      </div>

      {/* Overlay con info al hover */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="p-4 pt-8 text-left">
          <h3 className="text-base font-semibold text-white drop-shadow-sm sm:text-lg">
            {store.name}
          </h3>
          {store.description && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-300 sm:text-sm">
              {store.description}
            </p>
          )}
          {store.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {store.location}
            </p>
          )}
          {(instagram || tiktok) && (
            <div className="mt-2 flex items-center gap-2">
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 transition-colors hover:text-pink-400"
                  aria-label={`Instagram ${instagram}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {tiktok && (
                <a
                  href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 transition-colors hover:text-white"
                  aria-label={`TikTok ${tiktok}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
