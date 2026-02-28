import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';
import { ProductSearch } from '@/components/products/ProductSearch';
import { StorePageHeader } from '@/components/stores/StorePageHeader';
import { CategoryViewTracker } from '@/components/analytics/CategoryViewTracker';
import { getStoreProducts } from '@/lib/services/products';
import { getStoreById } from '@/lib/services/stores';
import { getCategoriesByStore } from '@/lib/services/categories';
import { type Product } from '@/types/product';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getSeoLogoUrl, getOgLocale, getSeoKeywords } from '@/lib/utils/seo';

export const dynamic = 'force-dynamic';

/** Rutas reservadas: no son tiendas */
const RESERVED_SEGMENTS = ['cart', 'admin', 'products'];

function toAbsoluteImageUrl(url: string | undefined, baseUrl: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  if (url.startsWith('http')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { id, categorySlug } = await params;
  if (RESERVED_SEGMENTS.includes(id)) {
    return { title: 'Not Found' };
  }
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const siteName = dict.title;
  const defaultLogoUrl = getSeoLogoUrl();

  const store = await getStoreById(id);
  if (!store) return { title: 'Not Found' };

  const slugDecoded = decodeURIComponent(categorySlug || '');
  const categories = await getCategoriesByStore(store.id);
  const category = categories.find((c) => c.slug === slugDecoded);
  const categoryName = category?.name ?? slugDecoded;

  const title = `${categoryName} – ${store.name}`;
  const exploreText = locale === 'es' ? `Explora ${categoryName} en ${store.name}.` : `Explore ${categoryName} at ${store.name}.`;
  const description = store?.description?.trim()
    ? store.description.trim()
    : `${exploreText} ${dict.description}`;

  const seoImageUrls: string[] = [];
  if (store?.logo) {
    const logoAbsolute = toAbsoluteImageUrl(store.logo, baseUrl);
    if (logoAbsolute) seoImageUrls.push(logoAbsolute);
  }
  if (seoImageUrls.length === 0) {
    seoImageUrls.push(defaultLogoUrl);
  }

  const storeUrlSlug = (store?.store_id && store.store_id.trim()) ? store.store_id : id;
  const canonicalPath = `/${storeUrlSlug}/category/${categorySlug}`;

  return {
    title: { absolute: title },
    description,
    keywords: `${store.name}, ${categoryName}, ${getSeoKeywords(dict)}`,
    authors: [{ name: siteName }],
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalPath,
      languages: { es: canonicalPath, en: canonicalPath, 'x-default': canonicalPath },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
      url: `${baseUrl}${canonicalPath}`,
      siteName,
      title,
      description,
      images: seoImageUrls.map((url) => ({ url, width: 1200, height: 630, alt: title, secureUrl: url })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: seoImageUrls,
      creator: '@atelierpoz',
    },
    robots: { index: true, follow: true },
  };
}

export default async function StoreCategoryPage({
  params,
}: {
  params: Promise<{ id: string; categorySlug: string }>;
}) {
  const { id, categorySlug } = await params;
  if (RESERVED_SEGMENTS.includes(id)) {
    notFound();
  }
  const dict = getDictionary(await getLocaleFromRequest());
  const store = await getStoreById(id);

  if (!store) {
    notFound();
  }

  const slugDecoded = decodeURIComponent(categorySlug || '');
  const categories = await getCategoriesByStore(store.id);
  const category = categories.find((c) => c.slug === slugDecoded);
  if (!category) {
    notFound();
  }

  let initialProducts: Product[] = [];
  try {
    const result = await getStoreProducts(store.id, 20, 0, undefined, { categoryId: category.id });
    initialProducts = result.products;
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
  }

  return (
    <div className="overflow-x-hidden">
      <CategoryViewTracker
        storeId={store.id}
        storeName={store.name}
        categoryName={category.name}
        categorySlug={slugDecoded}
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
        <ProductSearch
          storeId={store.id}
          storeName={store.name}
          dict={dict}
          initialProducts={initialProducts}
          initialCategorySlug={slugDecoded}
        />
        <ScrollToTop />
      </div>
    </div>
  );
}
