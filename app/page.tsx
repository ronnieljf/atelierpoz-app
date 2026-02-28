import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';
// import { ProductSearch } from '@/components/products/ProductSearch';
// import { getRecentProducts } from '@/lib/services/products';
import { getAllStores } from '@/lib/services/stores';
// import { type Product } from '@/types/product';
import { type Store } from '@/lib/services/stores';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getSeoLogoUrl, getOgLocale, getSeoKeywords } from '@/lib/utils/seo';
import { HomeStoresSection } from '@/components/home/HomeStoresSection';
import { HomeViewTracker } from '@/components/analytics/HomeViewTracker';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const logoUrlFinal = getSeoLogoUrl();
  const siteName = dict.title;
  const description = dict.description || 'Plataforma multitienda: descubre tiendas independientes y sus productos en un solo lugar.';

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: getSeoKeywords(dict),
    authors: [{ name: siteName }],
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: '/',
      languages: { es: '/', en: '/', 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
      url: `${baseUrl}/`,
      siteName,
      title: siteName,
      description,
      images: [
        {
          url: logoUrlFinal,
          width: 1200,
          height: 630,
          alt: dict.seo.ogImageAlt,
          secureUrl: logoUrlFinal,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description,
      images: [logoUrlFinal],
      creator: '@atelierpoz',
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

export default async function HomePage() {
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);

  let stores: Store[] = [];
  try {
    stores = await getAllStores();
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
  }

  // Listado de productos en el home (comentado: el home solo muestra tiendas)
  // let initialProducts: Product[] = [];
  // try {
  //   const result = await getRecentProducts(20, 0);
  //   initialProducts = result.products;
  // } catch (error) {
  //   console.error('Error obteniendo productos recientes:', error);
  // }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const siteName = dict.title;
  const description = dict.description || 'Plataforma multitienda: descubre tiendas independientes y sus productos en un solo lugar.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    description,
    url: baseUrl,
    inLanguage: [locale === 'es' ? 'es' : 'en', locale === 'es' ? 'en' : 'es'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo-atelier.png` },
    },
  };

  return (
    <div className="overflow-x-hidden relative">
      <HomeViewTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14 md:py-20 relative z-10">
        {/* Hero: limpio y elegante */}
        <header className="relative mb-14 sm:mb-16 md:mb-24 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 mb-6">
            {dict.title}
          </p>
          <h1 className="text-3xl font-light tracking-tight text-white sm:text-4xl md:text-5xl mb-4">
            {dict.welcome}
          </h1>
          <div className="mx-auto mb-6 h-px w-16 bg-neutral-600" aria-hidden />
          <p className="mx-auto max-w-md text-sm font-light text-neutral-400 leading-relaxed sm:text-base">
            {dict.description}
          </p>
        </header>

        {/* Lista de tiendas: contenido principal */}
        <HomeStoresSection
          stores={stores}
          heading={dict.homeStores.heading}
          subheading={dict.homeStores.subheading}
          emptyHeading={dict.homeStores.emptyHeading}
          emptyDescription={dict.homeStores.emptyDescription}
        />

        {/* Búsqueda de productos en el home (comentado: el home solo muestra tiendas) */}
        {/* <section className="pt-8 sm:pt-12 md:pt-16 border-t border-neutral-800/60">
          <div className="mb-6 sm:mb-8 text-center">
            <p className="text-sm font-light text-neutral-500">
              ¿Buscas algo en concreto? Explora el catálogo
            </p>
          </div>
          <ProductSearch dict={dict} initialProducts={initialProducts} />
        </section> */}

        <ScrollToTop />
      </div>
    </div>
  );
}
