'use client';

import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';
import { getDictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';

interface WhatsAppFloatingButtonWrapperProps {
  locale: Locale;
}

export function WhatsAppFloatingButtonWrapper({ locale }: WhatsAppFloatingButtonWrapperProps) {
  const dict = getDictionary(locale);
  return <WhatsAppFloatingButton locale={locale} dict={dict} />;
}
