'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/store/cart-store';
import { type Locale } from '@/constants/locales';
import { type Dictionary } from '@/lib/i18n/dictionary';

interface CartIconProps {
  locale: Locale;
  dict: Dictionary;
}

export function CartIcon({ dict }: CartIconProps) {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  
  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center p-2 rounded-lg text-white transition-colors hover:bg-neutral-800/80 hover:text-white active:scale-95 group sm:p-2"
      title={dict.navigation.cart}
    >
      <ShoppingCart className="h-4 w-4 group-hover:drop-shadow-sm transition-all sm:h-5 sm:w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-white to-neutral-100 text-[10px] font-bold text-primary-800 shadow-lg shadow-white/20 animate-pulse-glow border border-primary-200/50">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
      {/* Efecto de resplandor */}
      <div className="absolute inset-0 bg-primary-300/40 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  );
}
