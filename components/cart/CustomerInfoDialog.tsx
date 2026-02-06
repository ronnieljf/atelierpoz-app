'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Check, Sparkles } from 'lucide-react';
import phoneCountries from '@/constants/phoneCountries.json';

const DEFAULT_COUNTRY_CODE = '+58';

/** Parsea un teléfono guardado (ej. +584121234567) en código y número local */
function parseStoredPhone(
  full: string | undefined,
  countries: { code: string }[]
): { code: string; number: string } {
  if (!full || !full.trim()) return { code: DEFAULT_COUNTRY_CODE, number: '' };
  const digitsOnly = full.replace(/\D/g, '');
  if (!digitsOnly) return { code: DEFAULT_COUNTRY_CODE, number: '' };
  const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
  const codeDigits = (c: string) => c.replace('+', '');
  for (const { code } of sorted) {
    const prefix = codeDigits(code);
    if (digitsOnly.startsWith(prefix)) {
      return { code, number: digitsOnly.slice(prefix.length) };
    }
  }
  return { code: DEFAULT_COUNTRY_CODE, number: digitsOnly };
}

interface CustomerInfo {
  customerName?: string;
  customerPhone?: string;
}

interface CustomerInfoDialogProps {
  isOpen: boolean;
  existingCustomer?: CustomerInfo | null;
  onConfirm: (customerInfo: CustomerInfo) => void;
  onCancel: () => void;
}

export function CustomerInfoDialog({ 
  isOpen, 
  existingCustomer,
  onConfirm, 
  onCancel 
}: CustomerInfoDialogProps) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [customerName, setCustomerName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isConfirmingIdentity, setIsConfirmingIdentity] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (existingCustomer) {
        setIsConfirmingIdentity(true);
        setCustomerName(existingCustomer.customerName || '');
        const parsed = parseStoredPhone(existingCustomer.customerPhone, phoneCountries);
        setPhoneCountryCode(parsed.code);
        setPhoneNumber(parsed.number);
      } else {
        setIsConfirmingIdentity(false);
        setCustomerName('');
        setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
        setPhoneNumber('');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, existingCustomer]);

  // Prevenir scroll del body cuando el diálogo está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = () => {
    const digits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    const fullPhone =
      digits.length > 0 ? phoneCountryCode + digits : undefined;
    const customerInfo: CustomerInfo = {
      customerName: customerName.trim() || undefined,
      customerPhone: fullPhone,
    };
    onConfirm(customerInfo);
  };

  const handleConfirmIdentity = () => {
    if (existingCustomer) {
      onConfirm(existingCustomer);
    }
  };

  const handleNotThisPerson = () => {
    setIsConfirmingIdentity(false);
    setCustomerName('');
    setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
    setPhoneNumber('');
  };

  if (!mounted) return null;

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[9999]"
            onClick={onCancel}
          />
          
          {/* Diálogo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md pointer-events-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col">
              {/* Fondo con gradiente y efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-neutral-900/95 to-neutral-900/95 rounded-2xl sm:rounded-3xl blur-xl" />
              
              {/* Contenedor principal */}
              <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-neutral-900/95 via-neutral-800/95 to-neutral-900/95 backdrop-blur-xl border border-primary-500/30 shadow-2xl overflow-hidden flex flex-col">
                {/* Efecto de brillo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent opacity-50" />
                
                {/* Contenido - Scrollable en móvil si es necesario */}
                <div className="relative p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
                  {/* Botón cerrar */}
                  <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 active:bg-neutral-800/70 transition-all duration-200 touch-manipulation z-10"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  {isConfirmingIdentity ? (
                    /* Diálogo de confirmación de identidad */
                    <>
                      {/* Icono */}
                      <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-3 sm:border-4 border-primary-400/30 shadow-lg">
                            <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={2.5} />
                          </div>
                          <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 text-primary-400 animate-pulse" />
                        </div>
                      </div>
                      
                      {/* Título */}
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 leading-tight px-2">
                        ¿Eres tú? 👋
                      </h2>
                      
                      {/* Información del cliente */}
                      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5 md:mb-6">
                        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed text-center px-1">
                          Encontramos información de una compra anterior. ¿Eres esta persona?
                        </p>
                        
                        <div className="bg-gradient-to-br from-primary-900/30 via-neutral-800/60 to-neutral-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-primary-500/30 shadow-lg space-y-2 sm:space-y-3">
                          {existingCustomer?.customerName && (
                            <div className="flex items-center gap-2 sm:gap-3">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-neutral-400">Nombre</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-200 truncate">
                                  {existingCustomer.customerName}
                                </p>
                              </div>
                            </div>
                          )}
                          {existingCustomer?.customerPhone && (
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-neutral-400">Teléfono</p>
                                <p className="text-sm sm:text-base font-medium text-neutral-200 truncate">
                                  {existingCustomer.customerPhone}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botones */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-0">
                        <button
                          onClick={handleNotThisPerson}
                          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50 active:bg-neutral-700/60 hover:border-neutral-600/50 hover:text-neutral-100 transition-all duration-200 font-medium text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] sm:min-h-[48px]"
                        >
                          No, soy otra persona
                        </button>
                        <button
                          onClick={handleConfirmIdentity}
                          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500/50 text-white hover:from-primary-500 hover:to-primary-600 active:from-primary-700 active:to-primary-800 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 group touch-manipulation min-h-[44px] sm:min-h-[48px]"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span>Sí, soy yo</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Diálogo para pedir datos del cliente */
                    <>
                      {/* Icono */}
                      <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-3 sm:border-4 border-primary-400/30 shadow-lg">
                            <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={2.5} />
                          </div>
                          <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 text-primary-400 animate-pulse" />
                        </div>
                      </div>
                      
                      {/* Título */}
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 leading-tight px-2">
                        ¡Bienvenido! 👋
                      </h2>
                      
                      {/* Mensaje principal */}
                      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5 md:mb-6">
                        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed text-center px-1">
                          Parece que es la primera vez que realizas un pedido con nosotros. Nos encantaría conocerte mejor para brindarte un mejor servicio.
                        </p>
                        
                        <div className="bg-gradient-to-br from-primary-900/30 via-neutral-800/60 to-neutral-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-primary-500/30 shadow-lg">
                          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-3 sm:mb-4">
                            <span className="font-semibold text-primary-400">Los siguientes datos son opcionales</span>, pero si los compartes, los guardaremos para que tus próximas compras sean más rápidas y personalizadas.
                          </p>
                          
                          {/* Campos del formulario */}
                          <div className="space-y-3 sm:space-y-4">
                            {/* Nombre */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5 sm:mb-2">
                                <User className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Nombre (opcional)
                              </label>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Tu nombre"
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 text-sm sm:text-base"
                              />
                            </div>
                            
                            {/* Teléfono: primero número, luego selector de país */}
                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5 sm:mb-2">
                                  <Phone className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                  Teléfono (opcional)
                                </label>
                                <input
                                  type="tel"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  placeholder="412 1234567"
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 text-sm sm:text-base"
                                />
                              </div>
                              <div>
                                <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5 sm:mb-2">
                                  País
                                </label>
                                <select
                                  value={phoneCountryCode}
                                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-100 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 text-sm sm:text-base"
                                  aria-label="País"
                                >
                                  {phoneCountries.map(({ code, country }) => (
                                    <option key={code} value={code} className="bg-neutral-800 text-neutral-100">
                                      {code} {country}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-neutral-400 text-center leading-relaxed px-1">
                          Puedes omitir estos campos si prefieres. Tu pedido se procesará de todas formas.
                        </p>
                      </div>
                      
                      {/* Botón */}
                      <div className="pt-2 sm:pt-0">
                        <button
                          onClick={handleSubmit}
                          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500/50 text-white hover:from-primary-500 hover:to-primary-600 active:from-primary-700 active:to-primary-800 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 group touch-manipulation min-h-[44px] sm:min-h-[48px]"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span>Continuar</span>
                        </button>
                      </div>
                    </>
                  )}
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
