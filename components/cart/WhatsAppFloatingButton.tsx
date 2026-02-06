'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/store/cart-store';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';
import Link from 'next/link';

interface WhatsAppFloatingButtonProps {
  locale: Locale;
  dict: Dictionary;
}

export function WhatsAppFloatingButton({ dict }: WhatsAppFloatingButtonProps) {
  const { state } = useCart();
  const { cart } = state;

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)]">
      <Link
        href="/cart"
        className="group flex items-center gap-2.5 sm:gap-3 rounded-2xl bg-neutral-900/90 backdrop-blur-md border border-neutral-600/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-primary-500/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,175,55,0.1)] px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
        title={dict.navigation.cart}
      >
        <div className="relative flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-400 group-hover:text-primary-300 transition-colors duration-300 flex-shrink-0" />
        </div>
        <span className="hidden sm:inline-block text-sm font-medium text-neutral-200 group-hover:text-neutral-100 whitespace-nowrap transition-colors duration-300">
          {dict.navigation.cart}
        </span>
        {cart.itemCount > 0 && (
          <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-primary-600/90 text-[10px] sm:text-xs font-semibold text-white flex-shrink-0 border border-primary-500/30 tabular-nums">
            {cart.itemCount > 99 ? '99+' : cart.itemCount}
          </span>
        )}
      </Link>
    </div>
  );
}
