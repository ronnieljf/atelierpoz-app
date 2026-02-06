'use client';

import { useState } from 'react';
import { Instagram, Video, MapPin } from 'lucide-react';
import Link from 'next/link';

interface StorePageHeaderProps {
  name: string;
  logo?: string | null;
  description?: string | null;
  location?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
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
  const showLogo = !!logo && !logoError;

  return (
    <div className="mb-8 sm:mb-12 md:mb-16 text-center relative">
      {/* Solo móvil: hero destacado con nombre de la tienda */}
      <div className="md:hidden mb-10 pt-4 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 bg-primary-900/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          {showLogo && (
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo!}
                alt=""
                className="h-20 w-20 rounded-2xl object-cover border border-neutral-700/50 shadow-lg"
                onError={() => setLogoError(true)}
              />
            </div>
          )}
          <h1 className="text-4xl font-light tracking-tight text-neutral-50 drop-shadow-md mb-3">
            {name}
          </h1>
          <div className="h-px w-16 mx-auto bg-gradient-to-r from-transparent via-neutral-500 to-transparent mb-3" />
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
            {instagram && (
              <Link
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-purple-400 transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @{instagram}
              </Link>
            )}
            {tiktok && (
              <Link
                href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-cyan-400 transition-colors"
              >
                <Video className="h-4 w-4" />
                @{tiktok.replace(/^@/, '')}
              </Link>
            )}
          </div>
          {description && (
            <p className="text-sm font-light text-neutral-400 whitespace-pre-line">{description}</p>
          )}
          {location && (
            <p className="text-sm font-light text-neutral-500 mt-1 flex items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </p>
          )}
        </div>
      </div>

      {/* Desktop: bloque actual */}
      <div className="hidden md:block">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 sm:w-96 sm:h-96 bg-primary-900/5 rounded-full blur-3xl animate-float" />
      </div>

      {showLogo ? (
        <>
          <div className="relative flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo!}
              alt=""
              className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-2xl object-cover border border-neutral-700/50 shadow-lg mb-4"
              onError={() => setLogoError(true)}
            />
            <h1 className="relative mb-2 sm:mb-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-neutral-50 drop-shadow-lg">
              {name}
            </h1>
          </div>
          <div className="relative mt-2 mb-4 flex flex-wrap items-center justify-center gap-3">
            {instagram && (
              <Link
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 group"
              >
                <Instagram className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                  @{instagram}
                </span>
              </Link>
            )}
            {tiktok && (
              <Link
                href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800/60 border border-neutral-600 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all duration-200 group"
              >
                <Video className="h-4 w-4 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                <span className="text-sm font-medium text-neutral-300 group-hover:text-cyan-300 transition-colors">
                  @{tiktok.replace(/^@/, '')}
                </span>
              </Link>
            )}
          </div>
          {description && (
            <p className="relative mx-auto max-w-2xl text-sm sm:text-base font-light text-neutral-400 whitespace-pre-line px-4">
              {description}
            </p>
          )}
          {location && (
            <p className="relative mx-auto max-w-2xl mt-2 text-sm font-light text-neutral-500 flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {location}
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="relative mb-2 sm:mb-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-neutral-50 drop-shadow-lg">
            {name}
          </h1>
          <div className="relative mt-2 mb-4 flex flex-wrap items-center justify-center gap-3">
            {instagram && (
              <Link
                href={`https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-200 group"
              >
                <Instagram className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                  @{instagram}
                </span>
              </Link>
            )}
            {tiktok && (
              <Link
                href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800/60 border border-neutral-600 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all duration-200 group"
              >
                <Video className="h-4 w-4 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                <span className="text-sm font-medium text-neutral-300 group-hover:text-cyan-300 transition-colors">
                  @{tiktok.replace(/^@/, '')}
                </span>
              </Link>
            )}
          </div>
          {description && (
            <p className="relative mx-auto max-w-2xl text-sm sm:text-base font-light text-neutral-400 whitespace-pre-line px-4">
              {description}
            </p>
          )}
          {location && (
            <p className="relative mx-auto max-w-2xl mt-2 text-sm font-light text-neutral-500 flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {location}
            </p>
          )}
        </>
      )}
      </div>
    </div>
  );
}
