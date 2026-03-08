'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Minus, Check, ShoppingCart, ImageOff, AlertCircle, Store, X, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { type Product } from '@/types/product';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { useCart } from '@/lib/store/cart-store';
import { type CartItem, type ProductCombination } from '@/types/product';
import { VariantSelector } from './VariantSelector';
import { cn } from '@/lib/utils/cn';
import { getProductPriceRange } from '@/lib/utils/productPriceRange';
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

  const initialVariants = useMemo(() => {
    const variants: Record<string, string> = {};
    product.attributes.forEach((attribute) => {
      if (attribute.variants.length > 0) {
        const availableVariant = attribute.variants.find(v => v.stock > 0) || attribute.variants[0];
        variants[attribute.id] = availableVariant.id;
      }
    });
    return variants;
  }, [product.attributes]);

  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(initialVariants);
  const skipVariantToImageSync = useRef(false);

  const { allProductImages, imageIndexToCombination } = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const comboMap: (ProductCombination | null)[] = [];
    const add = (url: string, combo: ProductCombination | null) => {
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
        comboMap.push(combo);
      }
    };
    (product.images || []).forEach((url) => add(url, null));
    (product.combinations || []).forEach((combo) => {
      (combo.images || []).forEach((url) => add(url, combo));
    });
    (product.attributes || []).forEach((attr) => {
      (attr.variants || []).forEach((v) => {
        (v.images || []).forEach((url) => add(url, null));
      });
    });
    return { allProductImages: out, imageIndexToCombination: comboMap };
  }, [product]);

  const hasCombinations = Boolean(product.combinations && product.combinations.length > 0);

  type VariantOption = {
    id: string;
    selections: Record<string, string>;
    displayName: string;
    stock: number;
    priceModifier: number;
    images: string[];
  };
  const variantOptions = useMemo((): VariantOption[] => {
    const opts: VariantOption[] = [];
    if (product.combinations && product.combinations.length > 0) {
      product.combinations.forEach((combo) => {
        const names: string[] = [];
        Object.entries(combo.selections || {}).forEach(([attrId, variantId]) => {
          const attr = product.attributes.find((a) => a.id === attrId);
          const v = attr?.variants.find((vr) => vr.id === variantId);
          if (v?.name) names.push(v.name);
        });
        opts.push({
          id: combo.id,
          selections: { ...(combo.selections || {}) },
          displayName: names.join(' · ') || combo.id,
          stock: typeof combo.stock === 'number' ? combo.stock : parseInt(String(combo.stock ?? 0), 10) || 0,
          priceModifier: typeof combo.priceModifier === 'number' ? combo.priceModifier : parseFloat(String(combo.priceModifier ?? 0)) || 0,
          images: combo.images || [],
        });
      });
    } else if (product.attributes?.length === 1) {
      const attr = product.attributes[0];
      attr.variants.forEach((v) => {
        opts.push({
          id: v.id,
          selections: { [attr.id]: v.id },
          displayName: v.name || v.value,
          stock: v.stock ?? 0,
          priceModifier: typeof v.price === 'number' ? v.price : parseFloat(String(v.price ?? 0)) || 0,
          images: v.images || [],
        });
      });
    }
    return opts;
  }, [product]);

  const [showVariantsPanel, setShowVariantsPanel] = useState(false);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});

  const selectedOptionId = useMemo(() => {
    return variantOptions.find((opt) =>
      Object.entries(opt.selections).every(([k, v]) => selectedVariants[k] === v)
    )?.id;
  }, [variantOptions, selectedVariants]);

  useEffect(() => {
    if (selectedOptionId) {
      setVariantQuantities((prev) => ({ ...prev, [selectedOptionId]: quantity }));
    }
  }, [quantity, selectedOptionId]);

  const displayImages = useMemo(() => {
    if (!product.attributes || product.attributes.length === 0) {
      return product.images || [];
    }
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

  const galleryImages = allProductImages.length > 0 ? allProductImages : displayImages;

  useEffect(() => {
    if (selectedImageIndex >= galleryImages.length && galleryImages.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [galleryImages.length, selectedImageIndex]);

  useEffect(() => {
    if (skipVariantToImageSync.current) {
      skipVariantToImageSync.current = false;
      return;
    }
    if (displayImages.length > 0 && galleryImages.length > 0) {
      const firstOfVariant = displayImages[0];
      const idx = galleryImages.indexOf(firstOfVariant);
      if (idx >= 0) setSelectedImageIndex(idx);
    }
  }, [selectedVariants, displayImages, galleryImages]);

  useEffect(() => {
    if (!hasCombinations || selectedImageIndex >= imageIndexToCombination.length) return;
    const combo = imageIndexToCombination[selectedImageIndex];
    if (combo?.selections) {
      skipVariantToImageSync.current = true;
      setSelectedVariants({ ...combo.selections });
    }
  }, [selectedImageIndex, hasCombinations, imageIndexToCombination]);

  const handleSelectImage = (index: number) => setSelectedImageIndex(index);

  useEffect(() => {
    if (!showImageGallery) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowImageGallery(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showImageGallery]);

  useEffect(() => {
    if (showImageGallery) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showImageGallery]);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const SWIPE_THRESHOLD = 50;
  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null || galleryImages.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff > 0) {
      setSelectedImageIndex((i) => (i === galleryImages.length - 1 ? 0 : i + 1));
    } else {
      setSelectedImageIndex((i) => (i === 0 ? galleryImages.length - 1 : i - 1));
    }
    setTouchStartX(null);
  };

  const basePriceNumber = useMemo(() => {
    const raw = (product as { basePrice?: number; base_price?: number | string }).basePrice
      ?? (product as { base_price?: number | string }).base_price;
    if (raw == null || raw === '') return 0;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    return Number.isNaN(n) ? 0 : n;
  }, [product]);

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

  const variantPriceBreakdown = useMemo(() => {
    if (currentCombination != null && (currentCombination.priceModifier ?? 0) !== 0) {
      const p = typeof currentCombination.priceModifier === 'number' ? currentCombination.priceModifier : parseFloat(String(currentCombination.priceModifier ?? 0));
      if (!Number.isNaN(p) && p !== 0) {
        return [{ name: dict.product.combination, price: p }];
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
  }, [product, selectedVariants, currentCombination, dict]);

  const totalPrice = useMemo(() => {
    let price = basePriceNumber;
    variantPriceBreakdown.forEach(({ price: p }) => { price += p; });
    return price;
  }, [basePriceNumber, variantPriceBreakdown]);

  const canAddToCart = useMemo(() => {
    return product.attributes.every((attr) => {
      if (!attr.required) return true;
      return selectedVariants[attr.id] !== undefined;
    });
  }, [product.attributes, selectedVariants]);

  const availableStock = useMemo(() => {
    if (product.attributes.length === 0) return product.stock;
    const allRequiredSelected = product.attributes
      .filter(attr => attr.required)
      .every(attr => selectedVariants[attr.id] !== undefined);
    if (!allRequiredSelected) return 0;
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

  useEffect(() => {
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(availableStock);
    }
  }, [availableStock, quantity]);

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
    if (availableStock < quantity) return;

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

  const addOptionToCart = (opt: VariantOption, qty: number) => {
    if (qty < 1 || qty > opt.stock) return;
    setSelectedVariants(opt.selections);
    const cartVariants: CartItem['selectedVariants'] = product.attributes
      .filter((attr) => opt.selections[attr.id])
      .map((attr) => {
        const variantId = opt.selections[attr.id];
        const variant = attr.variants.find((v) => v.id === variantId);
        const combo = product.combinations?.find((c) =>
          Object.entries(c.selections || {}).every(([k, v]) => opt.selections[k] === v)
        );
        return {
          attributeId: attr.id,
          attributeName: attr.name,
          variantId,
          variantName: variant?.name || '',
          variantValue: variant?.value || '',
          priceModifier: combo?.priceModifier ?? variant?.price ?? 0,
        };
      });
    addItem(product, qty, cartVariants);
    setAddedToCart(true);
    setShowCartDialog(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  const hasImage = galleryImages && galleryImages.length > 0;
  const mainImage = hasImage ? (galleryImages[selectedImageIndex] ?? galleryImages[0]) : '';

  if (product.visibleInStore === false) {
    return (
      <div className="flex min-h-[380px] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/50 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <AlertCircle className="h-7 w-7 text-amber-400" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-neutral-100">
            {dict.product.notAvailable}
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            {dict.product.notAvailableDescription}
          </p>
        </div>
      </div>
    );
  }

  const priceRange = useMemo(() => getProductPriceRange(product), [product]);
  const priceDisplay = product.hidePrice === true
    ? dict.cart.priceOnRequest
    : `${product.currency === 'USD' ? '$' : ''}${(typeof totalPrice === 'number' && !Number.isNaN(totalPrice) ? totalPrice : basePriceNumber).toFixed(2)}`;

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:gap-12 lg:items-start">
        {/* Columna imagen */}
        <div className="flex-shrink-0 lg:w-1/2 lg:sticky lg:top-6">
          <div
            role={hasImage ? 'button' : undefined}
            tabIndex={hasImage ? 0 : undefined}
            onClick={hasImage ? () => setShowImageGallery(true) : undefined}
            onKeyDown={hasImage ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowImageGallery(true); } } : undefined}
            className={cn(
              'relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-900',
              hasImage && 'cursor-zoom-in active:opacity-95'
            )}
          >
            {hasImage ? (
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized={mainImage.startsWith('data:') || mainImage.startsWith('http')}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageOff className="h-20 w-20 text-neutral-600" />
              </div>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {galleryImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectImage(index)}
                  className={cn(
                    'relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 overflow-hidden rounded-lg border-2 transition-all',
                    selectedImageIndex === index
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    unoptimized={image.startsWith('data:') || image.startsWith('http')}
                    className="object-cover"
                    sizes="64px"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columna info */}
        <div className="flex-1 min-w-0 mt-6 lg:mt-0">
          {/* Store */}
          {product.storeName && product.storeId && (
            <Link
              href={`/${(product.storeSlug && product.storeSlug.trim()) ? product.storeSlug : product.storeId}`}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-primary-400 mb-2"
            >
              <Store className="h-4 w-4" />
              {product.storeName}
            </Link>
          )}

          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-50 tracking-tight">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {product.hidePrice !== true && (
              <span className="text-2xl sm:text-3xl font-bold text-primary-400">
                {priceDisplay}
              </span>
            )}
            {product.rating != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-1 text-sm text-neutral-300">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)}
                {product.reviewCount != null && product.reviewCount > 0 && (
                  <span className="text-neutral-500">({product.reviewCount})</span>
                )}
              </span>
            )}
            <span className={cn(
              'rounded-full px-2.5 py-1 text-sm font-medium',
              availableStock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            )}>
              {availableStock > 0
                ? `${availableStock} ${dict.product.inStock.toLowerCase()}`
                : dict.product.outOfStock}
            </span>
          </div>
          {product.hidePrice !== true && priceRange && (
            <div className="mt-2 flex flex-col gap-0.5">
              <p className="text-sm text-neutral-400">
                {(dict.product.priceFromTo ?? 'desde $X hasta $Y')
                  .replace(/\{\{min\}\}/g, priceRange.min.toFixed(2))
                  .replace(/\{\{max\}\}/g, priceRange.max.toFixed(2))}
              </p>
              <p className="text-xs text-neutral-500 italic">
                {dict.product.priceVariesByOption}
              </p>
            </div>
          )}

          {product.hidePrice !== true && (basePriceNumber > 0 || variantPriceBreakdown.length > 0) && (
            <p className="mt-2 text-sm text-neutral-500">
              {basePriceNumber > 0 && (
                <span>{dict.product.basePrice}: {product.currency === 'USD' ? '$' : ''}{basePriceNumber.toFixed(2)}</span>
              )}
              {variantPriceBreakdown.map(({ name, price }) => (
                <span key={name}> · {name}: +{product.currency === 'USD' ? '$' : ''}{price.toFixed(2)}</span>
              ))}
            </p>
          )}

          {/* Variantes */}
          {variantOptions.length > 0 ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowVariantsPanel((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900/50 px-4 py-3 text-left hover:bg-neutral-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-neutral-200">
                  {dict.product.viewAllVariants} ({variantOptions.length})
                </span>
                <ChevronDown className={cn('h-5 w-5 text-neutral-400 transition-transform', showVariantsPanel && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showVariantsPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {variantOptions.map((opt) => {
                        const isSelected =
                          Object.keys(opt.selections).length === Object.keys(selectedVariants).length &&
                          Object.entries(opt.selections).every(([k, v]) => selectedVariants[k] === v);
                        const optStock = opt.stock;
                        const optPrice = basePriceNumber + opt.priceModifier;
                        const optQty = variantQuantities[opt.id] ?? 1;
                        const setOptQty = (n: number) => {
                          const clamped = Math.max(1, Math.min(optStock, n));
                          setVariantQuantities((prev) => ({ ...prev, [opt.id]: clamped }));
                          if (isSelected) setQuantity(clamped);
                        };

                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-colors',
                              isSelected ? 'border-primary-500/50 bg-primary-500/5' : 'border-neutral-800 bg-neutral-900/30'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVariants(opt.selections);
                                const q = variantQuantities[opt.id] ?? 1;
                                setQuantity(Math.min(q, opt.stock));
                              }}
                              className="flex-1 text-left min-w-0"
                            >
                              <p className="font-medium text-neutral-100">{opt.displayName}</p>
                              <p className="text-sm text-neutral-400 mt-0.5">
                                {!product.hidePrice && (
                                  <span className="text-primary-400 font-medium">{product.currency === 'USD' ? '$' : ''}{optPrice.toFixed(2)}</span>
                                )}
                                <span className={cn('ml-2', optStock > 0 ? 'text-green-400' : 'text-red-400')}>
                                  {optStock > 0 ? `${optStock} ${dict.product.inStock.toLowerCase()}` : dict.product.outOfStock}
                                </span>
                              </p>
                            </button>
                            {(opt.images?.[0] || product.images?.[0]) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const imgUrl = opt.images?.[0] || product.images?.[0];
                                  if (imgUrl) {
                                    const idx = galleryImages.indexOf(imgUrl);
                                    setSelectedImageIndex(idx >= 0 ? idx : 0);
                                    setShowImageGallery(true);
                                  }
                                }}
                                className="relative z-10 flex flex-shrink-0 items-center gap-2 rounded-lg border border-neutral-600 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700/50 touch-manipulation"
                              >
                                <ImageIcon className="h-4 w-4" />
                                {dict.product.viewImage}
                              </button>
                            )}
                            {optStock > 0 && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center rounded-lg border border-neutral-700 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setOptQty(optQty - 1); }}
                                    disabled={optQty <= 1}
                                    className="p-2 text-neutral-400 hover:text-white disabled:opacity-40"
                                    aria-label={dict.cart.decreaseQuantity}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-[2.5rem] text-center text-sm font-medium text-neutral-100">
                                    {optQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setOptQty(optQty + 1); }}
                                    disabled={optQty >= optStock}
                                    className="p-2 text-neutral-400 hover:text-white disabled:opacity-40"
                                    aria-label={dict.cart.increaseQuantity}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const qtyToAdd = Math.min(optQty, optStock);
                                    if (qtyToAdd >= 1) addOptionToCart(opt, qtyToAdd);
                                  }}
                                  disabled={optQty > optStock}
                                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  {dict.product.addToCart}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-3 text-sm text-neutral-400">
                {dict.product.openVariantsToAddToCart}
              </p>
            </div>
          ) : (
            <>
              {product.attributes.map((attribute) => (
                <div key={attribute.id} className="mt-4">
                  <VariantSelector
                    attribute={attribute}
                    selectedVariantId={selectedVariants[attribute.id] || null}
                    onSelect={(variantId) => handleVariantSelect(attribute.id, variantId)}
                    dict={dict}
                    hasCombinationStock={Boolean(product.combinations && product.combinations.length > 0)}
                  />
                  {attribute.required && !selectedVariants[attribute.id] && (
                    <p className="mt-1 text-xs text-primary-400">* {dict.product.required}</p>
                  )}
                </div>
              ))}
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center rounded-xl border border-neutral-700 overflow-hidden bg-neutral-900/50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-3 text-neutral-400 hover:text-white disabled:opacity-40"
                    aria-label={dict.cart.decreaseQuantity}
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="min-w-[3rem] text-center font-medium text-neutral-100">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    disabled={quantity >= availableStock}
                    className="p-3 text-neutral-400 hover:text-white disabled:opacity-40"
                    aria-label={dict.cart.increaseQuantity}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || availableStock < quantity}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-medium transition-colors',
                    addedToCart ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-500',
                    (!canAddToCart || availableStock < quantity) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {addedToCart ? (
                    <><Check className="h-5 w-5" /><span>{dict.product.addedToCart || '¡Agregado!'}</span></>
                  ) : (
                    <><ShoppingCart className="h-5 w-5" /><span>{dict.product.addToCart}</span></>
                  )}
                </button>
              </div>
              {!canAddToCart && <p className="mt-2 text-xs text-primary-400">{dict.product.selectOption}</p>}
              {availableStock < quantity && <p className="mt-2 text-xs text-red-400">{dict.product.outOfStock}</p>}
            </>
          )}

          {/* Descripción */}
          {product.description && (
            <div className="mt-8 pt-6 border-t border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {dict.product.description}
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <AddToCartDialog isOpen={showCartDialog} onClose={() => setShowCartDialog(false)} dict={dict} />

      {/* Modal galería: portal a body para evitar clipping por transform/overflow del layout */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showImageGallery && hasImage && galleryImages.length > 0 && (
              <div
                className="fixed inset-0 z-[9999] h-[100dvh] flex flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Galería"
                style={{
                  paddingLeft: 'env(safe-area-inset-left)',
                  paddingRight: 'env(safe-area-inset-right)',
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-neutral-950"
                  onClick={() => setShowImageGallery(false)}
                />
                <button
                  type="button"
                  onClick={() => setShowImageGallery(false)}
                  className="absolute top-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800/90 text-neutral-300 hover:text-white touch-manipulation"
                  aria-label={dict.product.closeGallery}
                >
                  <X className="h-5 w-5" />
                </button>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative z-10 flex flex-1 flex-col min-h-0 px-4 pt-14 pb-4"
                >
                  <div className="flex-1 flex items-center justify-center min-h-0 gap-2">
                    {galleryImages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((i) => (i === 0 ? galleryImages.length - 1 : i - 1)); }}
                        className="hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800/90 text-neutral-300 hover:text-white"
                        aria-label={dict.product.previousImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                    )}
                    <div
                      className="flex-1 flex items-center justify-center min-h-0 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={handleGalleryTouchStart}
                      onTouchEnd={handleGalleryTouchEnd}
                    >
                      <img
                        src={galleryImages[selectedImageIndex] ?? galleryImages[0]}
                        alt={`${product.name} - ${selectedImageIndex + 1}`}
                        className="max-w-[90vw] max-h-[70dvh] sm:max-h-[75vh] w-auto h-auto object-contain select-none block"
                        draggable={false}
                        loading="eager"
                      />
                    </div>
                    {galleryImages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((i) => (i === galleryImages.length - 1 ? 0 : i + 1)); }}
                        className="hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800/90 text-neutral-300 hover:text-white"
                        aria-label={dict.product.nextImage}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="flex-shrink-0 mt-3 flex flex-col items-center gap-2">
                      <span className="text-xs text-neutral-500">{selectedImageIndex + 1} / {galleryImages.length}</span>
                      <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-hide">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectImage(idx)}
                            className={cn(
                              'flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden border-2 transition-all',
                              selectedImageIndex === idx ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                            )}
                          >
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
