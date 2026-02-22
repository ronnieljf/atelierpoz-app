'use client';

import { useEffect, useState } from 'react';

/**
 * Loader inicial ligero: solo CSS para no cargar framer-motion y mejorar rendimiento en móvil.
 * Usa <img> nativo para evitar problemas con next/image en el splash (ruta estática desde public).
 */
export function InitialLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const startFade = setTimeout(() => setIsFading(true), 350);
    const unmount = setTimeout(() => setIsVisible(false), 700);
    return () => {
      clearTimeout(startFade);
      clearTimeout(unmount);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`initial-loader-overlay fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950 ${isFading ? 'initial-loader-fade-out' : ''}`}
      aria-hidden
    >
      <div className="initial-loader-content flex flex-col items-center">
        <div className="relative w-48 sm:w-64 h-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-atelier.png"
            alt="Atelier"
            width={400}
            height={400}
            className="relative z-10 w-full h-auto object-contain"
            fetchPriority="high"
          />
        </div>
        <div className="mt-4 h-0.5 w-20 bg-gradient-to-r from-transparent via-primary-500/80 to-transparent initial-loader-line" />
      </div>
    </div>
  );
}
