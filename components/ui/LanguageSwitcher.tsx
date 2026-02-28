'use client';

import { useRouter } from 'next/navigation';
import { type Locale, locales } from '@/constants/locales';

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
    <div
      role="group"
      aria-label="Seleccionar idioma"
      className="inline-flex rounded-lg border border-neutral-700/60 bg-neutral-900/60 p-0.5"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          title={locale === 'es' ? 'Español' : 'English'}
          className={`min-w-[2rem] px-2 py-1 rounded-md text-xs font-medium uppercase transition-all duration-150 ${
            currentLocale === locale
              ? 'bg-neutral-700 text-white shadow-sm'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
