'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Minus, Check, ShoppingCart, ImageOff, AlertCircle, Store, X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { type Product } from '@/types/product';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { useCart } from '@/lib/store/cart-store';
import { VariantSelector } from './VariantSelector';
import { type CartItem } from '@/types/product';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { AddToCartDialog } from './AddToCartDialog';

interface ProductDetailProps {
  product: Product;
  dict: Dictionary;
}

export function ProductDetail({ product, dict }: ProductDetailProps) {
  const { addItem } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // Inicializar con la primera opción de cada atributo
  const initialVariants = useMemo(() => {
    const variants: Record<string, string> = {};
    product.attributes.forEach((attribute) => {
      if (attribute.variants.length > 0) {
        // Seleccionar la primera variante disponible (con stock > 0 si es posible)
        const availableVariant = attribute.variants.find(v => v.stock > 0) || attribute.variants[0];
        variants[attribute.id] = availableVariant.id;
      }
    });
    return variants;
  }, [product.attributes]);
  
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(initialVariants);
  
  // Obtener imágenes basadas en combinación o variantes seleccionadas
  const displayImages = useMemo(() => {
    if (!product.attributes || product.attributes.length === 0) {
      return product.images || [];
    }
    // Si hay combinación con imágenes, usarlas primero
    const combo = (product.combinations || []).find((c) => {
      const keys = Object.keys(c.selections || {});
      return keys.length === Object.keys(selectedVariants).length
        && keys.every((attrId) => (c.selections as Record<string, string>)[attrId] === selectedVariants[attrId]);
    });
    if (combo?.images && Array.isArray(combo.images) && combo.images.length > 0) {
      return combo.images;
    }
    const variantImages: string[] = [];
    product.attributes.forEach((attribute) => {
      const variantId = selectedVariants[attribute.id];
      if (variantId) {
        const variant = attribute.variants.find((v) => v.id === variantId);
        if (variant?.images && Array.isArray(variant.images) && variant.images.length > 0) {
          variantImages.push(...variant.images);
        }
      }
    });
    if (variantImages.length > 0) return variantImages;
    return product.images || [];
  }, [product, selectedVariants]);
  
  // Resetear el índice de imagen cuando cambian las imágenes mostradas
  useEffect(() => {
    if (selectedImageIndex >= displayImages.length && displayImages.length > 0) {
      // Usar setTimeout para evitar setState síncrono en efecto
      setTimeout(() => setSelectedImageIndex(0), 0);
    }
  }, [displayImages.length, selectedImageIndex]);

  // Cerrar galería con Escape
  useEffect(() => {
    if (!showImageGallery) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowImageGallery(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showImageGallery]);

  // Swipe en móvil para cambiar de imagen en la galería
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const SWIPE_THRESHOLD = 50;
  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null || displayImages.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) {
      setSelectedImageIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1));
    } else {
      setSelectedImageIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1));
    }
    setTouchStartX(null);
  };

  // Precio base: soportar camelCase/snake_case y string (p. ej. API devuelve "99.99")
  const basePriceNumber = useMemo(() => {
    const raw = (product as { basePrice?: number; base_price?: number | string }).basePrice
      ?? (product as { base_price?: number | string }).base_price;
    if (raw == null || raw === '') return 0;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    return Number.isNaN(n) ? 0 : n;
  }, [product]);

  // Si hay combinaciones (ej. Color × Talla), buscar la que coincide con la selección actual
  const currentCombination = useMemo(() => {
    const combos = product.combinations;
    if (!combos || combos.length === 0) return null;
    const selected = { ...selectedVariants };
    return combos.find((c) => {
      const keys = Object.keys(c.selections || {});
      if (keys.length !== Object.keys(selected).length) return false;
      return keys.every((attrId) => (c.selections as Record<string, string>)[attrId] === selected[attrId]);
    }) ?? null;
  }, [product.combinations, selectedVariants]);

  // Precio adicional: por combinación (si existe) o por suma de variantes
  const variantPriceBreakdown = useMemo(() => {
    if (currentCombination != null && (currentCombination.priceModifier ?? 0) !== 0) {
      const p = typeof currentCombination.priceModifier === 'number' ? currentCombination.priceModifier : parseFloat(String(currentCombination.priceModifier ?? 0));
      if (!Number.isNaN(p) && p !== 0) {
        return [{ name: 'Combinación', price: p }];
      }
    }
    const items: { name: string; price: number }[] = [];
    (product.attributes || []).forEach((attr) => {
      const variantId = selectedVariants[attr.id];
      if (variantId) {
        const variant = attr.variants.find((v) => v.id === variantId);
        if (variant?.name) {
          const raw = variant.price;
          const p = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0));
          if (!Number.isNaN(p) && p > 0) {
            items.push({ name: variant.name, price: p });
          }
        }
      }
    });
    return items;
  }, [product, selectedVariants, currentCombination]);

  // Calcular precio total con variantes
  const totalPrice = useMemo(() => {
    let price = basePriceNumber;
    variantPriceBreakdown.forEach(({ price: p }) => { price += p; });
    return price;
  }, [basePriceNumber, variantPriceBreakdown]);
  
  // Verificar si todas las variantes requeridas están seleccionadas
  const canAddToCart = useMemo(() => {
    return product.attributes.every((attr) => {
      if (!attr.required) return true;
      return selectedVariants[attr.id] !== undefined;
    });
  }, [product.attributes, selectedVariants]);
  
  // Verificar stock disponible: por combinación (si existe) o por variantes
  const availableStock = useMemo(() => {
    if (product.attributes.length === 0) return product.stock;

    const allRequiredSelected = product.attributes
      .filter(attr => attr.required)
      .every(attr => selectedVariants[attr.id] !== undefined);
    if (!allRequiredSelected) return 0;

    // Si hay combinaciones y encontramos la que coincide, usar su stock
    if (currentCombination != null) {
      const stock = typeof currentCombination.stock === 'number' ? currentCombination.stock : parseInt(String(currentCombination.stock ?? 0), 10);
      return Number.isNaN(stock) ? 0 : stock;
    }

    const selectedVariantsList = product.attributes
      .map((attr) => {
        const variantId = selectedVariants[attr.id];
        if (!variantId) return null;
        return attr.variants.find((v) => v.id === variantId);
      })
      .filter(Boolean);
    if (selectedVariantsList.length === 0) return product.stock;

    const stocks = selectedVariantsList.map(v => v?.stock ?? product.stock);
    return Math.min(...stocks);
  }, [product, selectedVariants, currentCombination]);
  
  const handleVariantSelect = (attributeId: string, variantId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [attributeId]: variantId,
    }));
  };
  
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    if (!canAddToCart || availableStock < quantity) return;

    if (currentCombination != null) {
      const comboStock = typeof currentCombination.stock === 'number' ? currentCombination.stock : parseInt(String(currentCombination.stock ?? 0), 10);
      if (Number.isNaN(comboStock) || comboStock < quantity) return;
    } else {
      const allVariantsHaveStock = product.attributes
        .filter((attr) => selectedVariants[attr.id])
        .every((attr) => {
          const variantId = selectedVariants[attr.id];
          const variant = attr.variants.find((v) => v.id === variantId);
          const variantStock = variant?.stock ?? product.stock;
          return variantStock > 0;
        });
      if (!allVariantsHaveStock) return;
    }
    
    // Verificar que el stock disponible sea suficiente para la cantidad solicitada
    if (availableStock < quantity) {
      return;
    }
    
    const cartVariants: CartItem['selectedVariants'] = product.attributes
      .filter((attr) => selectedVariants[attr.id])
      .map((attr, idx) => {
        const variantId = selectedVariants[attr.id];
        const variant = attr.variants.find((v) => v.id === variantId);
        const priceModifier = currentCombination != null
          ? (idx === 0 ? (currentCombination.priceModifier ?? 0) : 0)
          : variant?.price;
        return {
          attributeId: attr.id,
          attributeName: attr.name,
          variantId: variantId,
          variantName: variant?.name || '',
          variantValue: variant?.value || '',
          priceModifier,
        };
      });

    addItem(product, quantity, cartVariants);
    setAddedToCart(true);
    setShowCartDialog(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };
  
  const hasImage = displayImages && displayImages.length > 0;
  const mainImage = hasImage ? (displayImages[selectedImageIndex] || displayImages[0]) : '';
  
  // Si el producto no está visible, mostrar solo el mensaje
  if (product.visibleInStore === false) {
    return (
      <div className="flex justify-center items-center min-h-[500px] py-12">
        <div className="relative max-w-lg w-full">
          {/* Fondo con gradiente y efecto de brillo */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-amber-800/5 to-transparent rounded-3xl blur-xl" />
          
          {/* Contenedor principal */}
          <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900/80 via-neutral-800/60 to-neutral-900/80 backdrop-blur-sm border border-amber-700/30 shadow-2xl overflow-hidden">
            {/* Efecto de brillo animado */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700" />
            
            {/* Contenido */}
            <div className="relative p-8 sm:p-10 text-center">
              {/* Icono con fondo circular */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/40 mb-6 shadow-lg">
                <AlertCircle className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
              </div>
              
              {/* Título */}
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200">
                Producto no disponible
              </h2>
              
              {/* Descripción */}
              <p className="text-base sm:text-lg font-light text-neutral-300/80 leading-relaxed max-w-md mx-auto">
                Este producto ya no está disponible en la tienda
              </p>
              
              {/* Línea decorativa */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/50" />
                <div className="h-1 w-1 rounded-full bg-amber-500/60" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
      {/* Imágenes */}
      <div className="space-y-4">
        <div
          role={hasImage ? 'button' : undefined}
          tabIndex={hasImage ? 0 : undefined}
          onClick={hasImage ? () => setShowImageGallery(true) : undefined}
          onKeyDown={hasImage ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowImageGallery(true); } } : undefined}
          className={cn(
            'relative aspect-square overflow-hidden rounded-3xl border-2 border-neutral-700/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 shadow-2xl group/image',
            hasImage && 'cursor-zoom-in'
          )}
        >
          {/* Gradiente overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-primary-800/20 opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 z-10" />
          {/* Hint para abrir galería */}
          {hasImage && (
            <div className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900/80 border border-neutral-600/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
              <Expand className="h-4 w-4 text-neutral-300" />
            </div>
          )}
          {/* Efecto de brillo */}
          <div className="absolute inset-0 opacity-0 group-hover/image:opacity-100 transition-opacity duration-700 pointer-events-none z-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover/image:translate-x-[200%] transition-transform duration-1000" />
          </div>
          
          {hasImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover/image:scale-110"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized={mainImage.startsWith('data:')}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
              <ImageOff className="h-24 w-24 sm:h-32 sm:w-32 text-neutral-500" />
            </div>
          )}
        </div>
        
        {displayImages.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
            {displayImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`
                  relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300 group/thumb
                  ${selectedImageIndex === index
                    ? 'border-primary-600 ring-2 ring-primary-400/50 shadow-xl scale-105'
                    : 'border-neutral-700 hover:border-primary-500/50 hover:scale-105'
                  }
                `}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-900/10 via-transparent to-primary-800/10 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300 z-10" />
                <Image
                  src={image}
                  alt={`${product.name} - ${index + 1}`}
                  fill
                  unoptimized={image.startsWith('data:')}
                  className="object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Información del producto */}
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-neutral-900/50 via-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 p-6 shadow-xl">
          <h1 className="mb-3 text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100">
            {product.name}
          </h1>
          {/* Nombre de la tienda */}
          {product.storeName && product.storeId && (
            <Link
              href={`/${(product.storeSlug && product.storeSlug.trim()) ? product.storeSlug : product.storeId}`}
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-700/50 hover:border-primary-500/50 transition-all duration-200 group"
            >
              <Store className="h-4 w-4 text-neutral-400 group-hover:text-primary-400 transition-colors" />
              <span className="text-sm font-medium text-neutral-300 group-hover:text-primary-400 transition-colors">
                {product.storeName}
              </span>
            </Link>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              {product.hidePrice === true ? (
                <span className="text-xl sm:text-2xl font-medium text-neutral-400 italic">
                  Precio a convenir
                </span>
              ) : (
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-primary-300">
                  {product.currency === 'USD' ? '$' : (product.currency || '') + ' '}
                  {(typeof totalPrice === 'number' && !Number.isNaN(totalPrice) ? totalPrice : basePriceNumber).toFixed(2)}
                </span>
              )}
              {product.rating && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-neutral-200">{product.rating.toFixed(1)}</span>
                {product.reviewCount && (
                  <span className="text-sm font-medium text-neutral-400">
                    ({product.reviewCount} {dict.product.reviews})
                  </span>
                )}
              </div>
            )}
            </div>
            {/* Desglose: precio base + variantes (solo si no está oculto el precio) */}
            {product.hidePrice !== true &&
              (basePriceNumber > 0 || variantPriceBreakdown.length > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
                {basePriceNumber > 0 && (
                  <span>Precio base: {product.currency === 'USD' ? '$' : ''}{basePriceNumber.toFixed(2)}</span>
                )}
                {variantPriceBreakdown.map(({ name, price }) => (
                  <span key={name}>
                    {name}: +{product.currency === 'USD' ? '$' : ''}{price.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Selectores de variantes */}
        {product.attributes.map((attribute) => (
          <div key={attribute.id}>
            <VariantSelector
              attribute={attribute}
              selectedVariantId={selectedVariants[attribute.id] || null}
              onSelect={(variantId) => handleVariantSelect(attribute.id, variantId)}
              dict={dict}
            />
            {attribute.required && !selectedVariants[attribute.id] && (
              <p className="mt-1 text-xs font-light text-primary-400">
                * {dict.product.required}
              </p>
            )}
          </div>
        ))}
        
        {/* Cantidad */}
        <div className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-700">
          <label className="mb-3 block text-base font-medium text-neutral-200">
            {dict.product.quantity}
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center rounded-xl border-2 border-neutral-600 bg-neutral-800 overflow-hidden w-full sm:w-auto">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="px-5 py-3 text-neutral-300 hover:bg-primary-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                aria-label={dict.cart.decreaseQuantity || "Disminuir"}
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="min-w-[4rem] px-6 py-3 text-center font-bold text-lg text-neutral-100 bg-neutral-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                disabled={quantity >= availableStock}
                className="px-5 py-3 text-neutral-300 hover:bg-primary-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                aria-label={dict.cart.increaseQuantity || "Aumentar"}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">
              {availableStock > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">✓</span>
                  <span className="text-sm font-medium text-green-400">
                    {availableStock} {dict.product.inStock.toLowerCase()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-lg">✗</span>
                  <span className="text-sm font-medium text-red-400">
                    {dict.product.outOfStock}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Botón de acción */}
        <div className="space-y-3">
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || availableStock < quantity}
            className={cn(
              "w-full rounded-2xl px-6 py-4 font-bold text-lg transition-all duration-300",
              "flex items-center justify-center gap-3",
              "shadow-2xl border-2 transform hover:scale-[1.02] active:scale-[0.98]",
              addedToCart
                ? "bg-gradient-to-r from-green-600 to-green-700 text-white border-green-400/30 hover:from-green-500 hover:to-green-600"
                : "bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-400/30 hover:from-primary-500 hover:to-primary-600",
              (!canAddToCart || availableStock < quantity) && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {addedToCart ? (
              <>
                <Check className="h-6 w-6" />
                <span>{dict.product.addedToCart || "¡Agregado!"}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-6 w-6" />
                <span>{dict.product.addToCart}</span>
              </>
            )}
          </button>
          {!canAddToCart && (
            <p className="text-center text-xs font-light text-primary-400">
              {dict.product.selectOption}
            </p>
          )}
          {availableStock < quantity && (
            <p className="text-center text-xs font-light text-red-400">
              {dict.product.outOfStock}
            </p>
          )}
        </div>
        
        {/* Descripción */}
        <div className="rounded-3xl bg-gradient-to-br from-neutral-900/50 via-neutral-800/50 to-neutral-900/50 border border-neutral-700/50 p-6 shadow-xl">
          <h2 className="mb-4 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 to-primary-300">
            {dict.product.description}
          </h2>
          <p className="font-medium text-neutral-300 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>
      
      {/* Diálogo para ir al carrito */}
      <AddToCartDialog 
        isOpen={showCartDialog} 
        onClose={() => setShowCartDialog(false)} 
      />

      {/* Galería de imágenes en modal: responsiva, safe-area, táctil en móvil */}
      <AnimatePresence>
        {showImageGallery && hasImage && displayImages.length > 0 && (
          <div
            className="fixed inset-0 z-[100] flex flex-col min-h-[100dvh]"
            role="dialog"
            aria-modal="true"
            aria-label="Galería de imágenes del producto"
            style={{
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Capa inferior: fondo oscuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-0 bg-neutral-950/90 pointer-events-auto"
              onClick={() => setShowImageGallery(false)}
            />
            {/* Capa superior: contenido de la galería */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 flex flex-1 flex-col min-h-0 p-2 sm:p-4 md:p-6 lg:p-8 pointer-events-auto"
            >
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Cerrar: zona táctil 44px en móvil */}
                <div className="flex justify-end mb-1 sm:mb-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowImageGallery(false)}
                    className="flex min-h-[44px] min-w-[44px] sm:min-h-12 sm:min-w-12 items-center justify-center rounded-xl bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/80 transition-colors touch-manipulation"
                    aria-label="Cerrar galería"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
                {/* Área de imagen: en móvil slider por swipe, sin flechas; en desktop con flechas */}
                <div className="relative flex-1 flex items-center justify-center min-h-[50vh] sm:min-h-[50vh] gap-0 sm:gap-3 md:gap-4">
                  {displayImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1)); }}
                      className="hidden sm:flex flex-shrink-0 min-h-12 min-w-12 items-center justify-center rounded-xl bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/80 transition-colors duration-200 touch-manipulation"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}
                  <div
                    className="flex-1 relative w-full min-h-[55vh] max-h-[78vh] sm:min-h-[45vh] sm:max-h-[70vh] md:min-h-[50vh] md:max-h-[75vh] flex items-center justify-center overflow-hidden touch-pan-y"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={handleGalleryTouchStart}
                    onTouchEnd={handleGalleryTouchEnd}
                  >
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={selectedImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                        className="absolute inset-0 flex items-center justify-center p-0 sm:p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImages[selectedImageIndex] ?? displayImages[0]}
                          alt={`${product.name} - ${selectedImageIndex + 1} de ${displayImages.length}`}
                          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg select-none pointer-events-none block"
                          draggable={false}
                          style={{ maxHeight: '100%' }}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {displayImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1)); }}
                      className="hidden sm:flex flex-shrink-0 min-h-12 min-w-12 items-center justify-center rounded-xl bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/80 transition-colors duration-200 touch-manipulation"
                      aria-label="Siguiente imagen"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}
                </div>
                {/* Indicador de posición y miniaturas: scroll horizontal en móvil si hay muchas */}
                {displayImages.length > 1 && (
                  <div className="flex-shrink-0 mt-3 sm:mt-4 flex flex-col items-center gap-2 sm:gap-3">
                    <p className="text-xs sm:text-sm text-neutral-500 tabular-nums">
                      {selectedImageIndex + 1} / {displayImages.length}
                    </p>
                    <div className="flex flex-nowrap sm:flex-wrap justify-center gap-1.5 sm:gap-2 overflow-x-auto overflow-y-hidden py-1 max-w-full [scrollbar-width:thin]">
                      {displayImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={cn(
                            'relative flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-lg overflow-hidden border-2 transition-all touch-manipulation',
                            selectedImageIndex === idx
                              ? 'border-primary-500 ring-2 ring-primary-500/30'
                              : 'border-neutral-700 hover:border-neutral-500 opacity-80 hover:opacity-100'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
