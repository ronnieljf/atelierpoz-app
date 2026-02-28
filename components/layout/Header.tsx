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

  const headerTitle = storeName ?? dict.title;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/60 bg-neutral-950/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          aria-label={dict.navigation.home}
        >
          <Home className="h-5 w-5 sm:h-5 sm:w-5 text-neutral-300 shrink-0" />
          <span className="truncate text-lg font-light tracking-tight sm:text-xl">{headerTitle}</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher currentLocale={locale} />
          {showStoresButton && (
            <Link
              href="/"
              prefetch={true}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-light text-neutral-300 transition-colors hover:bg-neutral-800/80 hover:text-white sm:gap-2',
                'focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950'
              )}
              title={dict.navigation.home}
            >
              <Store className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{dict.navigation.home}</span>
            </Link>
          )}
          {isLoggedIn ? (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-light text-neutral-300 transition-colors hover:bg-neutral-800/80 hover:text-white',
                'focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950'
              )}
              title="Ir al panel de administración"
            >
              <LayoutDashboard className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-light text-neutral-300 transition-colors hover:bg-neutral-800/80 hover:text-white',
                'focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950'
              )}
              title={dict.auth.signIn}
            >
              <LogIn className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{dict.auth.signIn}</span>
            </Link>
          )}
          <CartIcon locale={locale} dict={dict} />
        </nav>
      </div>
    </header>
  );
}
