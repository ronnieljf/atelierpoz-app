'use client';

import { Store } from '@/lib/services/stores';
import { StoreCard } from '@/components/stores/StoreCard';
import { Store as StoreIcon } from 'lucide-react';

interface HomeStoresSectionProps {
  stores: Store[];
  heading?: string;
  subheading?: string;
}

export function HomeStoresSection({
  stores,
  heading = 'Nuestras tiendas',
  subheading = 'Elige una tienda y descubre sus productos.',
}: HomeStoresSectionProps) {
  if (stores.length === 0) {
    return (
      <section className="py-12 md:py-20">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800/60 bg-neutral-900/40 py-20 px-6 text-center">
            <StoreIcon className="mb-4 h-10 w-10 text-neutral-600" />
            <h3 className="text-base font-medium text-neutral-300">No hay tiendas disponibles</h3>
            <p className="mt-1 max-w-sm text-sm font-light text-neutral-500">
              Pronto podrás explorar nuestras tiendas y sus productos.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 sm:mb-12 text-center">
          <h2 className="text-2xl font-light tracking-tight text-white sm:text-3xl md:text-4xl">
            {heading}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm font-light text-neutral-400 sm:text-base">
            {subheading}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  );
}
