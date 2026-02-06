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
      className="relative flex items-center justify-center p-2 rounded-lg text-neutral-100 transition-all duration-200 hover:opacity-60 hover:bg-neutral-800"
      title={dict.navigation.cart}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-light text-neutral-900">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
