'use client';

import { X, Filter, ChevronDown } from 'lucide-react';
import { type Dictionary } from '@/lib/i18n/dictionary';

interface ProductFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  dict: Dictionary;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ProductFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  dict,
  onClearFilters,
  hasActiveFilters,
}: ProductFiltersProps) {
  const getCategoryLabel = (category: string): string => {
    const categoryMap: Record<string, { es: string; en: string }> = {
      rings: { es: 'Anillos', en: 'Rings' },
      necklaces: { es: 'Collares', en: 'Necklaces' },
      bracelets: { es: 'Pulseras', en: 'Bracelets' },
      earrings: { es: 'Aretes', en: 'Earrings' },
      watches: { es: 'Relojes', en: 'Watches' },
    };
    
    const isSpanish = dict.search.placeholder.includes('Buscar');
    const label = categoryMap[category]?.[isSpanish ? 'es' : 'en'] || category;
    return label;
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onCategoryChange(value === '' ? null : value);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-neutral-400" />
        <label htmlFor="category-filter" className="text-xs font-light text-neutral-400">
          {dict.filters?.category || 'Categoría'}:
        </label>
      </div>
      <div className="relative flex-1 max-w-xs">
        <select
          id="category-filter"
          value={selectedCategory || ''}
          onChange={handleSelectChange}
          className="w-full px-3 py-1.5 pr-8 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-xs font-light focus:outline-none focus:border-primary-500 transition-colors appearance-none cursor-pointer"
        >
          <option value="">{dict.filters?.all || 'Todos'}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {getCategoryLabel(category)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
      </div>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 text-xs font-light text-neutral-400 hover:text-neutral-200 transition-colors"
          title={dict.filters?.clear || 'Limpiar filtros'}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
