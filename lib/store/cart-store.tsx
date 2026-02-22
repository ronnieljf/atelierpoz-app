'use client';

import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import { type Cart, type CartItem, type Product, type StoreUser } from '@/types/product';
import { trackAddToCart, trackRemoveFromCart } from '@/lib/analytics/gtag';

interface CartState {
  cart: Cart;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number; selectedVariants: CartItem['selectedVariants'] } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: { cart: Cart } };

interface CartContextType {
  state: CartState;
  addItem: (product: Product, quantity: number, selectedVariants: CartItem['selectedVariants']) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Convierte a número seguro (API o localStorage pueden devolver string). */
function toNumber(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(n) ? fallback : n;
}

/** Precio unitario a partir de un CartItem (base + variantes). Usado para recalcular al cambiar cantidad o al cargar. Exportado para analytics. */
export function getItemUnitPrice(item: CartItem): number {
  const base = toNumber(item.basePrice, 0);
  const modifiers = (item.selectedVariants || []).reduce(
    (sum, v) => sum + toNumber(v.priceModifier, 0),
    0
  );
  return base + modifiers;
}

/** Total de un ítem: precio unitario × cantidad. Si hidePrice es true, no se suma (0). */
function getItemTotalPrice(item: CartItem): number {
  if (item.hidePrice === true) return 0;
  const qty = Math.max(0, typeof item.quantity === 'number' && !Number.isNaN(item.quantity) ? item.quantity : 0);
  return getItemUnitPrice(item) * qty;
}

function generateItemId(productId: string, selectedVariants: CartItem['selectedVariants']): string {
  const variantKey = selectedVariants
    .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
    .map((v) => `${v.attributeId}:${v.variantId}`)
    .join('|');
  
  return `${productId}_${variantKey}`;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity, selectedVariants } = action.payload;
      const itemId = generateItemId(product.id, selectedVariants);

      // Verificar si el item ya existe
      const existingItemIndex = state.cart.items.findIndex((item) => item.id === itemId);
      
      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        // Actualizar cantidad del item existente (recalcular total desde base + variantes)
        newItems = state.cart.items.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            const updatedItem = { ...item, quantity: newQuantity };
            return { ...updatedItem, totalPrice: getItemTotalPrice(updatedItem) };
          }
          return item;
        });
      } else {
        // Normalizar basePrice y priceModifier a número (la API puede devolver string)
        const basePrice = toNumber(product.basePrice, 0);
        const selectedVariantsNormalized = selectedVariants.map((variant) => {
          const attribute = product.attributes?.find((attr) => attr.id === variant.attributeId);
          const variantData = attribute?.variants?.find((v) => v.id === variant.variantId);
          const priceModifier = variant.priceModifier != null
            ? toNumber(variant.priceModifier, 0)
            : toNumber((variantData as { price?: number } | undefined)?.price, 0);
          return {
            ...variant,
            priceModifier,
            variantSku: variantData?.sku,
            variantImage: variantData?.images?.[0],
          };
        });
        const hidePrice = product.hidePrice === true;
        const newItem: CartItem = {
          id: itemId,
          productId: product.id,
          productName: product.name,
          productImage: product.images?.[0] || '',
          productSku: product.sku ?? '',
          basePrice,
          currency: product.currency ?? 'USD',
          quantity,
          selectedVariants: selectedVariantsNormalized,
          totalPrice: 0, // se asigna justo abajo
          hidePrice,
          storeId: product.storeId ?? '',
          storeName: product.storeName ?? 'Tienda',
          storeLogo: product.storeLogo ?? undefined,
          storeInstagram: product.storeInstagram,
          storeTiktok: product.storeTiktok ?? undefined,
          storePhoneNumber: product.storePhoneNumber,
          storeUsers: (product.storeUsers || []).filter((su: StoreUser) =>
            su.phoneNumber && String(su.phoneNumber).trim() !== ''
          ),
        };
        newItem.totalPrice = getItemTotalPrice(newItem);
        newItems = [...state.cart.items, newItem];
      }
      
      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      const newCart: Cart = {
        items: newItems,
        total,
        itemCount,
      };
      
      // Guardar en localStorage y marcar última vez que se agregó algo al carrito
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(newCart));
        localStorage.setItem('atelier-cart-last-added-at', String(Date.now()));
      }
      
      return {
        cart: newCart,
      };
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.cart.items.filter((item) => item.id !== action.payload.itemId);
      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      const newCart: Cart = {
        items: newItems,
        total,
        itemCount,
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(newCart));
      }
      
      return {
        cart: newCart,
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const { itemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { itemId } });
      }
      
      const newItems = state.cart.items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity };
          return { ...updatedItem, totalPrice: getItemTotalPrice(updatedItem) };
        }
        return item;
      });
      
      const total = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      const newCart: Cart = {
        items: newItems,
        total,
        itemCount,
      };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(newCart));
      }
      
      return {
        cart: newCart,
      };
    }
    
    case 'CLEAR_CART': {
      const newCart: Cart = {
        items: [],
        total: 0,
        itemCount: 0,
      };
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
        localStorage.removeItem('atelier-cart-last-added-at');
      }
      
      return {
        cart: newCart,
      };
    }
    
    case 'LOAD_CART': {
      // Normalizar: asegurar basePrice y priceModifier como números (localStorage/API pueden tener strings), luego recalcular totalPrice
      const raw = action.payload.cart;
      if (!raw || !Array.isArray(raw.items) || raw.items.length === 0) {
        return { cart: { items: [], total: 0, itemCount: 0 } };
      }
      const items: CartItem[] = raw.items.map((item: CartItem) => {
        const basePrice = toNumber(item.basePrice, 0);
        const quantity = Math.max(0, toNumber(item.quantity, 0));
        const selectedVariants = (item.selectedVariants || []).map((v) => ({
          ...v,
          priceModifier: toNumber(v.priceModifier, 0),
        }));
        const normalizedItem: CartItem = { ...item, basePrice, quantity, selectedVariants };
        const totalPrice = getItemTotalPrice(normalizedItem);
        return { ...normalizedItem, totalPrice };
      });
      const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      return {
        cart: { items, total, itemCount },
      };
    }
    
    default:
      return state;
  }
}

const initialState: CartState = {
  cart: {
    items: [],
    total: 0,
    itemCount: 0,
  },
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const hasLoadedRef = useRef(false);
  
  // Cargar carrito del localStorage al montar (solo una vez)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        // Validar que el carrito tenga la estructura correcta
        if (parsedCart && Array.isArray(parsedCart.items)) {
          dispatch({ type: 'LOAD_CART', payload: { cart: parsedCart } });
        }
      }
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      hasLoadedRef.current = true;
    }
  }, []); // Solo se ejecuta una vez al montar
  
  const addItem = (product: Product, quantity: number, selectedVariants: CartItem['selectedVariants']) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity, selectedVariants } });
    const basePrice = toNumber(product.basePrice, 0);
    const modifierSum = (selectedVariants || []).reduce((sum, v) => {
      const attr = product.attributes?.find((a) => a.id === v.attributeId);
      const variantData = attr?.variants?.find((vr) => vr.id === v.variantId);
      const mod =
        v.priceModifier != null
          ? toNumber(v.priceModifier, 0)
          : toNumber((variantData as { price?: number } | undefined)?.price, 0);
      return sum + mod;
    }, 0);
    const unitPrice = basePrice + modifierSum;
    trackAddToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      price: unitPrice,
      currency: product.currency ?? 'USD',
      category: product.category,
      storeId: product.storeId,
      storeName: product.storeName ?? undefined,
    });
  };

  const removeItem = (itemId: string) => {
    const item = state.cart.items.find((i) => i.id === itemId);
    if (item) {
      const unitPrice = getItemUnitPrice(item);
      trackRemoveFromCart({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: unitPrice,
        currency: item.currency ?? 'USD',
        storeId: item.storeId,
        storeName: item.storeName,
      });
    }
    dispatch({ type: 'REMOVE_ITEM', payload: { itemId } });
  };
  
  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };
  
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };
  
  const getItemCount = () => {
    return state.cart.itemCount;
  };
  
  const getTotal = () => {
    return state.cart.total;
  };
  
  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemCount,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
