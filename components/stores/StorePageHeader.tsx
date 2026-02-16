'use client';

import { useState } from 'react';
import { Instagram, MapPin } from 'lucide-react';
import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils/image-url';

interface StorePageHeaderProps {
  name: string;
  logo?: string | null;
  description?: string | null;
  location?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function StorePageHeader({
  name,
  logo,
  description,
  location,
  instagram,
  tiktok,
}: StorePageHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = resolveImageUrl(logo ?? null) ?? logo ?? null;
  const showLogo = !!logoUrl && !logoError;
  const ig = instagram?.trim();
  const tt = tiktok?.trim();
  const hasSocial = !!(ig || tt);

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
