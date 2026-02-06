'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type Locale, locales, localeNames } from '@/constants/locales';

interface LanguageSwitcherProps {
  currentLocale: Locale;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    // Reemplazar el locale actual en la ruta
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    router.push(newPath);
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
