import { locales, type Locale, defaultLocale } from '@/constants/locales';

export const i18nConfig = {
  locales,
  defaultLocale,
} as const;

export type { Locale };
