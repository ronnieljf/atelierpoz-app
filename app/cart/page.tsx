import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';
import { Cart } from '@/components/cart/Cart';
import { getSeoLogoUrl } from '@/lib/utils/seo';

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(defaultLocale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const logoUrl = getSeoLogoUrl();
  const siteName = dict.title;
  const title = 'Carrito de Compras';
  const description = 'Revisa tu carrito y completa tu pedido. Compra en las tiendas de la plataforma.';

  return {
    title: `${title} | ${siteName}`,
    description,
    keywords: 'carrito, compras, productos, checkout, pedido',
    authors: [{ name: siteName }],
    robots: {
      index: false, // No indexar carrito (contenido personal)
      follow: true,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/cart',
    },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      url: `${baseUrl}/cart`,
      siteName,
      title: `${title} | ${siteName}`,
      description,
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteName}`,
          secureUrl: logoUrl,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
      images: [logoUrl],
      creator: '@atelierpoz',
    },
  };
}

export default async function CartPage() {
  const dict = getDictionary(defaultLocale);

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
      <Cart dict={dict} locale={defaultLocale} />
    </div>
  );
}
