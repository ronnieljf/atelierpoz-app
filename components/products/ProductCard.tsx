'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { ShoppingBag, Check, ImageOff } from 'lucide-react';
import { type Product } from '@/types/product';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { cn } from '@/lib/utils/cn';
import { useCart } from '@/lib/store/cart-store';
import { AddToCartDialog } from './AddToCartDialog';

interface ProductCardProps {
  product: Product;
  dict: Dictionary;
  priority?: boolean; // Para las primeras imágenes, mejorar LCP
}

export function ProductCard({ product, dict, priority = false }: ProductCardProps) {
  const { addItem } = useCart();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [addedToCart, setAddedToCart] = useState(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  
  // Verificar stock: si tiene variantes, verificar stock de la variante única
  const isInStock = (() => {
    if (!product.attributes || product.attributes.length === 0) {
      return product.stock > 0;
    }
    
    // Si tiene solo un atributo con una sola variante, verificar su stock
    if (product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      const variant = product.attributes[0].variants[0];
      // Si la variante tiene stock definido, usar ese; si no, usar el stock del producto base
      const variantStock = variant.stock ?? product.stock;
      return variantStock > 0;
    }
    
    // Si tiene múltiples variantes, usar el stock del producto base
    return product.stock > 0;
  })();
  
  const hasImage = product.images && product.images.length > 0 && product.images[0];
  const mainImage = hasImage ? product.images[0] : '';
  
  // Construir URL de regreso con los parámetros actuales
  const getReturnUrl = () => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page) params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };
  
  const returnUrl = getReturnUrl();
  
  // Verificar si el producto puede agregarse directamente al carrito
  // (sin variantes o solo una variante)
  const canAddDirectly = (() => {
    // Si no tiene atributos, puede agregarse directamente
    if (!product.attributes || product.attributes.length === 0) {
      return true;
    }
    
    // Si tiene solo un atributo con una sola variante, puede agregarse directamente
    if (product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      return true;
    }
    
    return false;
  })();
  
  // Obtener la variante única si existe
  const getSingleVariant = () => {
    if (!product.attributes || product.attributes.length === 0) {
      return [];
    }
    
    if (product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      const attr = product.attributes[0];
      const variant = attr.variants[0];
      return [{
        attributeId: attr.id,
        attributeName: attr.name,
        variantId: variant.id,
        variantName: variant.name || '',
        variantValue: variant.value || '',
        priceModifier: variant.price,
      }];
    }
    
    return [];
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isInStock || !canAddDirectly) return;
    
    // Verificar stock de la variante única si existe
    const singleVariant = getSingleVariant();
    if (singleVariant.length > 0) {
      const attr = product.attributes![0];
      const variant = attr.variants[0];
      const variantStock = variant.stock ?? product.stock;
      if (variantStock <= 0) {
        return; // No agregar si la variante no tiene stock
      }
    }
    
    const selectedVariants = getSingleVariant();
    addItem(product, 1, selectedVariants);
    setAddedToCart(true);
    setShowCartDialog(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };
  
  // Generar un placeholder blur más simple y rápido
  const blurDataURL = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYxZjFmIi8+PC9zdmc+";
  
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border-0 sm:border border-neutral-700/50 shadow-none sm:shadow-xl sm:hover:shadow-2xl transition-all duration-500 sm:hover:-translate-y-2">
      {/* Imagen con overlay — móvil: cuadrado, desktop: 4/5 */}
      <Link 
        href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`}
        prefetch={true}
        className="relative aspect-square sm:aspect-[4/5] overflow-hidden"
      >
        {/* Gradiente overlay superior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Gradiente overlay inferior para badges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent z-10" />
        
        {hasImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 sm:duration-700 group-hover:scale-105 sm:group-hover:scale-110 active:scale-95"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            unoptimized={mainImage.startsWith('data:') || mainImage.startsWith('blob:')}
            placeholder="blur"
            blurDataURL={blurDataURL}
            quality={85}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
            <ImageOff className="h-12 w-12 sm:h-20 sm:w-20 text-neutral-500" />
          </div>
        )}
        
        {/* Badge agotado */}
        {!isInStock && (
          <div className="absolute top-1 right-1 sm:top-4 sm:right-4 z-20">
            <span className="text-[10px] sm:text-sm font-medium text-white drop-shadow-lg">
              {dict.product.outOfStock}
            </span>
          </div>
        )}
      </Link>
      
      {/* Información del producto: nombre, precio, botón (siempre visible) */}
      <div className="p-2 sm:p-4 flex flex-1 flex-col space-y-1.5 sm:space-y-3 bg-gradient-to-b from-transparent to-neutral-900/50">
        {/* Nombre del producto */}
        <Link href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`} prefetch={true}>
          <h3 className="line-clamp-2 text-xs sm:text-base font-semibold text-neutral-100 transition-colors hover:text-primary-400 group-hover:text-primary-300 leading-tight">
            {product.name}
          </h3>
        </Link>
        
        {/* Precio (o consultar) y stock */}
        <div className="flex items-center justify-between gap-2">
          {product.hidePrice === true ? (
            <span className="text-sm sm:text-base font-medium text-neutral-400 italic">
              Precio a convenir
            </span>
          ) : (
            <span className="text-sm sm:text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100">
              ${product.basePrice.toFixed(2)}
            </span>
          )}
          {!isInStock && (
            <span className="text-[10px] sm:text-xs font-medium text-amber-400 shrink-0">
              {dict.product.outOfStock}
            </span>
          )}
        </div>
        
        {/* Botón: agregar al carrito o ver detalle */}
        {canAddDirectly ? (
          <button
            onClick={handleAddToCart}
            className={cn(
              "w-full rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 font-semibold text-[11px] sm:text-sm transition-all duration-300",
              "flex items-center justify-center gap-1 sm:gap-2",
              addedToCart
                ? "bg-green-600 text-white"
                : "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-500 hover:to-primary-600",
              "shadow-lg hover:shadow-xl",
              "border border-primary-400/30",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              (!isInStock || addedToCart) && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isInStock || addedToCart}
          >
            {addedToCart ? (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span>{dict.product.addedToCart || "¡Agregado!"}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span>{dict.product.addToCart || "Agregar al Carrito"}</span>
              </>
            )}
          </button>
        ) : (
          <Link href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`} prefetch={true} className="mt-auto">
            <button
              className={cn(
                "w-full rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 font-semibold text-[11px] sm:text-sm transition-all duration-300",
                "flex items-center justify-center gap-1 sm:gap-2",
                "bg-gradient-to-r from-primary-600 to-primary-700 text-white",
                "hover:from-primary-500 hover:to-primary-600",
                "shadow-lg hover:shadow-xl",
                "border border-primary-400/30",
                "transform hover:scale-[1.02] active:scale-[0.98]",
                !isInStock && "opacity-50 cursor-not-allowed"
              )}
              disabled={!isInStock}
            >
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span>{dict.product.viewDetails || "Ver Detalles"}</span>
            </button>
          </Link>
        )}
      </div>
      
      {/* Efecto de brillo en hover */}
      <div className="absolute inset-0 rounded-none sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-primary-500/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
      
      {/* Diálogo para ir al carrito - Fuera del contenedor del producto */}
      <AddToCartDialog 
        isOpen={showCartDialog} 
        onClose={() => setShowCartDialog(false)} 
      />
    </div>
  );
}
