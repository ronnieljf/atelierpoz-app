'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Loader2 } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { cn } from '@/lib/utils/cn';

export interface OnboardingSurveyData {
  business_type: string;
  business_size: string;
  product_line: string;
  age: string;
}

const BUSINESS_TYPES = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'tienda_fisica', label: 'Tienda física' },
  { value: 'online', label: 'Solo online' },
  { value: 'ambos', label: 'Tienda física y online' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'otro', label: 'Otro' },
];

const BUSINESS_SIZES = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'solo_yo', label: 'Solo yo' },
  { value: 'micro', label: 'Micro (1-5 personas)' },
  { value: 'pequeno', label: 'Pequeño (6-20 personas)' },
  { value: 'mediano', label: 'Mediano (21-50 personas)' },
  { value: 'otro', label: 'Otro' },
];

interface OnboardingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function OnboardingSurveyModal({ isOpen, onClose, onSaved }: OnboardingSurveyModalProps) {
  const [business_type, setBusiness_type] = useState('');
  const [business_size, setBusiness_size] = useState('');
  const [product_line, setProduct_line] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ageNum = age.trim() ? parseInt(age.trim(), 10) : undefined;
    if (age.trim() && (ageNum == null || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120)) {
      setError('Edad debe ser un número entre 1 y 120.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await httpClient.post<{ success?: boolean; survey?: unknown }>(
        '/api/auth/onboarding-survey',
        {
          business_type: business_type.trim() || undefined,
          business_size: business_size.trim() || undefined,
          product_line: product_line.trim() || undefined,
          age: ageNum,
        }
      );
      if (res.success) {
        onSaved();
        onClose();
      } else {
        setError((res as { error?: string }).error || 'Error al guardar.');
      }
    } catch (err) {
      console.error('Error guardando encuesta:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 min-h-[100dvh] box-border"
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
          className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-xl sm:rounded-2xl border border-neutral-700/50 bg-neutral-900/95 shadow-xl overflow-hidden max-h-[90dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 sm:p-6 md:p-8 overflow-y-auto">
            <div className="mb-5 flex justify-center">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary-600/20 border border-primary-500/30">
                <Store className="h-6 w-6 sm:h-7 sm:w-7 text-primary-400" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-center text-lg sm:text-xl font-semibold text-neutral-100 mb-1">
              Cuéntanos sobre tu negocio
            </h2>
            <p className="text-center text-sm text-neutral-400 mb-5">
              Así podemos mejorar tu experiencia (opcional).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="onboarding-business_type" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Tipo de negocio
                </label>
                <select
                  id="onboarding-business_type"
                  value={business_type}
                  onChange={(e) => setBusiness_type(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
                >
                  {BUSINESS_TYPES.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="onboarding-business_size" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Tamaño del negocio
                </label>
                <select
                  id="onboarding-business_size"
                  value={business_size}
                  onChange={(e) => setBusiness_size(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
                >
                  {BUSINESS_SIZES.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="onboarding-product_line" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  ¿Qué productos o línea vendes?
                </label>
                <textarea
                  id="onboarding-product_line"
                  value={product_line}
                  onChange={(e) => setProduct_line(e.target.value)}
                  placeholder="Ej: ropa, joyería, repostería..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm resize-none"
                />
              </div>

              <div>
                <label htmlFor="onboarding-age" className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Tu edad
                </label>
                <input
                  id="onboarding-age"
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="Ej: 28"
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-neutral-600 bg-transparent text-neutral-400 text-sm font-medium hover:bg-neutral-800/50 transition-colors"
                >
                  Omitir
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-medium transition-colors',
                    'bg-primary-500 text-white border border-primary-500/50 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
