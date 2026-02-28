import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';
import { Cart } from '@/components/cart/Cart';
import { getSeoLogoUrl, getOgLocale, getSeoKeywords } from '@/lib/utils/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const logoUrl = getSeoLogoUrl();
  const siteName = dict.title;
  const title = dict.cart.title;
  const description = locale === 'es'
    ? 'Revisa tu carrito y completa tu pedido. Compra en las tiendas de la plataforma.'
    : 'Review your cart and complete your order. Shop from platform stores.';

  return {
    title: `${title} | ${siteName}`,
    description,
    keywords: `${locale === 'es' ? 'carrito, compras, checkout, pedido' : 'cart, shopping, checkout, order'}, ${getSeoKeywords(dict)}`,
    authors: [{ name: siteName }],
    robots: {
      index: false, // No indexar carrito (contenido personal)
      follow: true,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/cart',
      languages: { es: '/cart', en: '/cart', 'x-default': '/cart' },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
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
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
      <Cart dict={dict} locale={locale} />
    </div>
  );
}
