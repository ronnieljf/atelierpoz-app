import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { defaultLocale } from '@/constants/locales';
// import { ProductSearch } from '@/components/products/ProductSearch';
// import { getRecentProducts } from '@/lib/services/products';
import { getAllStores } from '@/lib/services/stores';
// import { type Product } from '@/types/product';
import { type Store } from '@/lib/services/stores';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getSeoLogoUrl } from '@/lib/utils/seo';
import { HomeStoresSection } from '@/components/home/HomeStoresSection';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(defaultLocale);
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
    keywords: 'plataforma multitienda, marketplace, tiendas independientes, varias tiendas, productos, comprar online',
    authors: [{ name: siteName }],
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
          url: logoUrlFinal,
          width: 1200,
          height: 630,
          alt: `${siteName} - Plataforma multitienda`,
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
  const dict = getDictionary(defaultLocale);

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
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      description: 'Plataforma multitienda: varias tiendas independientes y sus productos en un solo lugar.',
    },
  };

  return (
    <div className="overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-14">
        {/* Hero: vista inicial elegante y profesional */}
        <header className="relative mb-12 sm:mb-16 md:mb-20 text-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] bg-primary-900/15 rounded-full blur-[100px]" />
          </div>
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-500 mb-4">
              {dict.title}
            </p>
            <h1 className="text-4xl font-light tracking-tight text-neutral-50 drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl mb-5">
              {dict.welcome}
            </h1>
            <div className="mx-auto h-px w-20 bg-gradient-to-r from-transparent via-neutral-500 to-transparent mb-5" />
            <p className="mx-auto max-w-md text-sm font-light text-neutral-400 leading-relaxed sm:text-base md:max-w-lg">
              {dict.description}
            </p>
          </div>
        </header>

        {/* Lista de tiendas: contenido principal */}
        <HomeStoresSection
          stores={stores}
          heading="Nuestras tiendas"
          subheading="Elige una tienda y descubre sus productos."
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
