import { type Locale } from '@/constants/locales';
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';

const dictionaries = {
  en,
  es,
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export type Dictionary = typeof en;
