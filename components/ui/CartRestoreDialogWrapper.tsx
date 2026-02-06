'use client';

import { CartRestoreDialog } from './CartRestoreDialog';
import { getDictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';

interface CartRestoreDialogWrapperProps {
  locale: Locale;
}

export function CartRestoreDialogWrapper({ locale }: CartRestoreDialogWrapperProps) {
  const dict = getDictionary(locale);
  return <CartRestoreDialog dict={dict} />;
}
