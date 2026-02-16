'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { ShoppingBag, Check, ImageOff } from 'lucide-react';
import { type CartItem, type Product } from '@/types/product';
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
  
  // Verificar stock: combinaciones tienen el stock; si no hay combinaciones, variante o producto base
  const isInStock = (() => {
    if (!product.attributes || product.attributes.length === 0) {
      return product.stock > 0;
    }
    const hasCombinations = product.combinations && product.combinations.length > 0;
    if (hasCombinations && product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      const variantId = product.attributes[0].variants[0].id;
      const attrId = product.attributes[0].id;
      const combo = product.combinations?.find(
        (c) => c.selections && (c.selections as Record<string, string>)[attrId] === variantId
      );
      const comboStock = combo && typeof combo.stock === 'number' ? combo.stock : (combo ? parseInt(String(combo.stock ?? 0), 10) : 0);
      return !Number.isNaN(comboStock) && comboStock > 0;
    }
    if (product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      const variant = product.attributes[0].variants[0];
      const variantStock = variant.stock ?? product.stock;
      return variantStock > 0;
    }
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
  
  // Obtener la variante única con priceModifier de la combinación si existe
  const getSingleVariant = (): CartItem['selectedVariants'] => {
    if (!product.attributes || product.attributes.length === 0) {
      return [];
    }
    if (product.attributes.length === 1 && product.attributes[0].variants.length === 1) {
      const attr = product.attributes[0];
      const variant = attr.variants[0];
      let priceModifier: number | undefined;
      if (product.combinations && product.combinations.length > 0) {
        const combo = product.combinations.find(
          (c) => c.selections && (c.selections as Record<string, string>)[attr.id] === variant.id
        );
        priceModifier = combo != null && typeof (combo as { priceModifier?: number }).priceModifier === 'number'
          ? (combo as { priceModifier: number }).priceModifier
          : 0;
      } else {
        priceModifier = variant.price ?? 0;
      }
      return [{
        attributeId: attr.id,
        attributeName: attr.name,
        variantId: variant.id,
        variantName: variant.name || '',
        variantValue: variant.value || '',
        priceModifier,
      }];
    }
    return [];
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isInStock || !canAddDirectly) return;
    
    // Verificar stock de la variante única si existe (combinación o variante)
    const singleVariant = getSingleVariant();
    if (singleVariant.length > 0) {
      const hasCombos = product.combinations && product.combinations.length > 0;
      if (hasCombos) {
        const attr = product.attributes![0];
        const variantId = attr.variants[0].id;
        const combo = product.combinations!.find(
          (c) => c.selections && (c.selections as Record<string, string>)[attr.id] === variantId
        );
        const comboStock = combo && typeof combo.stock === 'number' ? combo.stock : (combo ? parseInt(String(combo.stock ?? 0), 10) : 0);
        if (Number.isNaN(comboStock) || comboStock <= 0) return;
      } else {
        const variant = product.attributes![0].variants[0];
        const variantStock = variant.stock ?? product.stock;
        if (variantStock <= 0) return;
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
    <div className="group relative flex flex-col overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-neutral-900/90 via-neutral-800/90 to-neutral-900/90 border-0 sm:border border-neutral-700/30 shadow-none sm:shadow-xl sm:hover:shadow-2xl sm:hover:shadow-primary-900/20 transition-all duration-700 sm:hover:-translate-y-3 backdrop-blur-sm hover:backdrop-blur-lg">
      {/* Borde brillante animado en hover */}
      <div className="absolute inset-0 rounded-none sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-600/20 via-primary-500/30 to-primary-600/20 blur-sm" />
      </div>
      
      {/* Imagen con overlay — móvil: cuadrado, desktop: 4/5 */}
      <Link 
        href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`}
        prefetch={true}
        className="relative aspect-square sm:aspect-[4/5] overflow-hidden"
      >
        {/* Gradiente overlay superior mejorado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Gradiente overlay inferior para badges mejorado */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10" />
        
        {/* Efecto de resplandor en esquinas */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-600/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10" />
        
        {hasImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 sm:duration-700 group-hover:scale-105 sm:group-hover:scale-110 active:scale-95"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            unoptimized={mainImage.startsWith('data:') || mainImage.startsWith('blob:') || mainImage.startsWith('http')}
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
      <div className="p-2 sm:p-5 flex flex-1 flex-col space-y-1.5 sm:space-y-3 bg-gradient-to-b from-transparent via-neutral-900/60 to-neutral-900/80 backdrop-blur-sm relative">
        {/* Línea decorativa superior */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-600/30 to-transparent" />
        
        {/* Nombre del producto */}
        <Link href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`} prefetch={true}>
          <h3 className="line-clamp-2 text-xs sm:text-base font-semibold text-neutral-100 transition-all duration-300 hover:text-primary-300 group-hover:text-primary-300 group-hover:drop-shadow-lg leading-tight">
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
            <span className="text-sm sm:text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 drop-shadow-lg animate-gradient">
              ${product.basePrice.toFixed(2)}
            </span>
          )}
          {!isInStock && (
            <span className="text-[10px] sm:text-xs font-medium text-amber-400 shrink-0 px-2 py-1 bg-amber-900/20 rounded-full border border-amber-700/30">
              {dict.product.outOfStock}
            </span>
          )}
        </div>
        
        {/* Botón: agregar al carrito o ver detalle */}
        {canAddDirectly ? (
          <button
            onClick={handleAddToCart}
            className={cn(
              "w-full rounded-xl sm:rounded-2xl px-2 sm:px-4 py-2 sm:py-3 font-semibold text-[11px] sm:text-sm transition-all duration-300 relative overflow-hidden group/button",
              "flex items-center justify-center gap-1 sm:gap-2",
              addedToCart
                ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-900/50"
                : "bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 text-white hover:from-primary-500 hover:via-primary-500 hover:to-primary-600",
              "shadow-lg hover:shadow-2xl hover:shadow-primary-900/30",
              "border border-primary-400/40 hover:border-primary-300/50",
              "transform hover:scale-[1.03] active:scale-[0.97]",
              (!isInStock || addedToCart) && "opacity-50 cursor-not-allowed"
            )}
            disabled={!isInStock || addedToCart}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
            {addedToCart ? (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 relative z-10" />
                <span className="relative z-10">{dict.product.addedToCart || "¡Agregado!"}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 relative z-10" />
                <span className="relative z-10">{dict.product.addToCart || "Agregar al Carrito"}</span>
              </>
            )}
          </button>
        ) : (
          <Link href={`/products/${product.id}?return=${encodeURIComponent(returnUrl)}`} prefetch={true} className="mt-auto">
            <button
              className={cn(
                "w-full rounded-xl sm:rounded-2xl px-2 sm:px-4 py-2 sm:py-3 font-semibold text-[11px] sm:text-sm transition-all duration-300 relative overflow-hidden group/button",
                "flex items-center justify-center gap-1 sm:gap-2",
                "bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 text-white",
                "hover:from-primary-500 hover:via-primary-500 hover:to-primary-600",
                "shadow-lg hover:shadow-2xl hover:shadow-primary-900/30",
                "border border-primary-400/40 hover:border-primary-300/50",
                "transform hover:scale-[1.03] active:scale-[0.97]",
                !isInStock && "opacity-50 cursor-not-allowed"
              )}
              disabled={!isInStock}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 relative z-10" />
              <span className="relative z-10">{dict.product.viewDetails || "Ver Detalles"}</span>
            </button>
          </Link>
        )}
      </div>
      
      {/* Efecto de brillo en hover mejorado */}
      <div className="absolute inset-0 rounded-none sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-primary-500/15 to-transparent transform rotate-12 translate-x-[-100%] translate-y-[-100%] group-hover:translate-x-[100%] group-hover:translate-y-[100%] transition-transform duration-1500 ease-out" />
      </div>
      
      {/* Diálogo para ir al carrito - Fuera del contenedor del producto */}
      <AddToCartDialog 
        isOpen={showCartDialog} 
        onClose={() => setShowCartDialog(false)} 
      />
    </div>
  );
}
