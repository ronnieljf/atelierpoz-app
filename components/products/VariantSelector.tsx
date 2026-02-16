'use client';

import { type ProductAttribute } from '@/types/product';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { cn } from '@/lib/utils/cn';

interface VariantSelectorProps {
  attribute: ProductAttribute;
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  dict: Dictionary;
  /** Si true, el stock está en combinaciones; no deshabilitar opciones por variant.stock (que será 0). */
  hasCombinationStock?: boolean;
}

export function VariantSelector({
  attribute,
  selectedVariantId,
  onSelect,
  dict,
  hasCombinationStock = false,
}: VariantSelectorProps) {
  const isColor = attribute.type === 'color';
  const isSize = attribute.type === 'size';
  
  return (
    <div className="mb-4 bg-neutral-900/30 rounded-xl p-4 border border-neutral-700">
      <label className="mb-3 block text-base font-medium text-neutral-200">
        {attribute.name}
        {attribute.required && (
          <span className="ml-2 text-primary-400 text-sm">* {dict.product.required}</span>
        )}
      </label>
      
      <div className={cn(
        'flex flex-wrap gap-2',
        isColor && 'gap-3'
      )}>
        {attribute.variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;
          const isOutOfStock = !hasCombinationStock && (variant.stock === 0);
          
          if (isColor) {
            return (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock && onSelect(variant.id)}
                disabled={isOutOfStock}
                className={cn(
                  'relative h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 transition-all duration-200',
                  isSelected
                    ? 'border-primary-600 ring-2 ring-primary-400 ring-offset-2 shadow-lg scale-110'
                    : 'border-neutral-600 hover:border-primary-500/50 hover:scale-105',
                  isOutOfStock && 'opacity-50 cursor-not-allowed'
                )}
                style={{ backgroundColor: variant.value }}
                title={variant.name}
              >
                {isOutOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-px w-full rotate-45 bg-neutral-400"></span>
                  </span>
                )}
              </button>
            );
          }
          
          if (isSize) {
            return (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock && onSelect(variant.id)}
                disabled={isOutOfStock}
                className={cn(
                  'min-w-[3rem] rounded-xl border-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'border-primary-600 bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg scale-105'
                    : 'border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-primary-500/50 hover:bg-neutral-700/50',
                  isOutOfStock && 'opacity-50 cursor-not-allowed line-through'
                )}
              >
                {variant.name || variant.value}
              </button>
            );
          }
          
          // Default: text/select variant — mostrar nombre de la variante para evitar que se vea "Nombre0" cuando Valor es "0"
          return (
            <button
              key={variant.id}
              onClick={() => !isOutOfStock && onSelect(variant.id)}
              disabled={isOutOfStock}
              className={cn(
                'rounded-xl border-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'border-primary-600 bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg scale-105'
                    : 'border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-primary-500/50 hover:bg-neutral-700/50',
                isOutOfStock && 'opacity-50 cursor-not-allowed'
              )}
            >
              {variant.name || variant.value}
              {variant.price != null && variant.price > 0 ? (
                <span className="ml-2 text-xs">
                  (+${variant.price.toFixed(2)})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      
      {selectedVariantId && (
        <p className="mt-2 text-xs font-light text-neutral-400">
          {dict.product.selectVariant}: {
            attribute.variants.find(v => v.id === selectedVariantId)?.name
          }
        </p>
      )}
    </div>
  );
}
