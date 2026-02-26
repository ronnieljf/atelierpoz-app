'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/store/auth-store';
import { type Dictionary } from '@/lib/i18n/dictionary';
import { trackFirstVisitCreateAccountClick } from '@/lib/analytics/gtag';
import { cn } from '@/lib/utils/cn';

const STORAGE_KEY = 'atelier_first_visit_seen';

/** Rutas que no son tienda pública: no mostrar el diálogo. */
const RESERVED_SEGMENTS = [
  'admin',
  'cart',
  'products',
  'registro',
  'recuperar-contrasena',
  'terms-of-service',
  'terminos-y-condiciones',
  'privacy-policy',
  'politica-de-privacidad',
];

function isStorePage(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;
  return !RESERVED_SEGMENTS.includes(segments[0]);
}

interface FirstVisitDialogProps {
  dict: Dictionary;
  pathname: string;
}

export function FirstVisitDialog({ dict, pathname }: FirstVisitDialogProps) {
  const { state: authState } = useAuth();
  const [{ showDialog, variantIndex }, setDialogState] = useState({ showDialog: false, variantIndex: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authState.authHydrated || authState.isAuthenticated) return;
    if (!isStorePage(pathname)) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen === '1') return;
    const variantIndex = Math.floor(Math.random() * 3);
    const id = requestAnimationFrame(() => {
      setDialogState({ showDialog: true, variantIndex });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, authState.authHydrated, authState.isAuthenticated]);

  const markSeen = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setDialogState((prev) => ({ ...prev, showDialog: false }));
  };

  const handleContinue = () => {
    markSeen();
  };

  type FirstVisit = {
    createAccount?: string;
    continueBrowsing?: string;
    variants?: Array<{ title?: string; description?: string }>;
  };
  const fv = (dict as Record<string, unknown>).firstVisit as FirstVisit | undefined;
  const variants = fv?.variants ?? [];
  const safeIndex = Math.min(Math.max(0, variantIndex), Math.max(0, variants.length - 1));
  const variant = variants[safeIndex];
  const title = variant?.title ?? '¿Pasas horas escribiendo «¿me pagas?» por WhatsApp?';
  const description = variant?.description ?? 'Deja de perseguir pagos a mano. Lleva tus cuentas por cobrar en orden y envía recordatorios automáticos desde tu tienda.';
  const createAccount = fv?.createAccount ?? 'Crear mi tienda';
  const continueBrowsing = fv?.continueBrowsing ?? 'Solo estoy mirando';

  const handleCreateAccountClick = () => {
    trackFirstVisitCreateAccountClick(safeIndex + 1);
    markSeen();
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-neutral-950/70 backdrop-blur-md"
          onClick={handleContinue}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-sm md:max-w-md rounded-xl sm:rounded-2xl border border-neutral-700/50 bg-neutral-900/95 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] overflow-hidden max-h-[85dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 sm:p-6 md:p-8 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <div className="mb-4 sm:mb-5 flex justify-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="text-center text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-neutral-100 mb-1.5 sm:mb-2 px-1">
              {title}
            </h2>
            <p className="text-center text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-[280px] mx-auto mb-5 sm:mb-6 px-1">
              {description}
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleContinue}
                className={cn(
                  'flex-1 min-h-[44px] sm:min-h-0 rounded-xl px-4 py-3 sm:py-3 text-sm font-medium transition-colors duration-200',
                  'flex items-center justify-center gap-2 touch-manipulation',
                  'border border-neutral-600 bg-transparent text-neutral-400',
                  'hover:border-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300',
                  'active:bg-neutral-800'
                )}
              >
                <span>{continueBrowsing}</span>
              </button>
              <Link
                href="/registro"
                onClick={handleCreateAccountClick}
                className={cn(
                  'flex-1 min-h-[44px] sm:min-h-0 rounded-xl px-4 py-3 sm:py-3 text-sm font-medium transition-all duration-200',
                  'flex items-center justify-center gap-2 touch-manipulation',
                  'bg-primary-500 text-white border border-primary-500/50',
                  'hover:bg-primary-400 hover:border-primary-400/50',
                  'active:bg-primary-600'
                )}
              >
                <UserPlus className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                <span>{createAccount}</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
