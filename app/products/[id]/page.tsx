import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getLocaleFromRequest } from '@/lib/i18n/server';
import { ProductDetail } from '@/components/products/ProductDetail';
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker';
import { getProductByIdPublic } from '@/lib/services/products';
import Link from 'next/link';
import { getSeoLogoUrl, getOgLocale, getSeoKeywords } from '@/lib/utils/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);
  const product = await getProductByIdPublic(id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const siteName = dict.title;

  if (!product) {
    return {
      title: dict.search.noResults,
    };
  }

  // Solo productos: OG usa imagen del producto. Logo solo como fallback si no hay imagen válida.
  const logoUrl = getSeoLogoUrl();
  let productImage = product.images?.[0] || logoUrl;
  if (productImage && !productImage.startsWith('http')) {
    if (productImage.startsWith('data:')) {
      productImage = logoUrl;
    } else {
      productImage = productImage.startsWith('/')
        ? `${baseUrl}${productImage}`
        : `${baseUrl}/${productImage}`;
    }
  }
  
  const price = `$${product.basePrice.toFixed(2)}`;
  const categoryMap: Record<string, Record<string, string>> = {
    rings: { es: 'Anillos', en: 'Rings' },
    necklaces: { es: 'Collares', en: 'Necklaces' },
    bracelets: { es: 'Pulseras', en: 'Bracelets' },
    earrings: { es: 'Aretes', en: 'Earrings' },
    watches: { es: 'Relojes', en: 'Watches' },
  };
  const category = categoryMap[product.category]?.[locale] || product.category;

  const title = `${product.name} | ${siteName}`;
  const descSuffix = locale === 'es'
    ? `de alta calidad. ${price}. Envío disponible. Compra ahora en ${siteName}.`
    : `high quality. ${price}. Shipping available. Buy now at ${siteName}.`;
  const description = product.description || `${product.name} - ${category} ${descSuffix}`;

  const keywordParts = locale === 'es'
    ? ['productos', 'comprar online']
    : ['products', 'buy online'];

  return {
    title,
    description,
    keywords: [
      product.name,
      category,
      ...keywordParts,
      product.sku,
      siteName,
      getSeoKeywords(dict),
      ...(product.tags || []),
    ].join(', '),
    authors: [{ name: siteName }],
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/products/${id}`,
      languages: { es: `/products/${id}`, en: `/products/${id}`, 'x-default': `/products/${id}` },
    },
    openGraph: {
      type: 'website',
      locale: getOgLocale(locale),
      url: `${baseUrl}/products/${id}`,
      siteName,
      title: product.name,
      description,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 1200,
          alt: `${product.name} - ${category} | ${siteName}`,
          secureUrl: productImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [productImage],
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
    other: {
      'product:price:amount': product.basePrice.toString(),
      'product:price:currency': product.currency || 'USD',
      'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
      'product:category': category,
      'product:brand': siteName,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { id } = await params;
  const { return: returnUrl } = await searchParams;
  const locale = await getLocaleFromRequest();
  const dict = getDictionary(locale);

  // Obtener producto del backend
  const product = await getProductByIdPublic(id);

  if (!product) {
    notFound();
  }

  // URL de regreso: usar el parámetro return si existe, sino ir al inicio
  const backUrl = returnUrl ? decodeURIComponent(returnUrl) : '/';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://atelierpoz.com';
  const logoUrl = getSeoLogoUrl();
  let productImage = product.images?.[0] || logoUrl;
  if (productImage && !productImage.startsWith('http')) {
    if (productImage.startsWith('data:')) {
      productImage = logoUrl;
    } else {
      productImage = productImage.startsWith('/')
        ? `${baseUrl}${productImage}`
        : `${baseUrl}/${productImage}`;
    }
  }

  const categoryMap: Record<string, Record<string, string>> = {
    rings: { es: 'Anillos', en: 'Rings' },
    necklaces: { es: 'Collares', en: 'Necklaces' },
    bracelets: { es: 'Pulseras', en: 'Bracelets' },
    earrings: { es: 'Aretes', en: 'Earrings' },
    watches: { es: 'Relojes', en: 'Watches' },
  };
  const category = categoryMap[product.category]?.[locale] || product.category;
  const descSuffix = locale === 'es' ? 'de alta calidad' : 'high quality';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - ${category} ${descSuffix}`,
    inLanguage: locale,
    image: product.images?.map(img => {
      if (!img) return logoUrl;
      if (img.startsWith('data:')) return logoUrl;
      if (!img.startsWith('http')) {
        return img.startsWith('/') ? `${baseUrl}${img}` : `${baseUrl}/${img}`;
      }
      return img;
    }).filter(Boolean) || [productImage],
    brand: {
      '@type': 'Brand',
      name: dict.title,
    },
    category: category,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: product.currency || 'USD',
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${product.id}`,
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      },
    } : {}),
  };

  return (
    <>
      {/* Structured Data (JSON-LD) para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 md:py-14">
        <ProductViewTracker product={product} />
        <nav className="mb-4 sm:mb-6 text-xs sm:text-sm">
          <Link
            href={backUrl}
            className="text-neutral-400 hover:text-primary-400"
          >
            {dict.navigation.home}
          </Link>
          <span className="mx-2 text-neutral-500">/</span>
          <span className="text-neutral-100">{product.name}</span>
        </nav>

        <ProductDetail product={product} dict={dict} />

        {/* Botón de regresar */}
        {/* <div className="mt-8 sm:mt-12 flex justify-center">
          <Link
            href={backUrl}
            prefetch={true}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 hover:border-primary-500 hover:text-primary-300 transition-all duration-200 text-sm font-light"
          >
            <ArrowLeft className="h-4 w-4" />
            {dict.navigation.home}
          </Link>
        </div> */}
      </div>
    </>
  );
}
