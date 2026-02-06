'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/store/cart-store';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const CART_LAST_ADDED_KEY = 'atelier-cart-last-added-at';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface CartRestoreDialogProps {
  dict: Dictionary;
}

export function CartRestoreDialog({ dict }: CartRestoreDialogProps) {
  const { state, clearCart } = useCart();
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const { cart } = state;

  // Ejecutar cada vez que el usuario entra a la app (el componente se monta en el layout público)
  useEffect(() => {
    if (hasChecked) return;

    const checkCart = setTimeout(() => {
      const hasItemsInCart = cart.items.length > 0;
      if (!hasItemsInCart) {
        setHasChecked(true);
        return;
      }

      const lastAddedRaw = typeof window !== 'undefined' ? localStorage.getItem(CART_LAST_ADDED_KEY) : null;
      const now = Date.now();
      // Si no hay timestamp (carrito de sesión anterior antigua), considerar que pasaron más de 24h
      const lastAddedAt = lastAddedRaw != null ? parseInt(lastAddedRaw, 10) : 0;
      const elapsed = Number.isNaN(lastAddedAt) ? TWENTY_FOUR_HOURS_MS + 1 : now - lastAddedAt;
      const shouldShow = elapsed >= TWENTY_FOUR_HOURS_MS;

      if (shouldShow) {
        setShowDialog(true);
      }
      setHasChecked(true);
    }, 500);

    return () => clearTimeout(checkCart);
  }, [cart.items.length, hasChecked]);

  const handleClearCart = () => {
    clearCart();
    setShowDialog(false);
  };

  const handleContinue = () => {
    setShowDialog(false);
  };

  if (!showDialog) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 md:p-6 min-h-[100dvh] box-border"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-neutral-950/70 backdrop-blur-md"
          onClick={handleContinue}
        />

        {/* Dialog: scroll en pantallas muy pequeñas, ancho responsivo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-sm md:max-w-md rounded-xl sm:rounded-2xl border border-neutral-700/50 bg-neutral-900/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] overflow-hidden max-h-[85dvh] flex flex-col"
        >
          {/* Contenido con scroll si hace falta */}
          <div className="p-5 sm:p-6 md:p-8 overflow-y-auto overscroll-contain flex-1 min-h-0">
            {/* Icono */}
            <div className="mb-4 sm:mb-5 flex justify-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-neutral-800/80 border border-neutral-700/50">
                <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="text-center text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-neutral-100 mb-1.5 sm:mb-2 px-1">
              {dict.cart.restoreTitle || 'Carrito encontrado'}
            </h2>
            <p className="text-center text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-[280px] mx-auto mb-5 sm:mb-6 px-1">
              {dict.cart.restoreDescription}
            </p>

            {/* Botones: columna en móvil, fila en sm+; altura táctil en móvil */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleClearCart}
                className={cn(
                  'flex-1 min-h-[44px] sm:min-h-0 rounded-xl px-4 py-3 sm:py-3 text-sm font-medium transition-colors duration-200',
                  'flex items-center justify-center gap-2 touch-manipulation',
                  'border border-neutral-600 bg-transparent text-neutral-400',
                  'hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400',
                  'active:bg-red-500/10'
                )}
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                <span>{dict.cart.clearCart || 'Vaciar Carrito'}</span>
              </button>
              <button
                onClick={handleContinue}
                className={cn(
                  'flex-1 min-h-[44px] sm:min-h-0 rounded-xl px-4 py-3 sm:py-3 text-sm font-medium transition-all duration-200',
                  'flex items-center justify-center gap-2 touch-manipulation',
                  'bg-primary-500 text-white border border-primary-500/50',
                  'hover:bg-primary-400 hover:border-primary-400/50',
                  'active:bg-primary-600'
                )}
              >
                <ShoppingBag className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                <span>{dict.cart.continueWithCart || 'Continuar'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
