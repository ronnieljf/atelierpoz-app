'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, X, Plus, Minus, MessageCircle, Store, Phone, Instagram } from 'lucide-react';
import { useCart } from '@/lib/store/cart-store';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';
import { Button } from '@/components/ui/Button';
import { openWhatsAppForStore } from '@/lib/utils/whatsapp';
import { WHATSAPP_PHONE } from '@/constants/whatsapp';
import { type CartItem, type StoreUser } from '@/types/product';
import { cn } from '@/lib/utils/cn';
import { createRequest } from '@/lib/services/requests';
import { CustomerInfoDialog } from './CustomerInfoDialog';
import { getBcvRates } from '@/lib/services/bcv';
import { getStoreById } from '@/lib/services/stores';

interface CartProps {
  dict: Dictionary;
  locale: Locale;
}

interface StoreGroup {
  storeId: string;
  storeName: string;
  storeLogo?: string | null;
  storeInstagram?: string;
  storeTiktok?: string | null;
  storePhoneNumber?: string;
  storeUsers?: StoreUser[];
  items: CartItem[];
  total: number;
  currency?: string;
}

export function Cart({ dict, locale }: CartProps) {
  const { state, removeItem, updateQuantity } = useCart();
  const { cart } = state;
  
  // Tasas BCV (dólar y euro)
  const [bcvRates, setBcvRates] = useState<{ dolar: number; euro: number }>({ dolar: 0, euro: 0 });

  // Estado para almacenar el número de teléfono seleccionado por cada tienda
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<Record<string, string>>({});

  // Datos de tienda (logo, instagram, tiktok) por storeId — para ítems que no los traen en el carrito
  const [storeInfoMap, setStoreInfoMap] = useState<Record<string, { logo?: string | null; instagram?: string | null; tiktok?: string | null }>>({});

  // Obtener tasas BCV al montar el componente
  useEffect(() => {
    getBcvRates()
      .then((rates) => setBcvRates(rates))
      .catch((error) => {
        console.error('Error obteniendo tasas BCV:', error);
        setBcvRates({ dolar: 0, euro: 0 });
      });
  }, []);

  // Enriquecer con datos de tienda (logo, instagram, tiktok) cuando los ítems no los traen
  const storeIdsInCart = useMemo(() => [...new Set(cart.items.map((i) => i.storeId).filter(Boolean))] as string[], [cart.items]);
  useEffect(() => {
    storeIdsInCart.forEach((storeId) => {
      getStoreById(storeId).then((store) => {
        if (store) {
          setStoreInfoMap((prev) => ({
            ...prev,
            [storeId]: {
              logo: store.logo ?? null,
              instagram: store.instagram ?? null,
              tiktok: store.tiktok ?? null,
            },
          }));
        }
      });
    });
  }, [storeIdsInCart]);

  // Diálogo de información del cliente
  const [customerInfoDialog, setCustomerInfoDialog] = useState<{
    storeGroup: StoreGroup;
    phoneNumber: string;
  } | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    customerName?: string;
    customerPhone?: string;
  } | null>(null);
  
  // Obtener datos del cliente desde localStorage (nombre y teléfono)
  const getCustomerInfoFromStorage = (): {
    customerName?: string;
    customerPhone?: string;
  } | null => {
    if (typeof window === 'undefined') return null;
    const name = localStorage.getItem('customer_name');
    const phone = localStorage.getItem('customer_phone');
    
    if (!name && !phone) return null;
    
    return {
      customerName: name || undefined,
      customerPhone: phone || undefined,
    };
  };
  
  // Guardar datos del cliente en localStorage (nombre y teléfono)
  const saveCustomerInfoToStorage = (info: {
    customerName?: string;
    customerPhone?: string;
  }) => {
    if (typeof window === 'undefined') return;
    
    if (info.customerName) {
      localStorage.setItem('customer_name', info.customerName);
    }
    if (info.customerPhone) {
      localStorage.setItem('customer_phone', info.customerPhone);
    }
  };
  
  // Manejar el click en "Enviar pedido"
  const handleSendOrderClick = (storeGroup: StoreGroup) => {
    const availableUsers = (storeGroup.storeUsers || []).filter(
      (u) => u.phoneNumber && u.phoneNumber.trim() !== ''
    );
    const defaultPhone =
      availableUsers.length > 0
        ? availableUsers[0].phoneNumber
        : (storeGroup.storePhoneNumber || WHATSAPP_PHONE);
    const phoneNumber = selectedPhoneNumbers[storeGroup.storeId] || defaultPhone;
    
    if (!phoneNumber) return;
    
    // Revisar si hay datos del cliente en localStorage
    const storedCustomerInfo = getCustomerInfoFromStorage();
    
    if (storedCustomerInfo) {
      // Si hay datos, preguntar si es esa persona
      setCustomerInfo(storedCustomerInfo);
      setCustomerInfoDialog({ storeGroup, phoneNumber });
    } else {
      // Si no hay datos, pedir los datos
      setCustomerInfo(null);
      setCustomerInfoDialog({ storeGroup, phoneNumber });
    }
  };
  
  // Manejar confirmación de datos del cliente — enviar pedido y abrir WhatsApp sin diálogo de mensaje adicional
  const handleCustomerInfoConfirm = async (info: {
    customerName?: string;
    customerPhone?: string;
  }) => {
    // Guardar en localStorage si se proporcionaron datos
    if (info.customerName || info.customerPhone) {
      saveCustomerInfoToStorage(info);
    }

    if (!customerInfoDialog) {
      setCustomerInfoDialog(null);
      setCustomerInfo(null);
      return;
    }

    const { storeGroup, phoneNumber } = customerInfoDialog;
    setCustomerInfoDialog(null);
    setCustomerInfo(null);

    // Guardar el pedido en el backend y abrir WhatsApp directamente (sin mensaje adicional)
    try {
      await createRequest({
        storeId: storeGroup.storeId,
        items: storeGroup.items,
        total: storeGroup.total,
        currency: storeGroup.currency || 'USD',
        customerName: info.customerName,
        customerPhone: info.customerPhone,
      });
    } catch (error) {
      console.error('Error guardando pedido:', error);
    }

    // eurToBs no se pasa: no enviar total a tasa euro en el mensaje de WhatsApp
    openWhatsAppForStore(
      storeGroup.items,
      storeGroup.storeName,
      locale,
      phoneNumber,
      undefined,
      bcvRates.dolar > 0 ? bcvRates.dolar : undefined
    );
  };
  
  // Manejar cancelación del diálogo de información del cliente
  const handleCustomerInfoCancel = () => {
    setCustomerInfoDialog(null);
    setCustomerInfo(null);
  };
  
  // Agrupar productos por tienda
  const storesGroups = useMemo(() => {
    const groups = new Map<string, StoreGroup>();
    
    cart.items.forEach((item) => {
      const storeId = item.storeId || 'unknown';
      const storeName = item.storeName || 'Tienda';
      const storeLogo = item.storeLogo;
      const storeInstagram = item.storeInstagram;
      const storeTiktok = item.storeTiktok;
      const storePhoneNumber = item.storePhoneNumber;
      const storeUsers = item.storeUsers || [];
      
      if (!groups.has(storeId)) {
        groups.set(storeId, {
          storeId,
          storeName,
          storeLogo,
          storeInstagram,
          storeTiktok,
          storePhoneNumber,
          storeUsers,
          items: [],
          total: 0,
          currency: item.currency || 'USD',
        });
      }
      
      const group = groups.get(storeId)!;
      group.items.push(item);
      group.total += item.totalPrice;
      // Asegurar que currency esté en el grupo
      if (item.currency && !group.currency) {
        group.currency = item.currency;
      }
      // Asegurar logo y redes si el item los tiene
      if (storeLogo != null && group.storeLogo == null) group.storeLogo = storeLogo;
      if (storeInstagram && !group.storeInstagram) group.storeInstagram = storeInstagram;
      if (storeTiktok != null && group.storeTiktok == null) group.storeTiktok = storeTiktok;
      if (storePhoneNumber && !group.storePhoneNumber) {
        group.storePhoneNumber = storePhoneNumber;
      }
      // Combinar storeUsers únicos (por id)
      if (storeUsers.length > 0) {
        const existingUserIds = new Set(group.storeUsers?.map(u => u.id) || []);
        const newUsers = storeUsers.filter(u => !existingUserIds.has(u.id));
        if (newUsers.length > 0) {
          group.storeUsers = [...(group.storeUsers || []), ...newUsers];
        }
      }
    });
    
    return Array.from(groups.values());
  }, [cart.items]);
  
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
        <div className="mb-5 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-neutral-800/80 border border-neutral-700/40">
          <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-neutral-500" />
        </div>
        <h2 className="mb-2 text-xl sm:text-2xl font-light tracking-tight text-neutral-100">
          {dict.cart.empty}
        </h2>
        <p className="mb-8 max-w-sm text-sm sm:text-base font-light text-neutral-500 px-4 text-center leading-relaxed">
          {dict.cart.emptyDescription}
        </p>
        <Link href="/" prefetch={true}>
          <Button>{dict.cart.continueShopping}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-100">
        {dict.cart.title}
      </h1>

      <div className="space-y-8 sm:space-y-10">
        {storesGroups.map((storeGroup) => (
          <div
            key={storeGroup.storeId}
            className="rounded-3xl border border-neutral-700/40 bg-neutral-900/60 backdrop-blur-sm p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
          >
            {(() => {
              const storeInfo = storeInfoMap[storeGroup.storeId];
              const logo = storeGroup.storeLogo ?? storeInfo?.logo;
              const instagram = storeGroup.storeInstagram ?? (storeInfo?.instagram && storeInfo.instagram.trim() ? storeInfo.instagram.trim() : undefined);
              const tiktok = storeGroup.storeTiktok ?? (storeInfo?.tiktok && storeInfo.tiktok.trim() ? storeInfo.tiktok.trim() : undefined);
              return (
                <div className="mb-6 flex items-center gap-4 pb-6 border-b border-neutral-700/40">
                  <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-primary-500/20 bg-primary-500/10">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt={storeGroup.storeName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Store className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-medium text-neutral-100 tracking-tight">
                      {storeGroup.storeName}
                    </h2>
                    <p className="text-sm font-light text-neutral-500">
                      {storeGroup.items.length} {storeGroup.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                    {(instagram || tiktok) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {instagram && (
                          <a
                            href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-pink-400 transition-colors"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-4 w-4" />
                            <span>@{instagram.replace(/^@/, '')}</span>
                          </a>
                        )}
                        {tiktok && (
                          <a
                            href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                            aria-label="TikTok"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                            </svg>
                            <span>@{tiktok.replace(/^@/, '')}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4 mb-6">
              {storeGroup.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-4 sm:gap-5 rounded-2xl border border-neutral-700/30 bg-neutral-800/30 p-4 sm:p-5 transition-all duration-300 hover:bg-neutral-800/50"
                >
                  <Link
                    href={`/products/${item.productId}`}
                    prefetch={true}
                    className="relative h-28 w-full sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl border border-neutral-700/40 group/image"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-10" />
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover/image:scale-110"
                      sizes="96px"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                  </Link>
                  
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${item.productId}`}
                          prefetch={true}
                          className="text-base font-medium text-neutral-100 hover:text-primary-400 transition-colors duration-200"
                        >
                          {item.productName}
                        </Link>
                        {item.selectedVariants.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {item.selectedVariants.map((variant, index) => (
                              <p key={index} className="text-xs font-light text-neutral-500">
                                <span className="text-neutral-400">{variant.attributeName}:</span>{' '}
                                {variant.variantValue}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 flex-shrink-0"
                        title={dict.cart.removeItem}
                        aria-label={dict.cart.removeItem}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center rounded-xl border border-neutral-700/40 bg-neutral-900/40 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
                          aria-label={dict.cart.decreaseQuantity || 'Disminuir cantidad'}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2.25rem] text-center text-sm font-medium text-neutral-100 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
                          aria-label={dict.cart.increaseQuantity || 'Aumentar cantidad'}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-left sm:text-right">
                        {item.hidePrice === true ? (
                          <p className="text-sm font-medium text-neutral-400 italic">
                            Precio a convenir
                          </p>
                        ) : (
                          <>
                            <p className="text-base font-medium text-neutral-100 tracking-tight">
                              ${item.totalPrice.toFixed(2)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs font-light text-neutral-500">
                                ${(item.totalPrice / item.quantity).toFixed(2)} c/u
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen y botón de WhatsApp por tienda */}
            <div className="rounded-2xl border border-green-700/30 bg-green-950/30 backdrop-blur-sm p-5 sm:p-6 relative overflow-hidden">
              <div className="mb-4 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600/20 border border-green-500/20">
                    <MessageCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-green-400/90">
                      Total {storeGroup.storeName}
                    </p>
                    <p className="text-lg font-semibold text-green-100 tracking-tight">
                      ${storeGroup.total.toFixed(2)}
                    </p>
                    {/* Totales en Bs (tasa BCV dólar) por tienda — euro comentado */}
                    {bcvRates.dolar > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium text-green-200/90 tracking-tight tabular-nums">
                          Bs. {(storeGroup.total * bcvRates.dolar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (tasa USD)
                        </p>
                        {/* {bcvRates.euro > 0 && (
                          <p className="text-sm font-medium text-green-200/90 tracking-tight tabular-nums">
                            Bs. {(storeGroup.total * bcvRates.euro).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} (tasa EUR)
                          </p>
                        )} */}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selector de número de teléfono si hay múltiples opciones */}
              {(() => {
                const availableUsers = (storeGroup.storeUsers || []).filter(
                  (user) => user.phoneNumber && user.phoneNumber.trim() !== ''
                );
                const hasMultipleNumbers = availableUsers.length > 1;
                const defaultPhone = availableUsers.length > 0 
                  ? availableUsers[0].phoneNumber 
                  : (storeGroup.storePhoneNumber || WHATSAPP_PHONE);
                const selectedPhone = selectedPhoneNumbers[storeGroup.storeId] || defaultPhone;
                
                if (hasMultipleNumbers) {
                  return (
                    <div className="mb-4 space-y-2 relative z-10">
                      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-green-400/80">
                        <Phone className="h-3.5 w-3.5" />
                        Selecciona WhatsApp
                      </label>
                      <select
                        value={selectedPhone}
                        onChange={(e) => {
                          setSelectedPhoneNumbers((prev) => ({
                            ...prev,
                            [storeGroup.storeId]: e.target.value,
                          }));
                        }}
                        className="w-full rounded-xl px-4 py-2.5 text-sm bg-neutral-900/50 border border-green-700/30 text-green-100 placeholder-green-400/50 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-colors duration-200"
                      >
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.phoneNumber} className="bg-neutral-900 text-green-100">
                            {user.userName || 'Usuario'}
                            {user.isCreator ? ' (Creador)' : ''}
                          </option>
                        ))}
                        {!storeGroup.storePhoneNumber && (
                          <option value={WHATSAPP_PHONE} className="bg-neutral-900 text-green-100">
                            Número por defecto
                          </option>
                        )}
                      </select>
                    </div>
                  );
                }

                if (availableUsers.length === 1) {
                  return null;
                }

                if (availableUsers.length === 0) {
                  return (
                    <div className="mb-4 py-2.5 px-3 rounded-xl bg-amber-900/20 border border-amber-700/30 relative z-10">
                      <p className="text-xs font-light text-amber-200/90">
                        Sin número configurado. Se usará el por defecto.
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              <button
                onClick={() => handleSendOrderClick(storeGroup)}
                className={cn(
                  'relative z-10 w-full rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200',
                  'flex items-center justify-center gap-2',
                  'bg-green-600 text-white hover:bg-green-500',
                  'border border-green-500/30 hover:border-green-400/40',
                  'shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25',
                  'hover:scale-[1.01] active:scale-[0.99]'
                )}
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Enviar pedido · {storeGroup.storeName}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen general */}
      <div className="rounded-3xl border border-neutral-700/40 bg-neutral-900/60 backdrop-blur-sm p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="space-y-3 relative z-10">
          <div className="border-t border-neutral-700/40 pt-4 mt-1">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-lg font-medium text-neutral-100 tracking-tight">
                {dict.cart.total}
              </span>
              <span className="text-2xl sm:text-3xl font-semibold text-primary-400 tracking-tight tabular-nums">
                ${cart.total.toFixed(2)}
              </span>
            </div>
            {/* Totales en bolívares (tasa BCV dólar) — euro comentado */}
            {bcvRates.dolar > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-700/30 space-y-2">
                <div>
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-sm font-medium text-neutral-400 tracking-tight">
                      Total en Bs. (tasa BCV USD)
                    </span>
                    <span className="text-lg sm:text-xl font-semibold text-neutral-300 tracking-tight tabular-nums">
                      Bs. {(cart.total * bcvRates.dolar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 text-right">
                    Tasa: Bs. {bcvRates.dolar.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} por USD
                  </p>
                </div>
                {/* Total a tasa euro — comentado
                {bcvRates.euro > 0 && (
                  <div>
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-sm font-medium text-neutral-400 tracking-tight">
                        Total en Bs. (tasa BCV EUR)
                      </span>
                      <span className="text-lg sm:text-xl font-semibold text-neutral-300 tracking-tight tabular-nums">
                        Bs. {(cart.total * bcvRates.euro).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 text-right">
                      Tasa: Bs. {bcvRates.euro.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} por EUR
                    </p>
                  </div>
                )} */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* <div className="pt-4 sm:pt-6 flex justify-center">
        <Link
          href="/"
          prefetch={true}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-700/50 bg-neutral-800/50 text-neutral-300 hover:text-neutral-100 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all duration-200 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {dict.navigation.home}
        </Link>
      </div> */}

      {/* Diálogo de información del cliente */}
      <CustomerInfoDialog
        isOpen={!!customerInfoDialog}
        existingCustomer={customerInfo}
        onConfirm={handleCustomerInfoConfirm}
        onCancel={handleCustomerInfoCancel}
      />
    </div>
  );
}
