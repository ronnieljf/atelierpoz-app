'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/store/cart-store';

interface AddToCartDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddToCartDialog({ isOpen, onClose }: AddToCartDialogProps) {
  const router = useRouter();
  const { getItemCount } = useCart();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const itemCount = getItemCount();
  const shouldShow = isOpen && itemCount < 2;

  const handleGoToCart = () => {
    onClose();
    router.push('/cart');
  };

  useEffect(() => {
    if (isOpen && itemCount >= 2) {
      onClose();
    }
  }, [isOpen, itemCount, onClose]);

  useEffect(() => {
    if (shouldShow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldShow]);

  if (!mounted) return null;

  const dialogContent = (
    <AnimatePresence>
      {shouldShow && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-neutral-950/70 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm pointer-events-auto rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-600/90 text-white ring-4 ring-primary-500/20">
                    <Check className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-lg font-semibold text-neutral-100 mb-1.5">
                    Añadido al carrito
                  </h2>
                  <p className="text-sm text-neutral-400 mb-6 max-w-[260px]">
                    El producto se ha añadido correctamente. Puedes seguir comprando o ir al carrito para finalizar.
                  </p>
                  <div className="flex w-full flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleGoToCart}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-500 active:bg-primary-700 transition-colors"
                    >
                      Ver carrito
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-xl border border-neutral-600 bg-transparent px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800/80 hover:text-neutral-100 transition-colors"
                    >
                      Seguir comprando
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
}
