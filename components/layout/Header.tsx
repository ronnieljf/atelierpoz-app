'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, LogIn, LayoutDashboard } from 'lucide-react';
import { type Locale } from '@/constants/locales';
import { getDictionary } from '@/lib/i18n/dictionary';
import { CartIcon } from '@/components/cart/CartIcon';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { getAllStores, getStoreById } from '@/lib/services/stores';
import { useAuth } from '@/lib/store/auth-store';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const { state } = useAuth();
  const isLoggedIn = state.isAuthenticated;
  const [showStoresButton, setShowStoresButton] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  // Extraer el identificador de la tienda de la URL: /:id (una sola ruta, no reservada)
  const storeIdentifier = (() => {
    if (!pathname || pathname === '/') return null;
    const segment = pathname.replace(/^\//, '').split('/')[0];
    const reserved = ['cart', 'admin', 'products'];
    if (!segment || reserved.includes(segment)) return null;
    return segment;
  })();

  useEffect(() => {
    const checkStores = async () => {
      try {
        const stores = await getAllStores();
        setShowStoresButton(stores.length >= 2);
      } catch (error) {
        console.error('Error obteniendo tiendas:', error);
        setShowStoresButton(false);
      }
    };

    checkStores();
  }, []);

  useEffect(() => {
    if (!storeIdentifier) {
      // Usar setTimeout para evitar setState síncrono en efecto
      const timer = setTimeout(() => setStoreName(null), 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    getStoreById(storeIdentifier).then((store) => {
      if (!cancelled && store?.name) setStoreName(store.name);
    }).catch(() => {
      if (!cancelled) setStoreName(null);
    });
    return () => { cancelled = true; };
  }, [storeIdentifier]);

  const getStoreInitials = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return (words[0][0] ?? '').toUpperCase();
    return words
      .slice(0, 4)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  };

  const headerTitle = storeName ? getStoreInitials(storeName) : dict.title;

  const navButtonClass = cn(
    'flex items-center justify-center rounded-lg p-2 text-neutral-300 transition-colors hover:bg-neutral-800/80 hover:text-white sm:gap-1.5 sm:px-2.5 sm:py-2',
    'focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950'
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/60 bg-neutral-950/90 backdrop-blur-xl">
      <div className="flex h-12 sm:h-14 min-w-0 items-center justify-between gap-2 px-3 sm:container sm:mx-auto sm:max-w-5xl sm:gap-4 sm:px-6">
        <Link
          href="/"
          prefetch={true}
          className="flex min-w-0 shrink items-center gap-1.5 text-white transition-opacity hover:opacity-90 sm:gap-2"
          aria-label={storeName ?? dict.navigation.home}
          title={storeName ?? dict.navigation.home}
        >
          <Home className="h-4 w-4 shrink-0 text-neutral-300 sm:h-5 sm:w-5" />
          <span className="truncate text-sm font-light tracking-tight sm:text-base md:text-lg">
            {headerTitle}
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <LanguageSwitcher currentLocale={locale} />
          {showStoresButton && (
            <Link href="/" prefetch={true} className={navButtonClass} title={dict.navigation.home}>
              <Store className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">{dict.navigation.home}</span>
            </Link>
          )}
          {isLoggedIn ? (
            <Link href="/admin" className={navButtonClass} title="Ir al panel de administración">
              <LayoutDashboard className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          ) : (
            <Link href="/admin/login" className={navButtonClass} title={dict.auth.signIn}>
              <LogIn className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden md:inline">{dict.auth.signIn}</span>
            </Link>
          )}
          <CartIcon locale={locale} dict={dict} />
        </nav>
      </div>
    </header>
  );
}
