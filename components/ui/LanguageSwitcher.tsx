'use client';

import { useRouter } from 'next/navigation';
import { type Locale, locales, localeNames } from '@/constants/locales';

const LOCALE_COOKIE = 'NEXT_LOCALE';

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className="flex gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={`px-3 py-1.5 rounded-lg text-xs font-light tracking-wide transition-all duration-200 ${
            currentLocale === locale
              ? 'opacity-100 text-neutral-100 bg-neutral-800'
              : 'opacity-50 hover:opacity-70 hover:bg-neutral-800/50 text-neutral-400'
          }`}
        >
          {localeNames[locale]}
        </button>
      ))}
    </div>
  );
}
