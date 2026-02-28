import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';
import { ProductSearch } from '@/components/products/ProductSearch';
import { StorePageHeader } from '@/components/stores/StorePageHeader';
import { StoreViewTracker } from '@/components/analytics/StoreViewTracker';
import { getStoreProducts } from '@/lib/services/products';
import { getStoreById } from '@/lib/services/stores';
import { type Product } from '@/types/product';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getSeoLogoUrl, getOgLocale, getSeoKeywords } from '@/lib/utils/seo';

export const dynamic = 'force-dynamic';

/** Rutas reservadas: no son tiendas, evitan que [id] las capture. */
const RESERVED_SEGMENTS = ['cart', 'admin', 'products'];

/** Convierte una URL de imagen a absoluta; descarta data: e inválidas. */
function toAbsoluteImageUrl(url: string | undefined, baseUrl: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  if (url.startsWith('http')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (RESERVED_SEGMENTS.includes(id)) {
    return { title: 'Not Found' };
  }
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const siteName = dict.title;
  const defaultLogoUrl = getSeoLogoUrl();

  const store = await getStoreById(id);
  const storeLabel = locale === 'es' ? 'Tienda' : 'Store';
  const title = store ? store.name : storeLabel;
  const description = store?.description?.trim()
    ? store.description.trim()
    : (store
        ? (locale === 'es'
          ? `Descubre los productos exclusivos de ${store.name}. ${dict.description}`
          : `Discover exclusive products from ${store.name}. ${dict.description}`)
        : (locale === 'es' ? `Explora nuestra tienda. ${dict.description}` : `Explore our store. ${dict.description}`));

  const seoImageUrls: string[] = [];
  if (store?.logo) {
    const logoAbsolute = toAbsoluteImageUrl(store.logo, baseUrl);
    if (logoAbsolute) seoImageUrls.push(logoAbsolute);
  }
  if (seoImageUrls.length === 0) {
    seoImageUrls.push(defaultLogoUrl);
  }

  const ogImages = seoImageUrls.map((url) => ({
    url,
    width: 1200,
    height: 630,
    alt: store ? store.name : storeLabel,
    secureUrl: url,
  }));

  const storeUrlSlug = (store?.store_id && store.store_id.trim()) ? store.store_id : id;

  return {
    title: { absolute: title },
    description,
    keywords: store ? `${store.name}, ${getSeoKeywords(dict)}` : getSeoKeywords(dict),
    authors: [{ name: siteName }],
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${storeUrlSlug}`,
      languages: { es: `/${storeUrlSlug}`, en: `/${storeUrlSlug}`, 'x-default': `/${storeUrlSlug}` },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
      url: `${baseUrl}/${storeUrlSlug}`,
      siteName,
      title: store ? store.name : storeLabel,
      description,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: store ? store.name : storeLabel,
      description,
      images: seoImageUrls,
      creator: '@atelierpoz',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (RESERVED_SEGMENTS.includes(id)) {
    notFound();
  }
  const dict = getDictionary(await getLocaleFromRequest());
  const store = await getStoreById(id);

  if (!store) {
    notFound();
  }

  let initialProducts: Product[] = [];
  try {
    const result = await getStoreProducts(store.id, 20, 0);
    initialProducts = result.products;
  } catch (error) {
    console.error('Error obteniendo productos de la tienda:', error);
  }

  const storeSlug = store.store_id ?? id;

  return (
    <div className="overflow-x-hidden">
      <StoreViewTracker
        storeId={store.id}
        storeName={store.name}
        storeSlug={storeSlug}
        products={initialProducts}
      />
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
        <StorePageHeader
          name={store.name}
          logo={store.logo}
          description={store.description ?? dict.storeWelcome.replace('{{storeName}}', store.name)}
          location={store.location ?? undefined}
          instagram={store.instagram}
          tiktok={store.tiktok}
        />
        <ProductSearch storeId={store.id} storeName={store.name} dict={dict} initialProducts={initialProducts} />
        <ScrollToTop />
      </div>
    </div>
  );
}
