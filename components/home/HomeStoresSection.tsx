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
        <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-800/80 bg-neutral-900/30 py-24 px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-800/80">
            <StoreIcon className="h-10 w-10 text-neutral-500" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-neutral-300">No hay tiendas disponibles</h3>
          <p className="max-w-sm text-sm font-light text-neutral-500">
            Pronto podrás explorar nuestras tiendas y sus productos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-14 md:py-20">
      <div className="mb-10 sm:mb-14 md:mb-16 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary-400/90">
          Explora
        </p>
        <h2 className="mb-3 text-3xl font-light tracking-tight text-neutral-50 sm:text-4xl md:text-5xl">
          {heading}
        </h2>
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-neutral-600 to-transparent" />
        <p className="mx-auto mt-4 max-w-lg text-sm font-light text-neutral-400 sm:text-base">
          {subheading}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:gap-10">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </section>
  );
}
