'use client';

import { type Locale } from '@/constants/locales';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Instagram } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
  locale: Locale;
}

export function Footer({ locale }: FooterProps) {
  const dict = getDictionary(locale);

  return (
    <footer className="relative border-t border-neutral-800/50 mt-20">
      {/* Efecto de brillo superior */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-800/30 to-transparent" />
      
      {/* Resplandor de fondo */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:gap-8 md:flex-row">
          {/* Copyright con mejor estilo */}
          <div className="text-center sm:text-left">
            <p className="text-xs font-light text-neutral-500 mb-2">
              © {new Date().getFullYear()} {dict.title}
            </p>
            <p className="text-[10px] font-light text-neutral-600">
              {dict.footer.allRightsReserved}
            </p>
          </div>
          
          {/* Legal + Redes */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/landing"
              className="text-xs font-light text-neutral-500 hover:text-primary-400 transition-colors"
            >
              {dict.footer.forBusiness}
            </Link>
            <Link
              href="/politica-de-privacidad"
              className="text-xs font-light text-neutral-500 hover:text-primary-400 transition-colors"
            >
              {dict.footer.privacyPolicy}
            </Link>
            <Link
              href="/terminos-y-condiciones"
              className="text-xs font-light text-neutral-500 hover:text-primary-400 transition-colors"
            >
              {dict.footer.termsAndConditions}
            </Link>
            <Link
              href="https://instagram.com/atelierpoz"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800/30 hover:bg-neutral-800/50 border border-neutral-700/30 hover:border-primary-600/30 text-neutral-400 hover:text-primary-300 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm"
              aria-label={dict.footer.followUs}
            >
              {/* Resplandor de fondo */}
              <div className="absolute inset-0 bg-primary-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
              
              <Instagram className="h-5 w-5 relative z-10" />
              <span className="text-xs font-light hidden sm:inline relative z-10">@atelierpoz</span>
            </Link>
          </div>
        </div>
        
        {/* Línea decorativa inferior */}
        <div className="mt-8 pt-6 border-t border-neutral-800/30">
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary-700/30 to-primary-700/30" />
            <div className="w-1 h-1 rounded-full bg-primary-700/30" />
            <div className="h-px w-12 bg-gradient-to-r from-primary-700/30 to-transparent" />
          </div>
        </div>
      </div>
    </footer>
  );
}
