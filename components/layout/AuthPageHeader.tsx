'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { type Locale } from '@/constants/locales';

interface AuthPageHeaderProps {
  locale: Locale;
}

export function AuthPageHeader({ locale }: AuthPageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
          <span className="text-sm font-light">Atelier Poz</span>
        </Link>
        <LanguageSwitcher currentLocale={locale} />
      </div>
    </header>
  );
}
