'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, X, Plus, Minus, MessageCircle, Store, Instagram } from 'lucide-react';
import { useCart, getItemUnitPrice } from '@/lib/store/cart-store';
import { trackViewCart, trackBeginCheckout } from '@/lib/analytics/gtag';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';
import { Button } from '@/components/ui/Button';
import { openWhatsAppForStore } from '@/lib/utils/whatsapp';
import { WHATSAPP_PHONE } from '@/constants/whatsapp';
import { type CartItem, type StoreUser } from '@/types/product';
import { cn } from '@/lib/utils/cn';
import { createRequest } from '@/lib/services/requests';
import { CustomerInfoDialog, type DeliveryInfo } from './CustomerInfoDialog';
import { getBcvRates } from '@/lib/services/bcv';
import { getStoreById } from '@/lib/services/stores';
import { resolveImageUrl } from '@/lib/utils/image-url';

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

  // Analytics: view_cart una vez al montar si hay ítems
  const viewCartSentRef = useRef(false);
  useEffect(() => {
    if (viewCartSentRef.current || cart.items.length === 0) return;
    viewCartSentRef.current = true;
    const currency = cart.items[0]?.currency ?? 'USD';
    trackViewCart({
      value: cart.total,
      currency,
      itemCount: cart.itemCount,
      items: cart.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        price: getItemUnitPrice(i),
        storeName: i.storeName,
      })),
    });
  }, [cart.items.length, cart.total, cart.itemCount, cart.items]);

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
    trackBeginCheckout({
      value: storeGroup.total,
      currency: storeGroup.currency ?? 'USD',
      itemCount: storeGroup.items.reduce((s, i) => s + i.quantity, 0),
      items: storeGroup.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        price: getItemUnitPrice(i),
        storeName: i.storeName,
      })),
      storeNames: [storeGroup.storeName],
    });
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
  
  const handleCustomerInfoConfirm = async (
    info: { customerName?: string; customerPhone?: string },
    deliveryInfo: DeliveryInfo
  ) => {
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

    let deliveryDateISO: string | undefined;
    if (deliveryInfo.deliveryDate) {
      const timePart = deliveryInfo.deliveryTime || '12:00';
      deliveryDateISO = new Date(`${deliveryInfo.deliveryDate}T${timePart}:00`).toISOString();
    }

    let orderNumber: number | undefined;
    try {
      const request = await createRequest({
        storeId: storeGroup.storeId,
        items: storeGroup.items,
        total: storeGroup.total,
        currency: storeGroup.currency || 'USD',
        customerName: info.customerName,
        customerPhone: info.customerPhone,
        deliveryMethod: deliveryInfo.deliveryMethod,
        deliveryAddress: deliveryInfo.deliveryAddress,
        deliveryReference: deliveryInfo.deliveryReference,
        deliveryRecipientName: deliveryInfo.deliveryRecipientName,
        deliveryRecipientPhone: deliveryInfo.deliveryRecipientPhone,
        deliveryDate: deliveryDateISO,
        deliveryNotes: deliveryInfo.deliveryNotes,
      });
      orderNumber = request?.orderNumber ?? undefined;
    } catch (error) {
      console.error('Error guardando pedido:', error);
    }

    openWhatsAppForStore(
      storeGroup.items,
      storeGroup.storeName,
      locale,
      phoneNumber,
      undefined,
      bcvRates.dolar > 0 ? bcvRates.dolar : undefined,
      undefined,
      orderNumber,
      deliveryInfo
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
      const storeName = item.storeName || dict.store.defaultName;
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
  }, [cart.items, dict.store.defaultName]);
  
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800/60">
          <ShoppingCart className="h-7 w-7 text-neutral-500" aria-hidden />
        </div>
        <h2 className="text-lg font-medium text-neutral-100">{dict.cart.empty}</h2>
        <p className="mt-2 max-w-xs text-center text-sm font-light text-neutral-500">
          {dict.cart.emptyDescription}
        </p>
        <Link href="/" prefetch={true} className="mt-8">
          <Button>{dict.cart.continueShopping}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-light tracking-tight text-white sm:text-3xl">
        {dict.cart.title}
      </h1>

      <div className="space-y-8">
        {storesGroups.map((storeGroup) => (
          <div
            key={storeGroup.storeId}
            className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5 sm:p-6"
          >
            {(() => {
              const storeInfo = storeInfoMap[storeGroup.storeId];
              const logo = storeGroup.storeLogo ?? storeInfo?.logo;
              const instagram = storeGroup.storeInstagram ?? (storeInfo?.instagram && storeInfo.instagram.trim() ? storeInfo.instagram.trim() : undefined);
              const tiktok = storeGroup.storeTiktok ?? (storeInfo?.tiktok && storeInfo.tiktok.trim() ? storeInfo.tiktok.trim() : undefined);
              return (
                <div className="mb-5 flex items-center gap-4 border-b border-neutral-800 pb-5">
                  <div className="flex h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800 ring-1 ring-neutral-700/50">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(logo) ?? logo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Store className="h-5 w-5 text-neutral-500" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-medium text-white sm:text-lg">
                      {storeGroup.storeName}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {storeGroup.items.length === 1
                        ? dict.cart.productCount.replace('{{count}}', String(storeGroup.items.length))
                        : dict.cart.productCountPlural.replace('{{count}}', String(storeGroup.items.length))}
                    </p>
                    {(instagram || tiktok) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {instagram && (
                          <a
                            href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-pink-400"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-3.5 w-3.5" />
                            @{instagram.replace(/^@/, '')}
                          </a>
                        )}
                        {tiktok && (
                          <a
                            href={`https://tiktok.com/@${tiktok.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-300"
                            aria-label="TikTok"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                            </svg>
                            @{tiktok.replace(/^@/, '')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="mb-6 space-y-3">
              {storeGroup.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
                >
                  <Link
                    href={`/products/${item.productId}`}
                    prefetch={true}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800"
                  >
                    <Image
                      src={item.productImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      loading="lazy"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${item.productId}`}
                          prefetch={true}
                          className="text-sm font-medium text-white hover:text-primary-300"
                        >
                          {item.productName}
                        </Link>
                        {item.selectedVariants.length > 0 && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {item.selectedVariants.map((v) => v.variantValue).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-red-400"
                        title={dict.cart.removeItem}
                        aria-label={dict.cart.removeItem}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center rounded-lg border border-neutral-700 bg-neutral-950">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-white disabled:opacity-40"
                          aria-label={dict.cart.decreaseQuantity || 'Disminuir'}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm tabular-nums text-neutral-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-white disabled:opacity-40"
                          aria-label={dict.cart.increaseQuantity || 'Aumentar'}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.hidePrice !== true && (
                        <p className="text-sm font-medium text-white tabular-nums">
                          ${item.totalPrice.toFixed(2)}
                          {item.quantity > 1 && (
                            <span className="ml-1 text-neutral-500">· ${(item.totalPrice / item.quantity).toFixed(2)} {dict.cart.perUnit}</span>
                          )}
                        </p>
                      )}
                      {item.hidePrice === true && (
                        <p className="text-sm italic text-neutral-500">{dict.cart.priceOnRequest}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen y botón de WhatsApp por tienda */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Total · {storeGroup.storeName}
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-white">
                    ${storeGroup.total.toFixed(2)}
                  </p>
                  {bcvRates.dolar > 0 && (
                    <p className="mt-1 text-sm tabular-nums text-neutral-500">
                      Bs. {(storeGroup.total * bcvRates.dolar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} {dict.cart.rateUsd}
                    </p>
                  )}
                </div>
              </div>

              {/* Selector de contacto: solo nombres (nunca mostrar teléfonos) */}
              {(() => {
                const availableUsers = (storeGroup.storeUsers || []).filter(
                  (user) => user.phoneNumber && user.phoneNumber.trim() !== ''
                );
                const hasMultiple = availableUsers.length > 1;
                const defaultPhone = availableUsers.length > 0
                  ? availableUsers[0].phoneNumber
                  : (storeGroup.storePhoneNumber || WHATSAPP_PHONE);
                const selectedPhone = selectedPhoneNumbers[storeGroup.storeId] || defaultPhone;

                if (hasMultiple) {
                  return (
                    <div className="mb-4">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                        {dict.cart.sendOrderTo}
                      </label>
                      <select
                        value={selectedPhone}
                        onChange={(e) => {
                          setSelectedPhoneNumbers((prev) => ({
                            ...prev,
                            [storeGroup.storeId]: e.target.value,
                          }));
                        }}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                      >
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.phoneNumber}>
                            {user.userName || storeGroup.storeName}
                            {user.isCreator ? ` (${dict.cart.creator})` : ''}
                          </option>
                        ))}
                        {!storeGroup.storePhoneNumber && (
                          <option value={WHATSAPP_PHONE}>
                            {storeGroup.storeName}
                          </option>
                        )}
                      </select>
                    </div>
                  );
                }

                if (availableUsers.length === 0) {
                  return (
                    <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                      <p className="text-xs text-amber-200/90">
                        {dict.cart.noContactConfigured}
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              <button
                onClick={() => handleSendOrderClick(storeGroup)}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  'flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-500'
                )}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                <span>{dict.cart.orderByWhatsAppButtonShort}</span> · {storeGroup.storeName}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen general */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/50 p-6">
        <div className="flex justify-between items-baseline gap-4">
          <span className="text-base font-medium text-neutral-200">{dict.cart.total}</span>
          <span className="text-2xl font-semibold tabular-nums text-white">
            ${cart.total.toFixed(2)}
          </span>
        </div>
        {bcvRates.dolar > 0 && (
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-sm text-neutral-500">{dict.cart.totalInBs}</span>
              <span className="text-lg font-medium tabular-nums text-neutral-300">
                Bs. {(cart.total * bcvRates.dolar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </div>
            <p className="mt-1 text-right text-xs text-neutral-500">
              {dict.cart.rateLabel.replace('{{rate}}', bcvRates.dolar.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
            </p>
          </div>
        )}
      </div>

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
