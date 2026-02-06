'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store } from 'lucide-react';
import { type Locale } from '@/constants/locales';
import { getDictionary } from '@/lib/i18n/dictionary';
import { CartIcon } from '@/components/cart/CartIcon';
import { getAllStores, getStoreById } from '@/lib/services/stores';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  locale: Locale;
}

export function Header({ locale }: HeaderProps) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
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
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800/50 glass-effect rounded-b-2xl shadow-lg">
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          prefetch={true}
          className="flex items-center gap-2 text-xl sm:text-2xl font-light tracking-tight text-neutral-50 transition-all duration-300 hover:opacity-70 relative group"
          aria-label={dict.navigation.home}
        >
          <Home className="h-5 w-5 sm:h-6 sm:w-6 text-primary-400 group-hover:text-primary-300 transition-colors shrink-0" />
          <span className="relative z-10 truncate">{headerTitle}</span>
          <span className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-primary-800/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
        </Link>
        
        <nav className="flex items-center gap-2 sm:gap-4">
          {showStoresButton && (
            <Link
              href="/"
              prefetch={true}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-light transition-all duration-200",
                "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50"
              )}
              title="Inicio"
            >
              <Store className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
          )}
          <CartIcon locale={locale} dict={dict} />
        </nav>
      </div>
    </header>
  );
}
