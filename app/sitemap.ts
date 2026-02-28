import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/utils/seo';
import { getAllStores } from '@/lib/services/stores';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/landing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/terms-of-service`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/terminos-y-condiciones`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/politica-de-privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ];

  let storePages: MetadataRoute.Sitemap = [];
  try {
    const stores = await getAllStores();
    storePages = stores.map((store) => {
      const slug = (store.store_id && store.store_id.trim()) ? store.store_id : store.id;
      return {
        url: `${baseUrl}/${slug}`,
        lastModified: new Date(store.updated_at),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      };
    });
  } catch (error) {
    console.error('Error fetching stores for sitemap:', error);
  }

  return [...staticPages, ...storePages];
}
