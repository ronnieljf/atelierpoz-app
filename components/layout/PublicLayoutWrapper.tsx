'use client';

import { usePathname } from 'next/navigation';
import { CartProvider } from '@/lib/store/cart-store';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFloatingButtonWrapper } from '@/components/cart/WhatsAppFloatingButtonWrapper';
import { PageTransition } from '@/components/ui/PageTransition';
import { InitialLoader } from '@/components/ui/InitialLoader';
import { CartRestoreDialogWrapper } from '@/components/ui/CartRestoreDialogWrapper';
import { defaultLocale } from '@/constants/locales';

export function PublicLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Si es una ruta del admin, renderizar solo el children sin Header/Footer
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Para rutas públicas, renderizar con Header, Footer, etc.
  return (
    <CartProvider>
      <InitialLoader />
      <CartRestoreDialogWrapper locale={defaultLocale} />
      <div className="flex min-h-screen flex-col">
        <Header locale={defaultLocale} />
        <main className="flex-1">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <Footer locale={defaultLocale} />
        <WhatsAppFloatingButtonWrapper locale={defaultLocale} />
      </div>
    </CartProvider>
  );
}
