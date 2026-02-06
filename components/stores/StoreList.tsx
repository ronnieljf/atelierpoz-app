'use client';

import { Store } from '@/lib/services/stores';
import { StoreCard } from './StoreCard';
import { PackageSearch } from 'lucide-react';

interface StoreListProps {
  stores: Store[];
}

export function StoreList({ stores }: StoreListProps) {
  // Debug: Log para verificar cuántas stores se reciben
  if (typeof window !== 'undefined') {
    console.log(`[StoreList] Renderizando ${stores.length} tiendas`);
  }
  
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <PackageSearch className="mb-6 h-12 w-12 text-neutral-700" />
        <h3 className="mb-2 text-sm font-light text-neutral-400">
          No hay tiendas disponibles
        </h3>
        <p className="text-xs font-light text-neutral-500">
          Por el momento no hay tiendas activas
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stores.map((store, index) => {
        // Debug: Log cada store que se renderiza
        if (typeof window !== 'undefined') {
          console.log(`[StoreList] Renderizando store ${index + 1}/${stores.length}:`, store.name, store.id);
        }
        return (
          <StoreCard key={store.id} store={store} />
        );
      })}
    </div>
  );
}
