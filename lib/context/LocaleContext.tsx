'use client';

import { createContext, useContext } from 'react';
import { type Locale } from '@/constants/locales';

const LocaleContext = createContext<Locale>('es');

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext(): Locale {
  return useContext(LocaleContext);
}
