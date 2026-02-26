'use client';

import { usePathname } from 'next/navigation';
import { FirstVisitDialog } from './FirstVisitDialog';
import { getDictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';

interface FirstVisitDialogWrapperProps {
  locale: Locale;
}

export function FirstVisitDialogWrapper({ locale }: FirstVisitDialogWrapperProps) {
  const pathname = usePathname() ?? '';
  const dict = getDictionary(locale);
  return <FirstVisitDialog dict={dict} pathname={pathname} />;
}
