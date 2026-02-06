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
    <footer className="border-t border-neutral-800/50">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row">
          <p className="text-xs font-light text-neutral-500 text-center sm:text-left">
            © {new Date().getFullYear()} {dict.title}
          </p>
          
          {/* Redes Sociales */}
          <div className="flex items-center gap-4">
            <Link
              href="https://instagram.com/atelierpoz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-neutral-400 hover:text-primary-400 transition-colors duration-200"
              aria-label="Síguenos en Instagram"
            >
              <Instagram className="h-5 w-5" />
              <span className="text-xs font-light hidden sm:inline">@atelierpoz</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
