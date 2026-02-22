import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';
import { ThemeProvider } from '@/lib/store/theme-store';
import { PublicLayoutWrapper } from '@/components/layout/PublicLayoutWrapper';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { getSeoLogoUrl } from '@/lib/utils/seo';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(defaultLocale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const logoUrl = getSeoLogoUrl();
  const siteName = dict.title;
  const description = dict.description || 'Plataforma multitienda: varias tiendas, un solo destino. Descubre marcas independientes y sus productos.';

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: 'plataforma multitienda, marketplace, tiendas independientes, varias tiendas, productos, comprar online, tienda online',
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      url: `${baseUrl}/`,
      siteName,
      title: siteName,
      description,
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} - Plataforma multitienda`,
          secureUrl: logoUrl,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description,
      images: [logoUrl],
      creator: '@atelierpoz',
    },
    icons: {
      icon: '/logo-atelier.png',
      apple: '/logo-atelier.png',
      shortcut: '/logo-atelier.png',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                } catch (e) {
                  // Ignorar errores
                }
              })();
            `,
          }}
        />
        {/* Efectos de fondo: reducidos en móvil para mejor rendimiento */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
          <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-primary-900/10 rounded-full blur-[60px] sm:blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-primary-800/10 rounded-full blur-[60px] sm:blur-[120px]" />
          <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-700/5 rounded-full blur-[150px]" />
        </div>
        <GoogleAnalytics />
        <PageViewTracker />
        <ThemeProvider>
          <PublicLayoutWrapper>{children}</PublicLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
