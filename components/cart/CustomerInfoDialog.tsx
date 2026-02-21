'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Check, Sparkles, Store, Truck, MapPin, Clock, MessageSquare, ChevronLeft } from 'lucide-react';
import phoneCountries from '@/constants/phoneCountries.json';
import { cn } from '@/lib/utils/cn';
import { type DeliveryMethod } from '@/lib/services/requests';

const DEFAULT_COUNTRY_CODE = '+58';

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

export interface CustomerInfo {
  customerName?: string;
  customerPhone?: string;
}

export interface DeliveryInfo {
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  deliveryReference?: string;
  deliveryRecipientName?: string;
  deliveryRecipientPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryNotes?: string;
}

interface CustomerInfoDialogProps {
  isOpen: boolean;
  existingCustomer?: CustomerInfo | null;
  onConfirm: (customerInfo: CustomerInfo, deliveryInfo: DeliveryInfo) => void;
  onCancel: () => void;
}

type Step = 'identity' | 'info' | 'delivery';

const inputCls = "w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:border-primary-500/50 focus:ring-primary-500/20 transition-all duration-200 text-sm sm:text-base min-w-0";
const inputErrCls = "border-red-500/60 focus:border-red-500/50 focus:ring-red-500/20";
const labelCls = "block text-xs sm:text-sm font-medium text-neutral-300 mb-1.5 sm:mb-2";

export function CustomerInfoDialog({
  isOpen,
  existingCustomer,
  onConfirm,
  onCancel
}: CustomerInfoDialogProps) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const [step, setStep] = useState<Step>('info');
  const [customerName, setCustomerName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Delivery state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhoneCode, setRecipientPhoneCode] = useState(DEFAULT_COUNTRY_CODE);
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState('');
  const [useSamePhone, setUseSamePhone] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Saved customer info between steps
  const [savedCustomerInfo, setSavedCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (existingCustomer) {
        setStep('identity');
        setCustomerName(existingCustomer.customerName || '');
        const parsed = parseStoredPhone(existingCustomer.customerPhone, phoneCountries);
        setPhoneCountryCode(parsed.code);
        setPhoneNumber(parsed.number);
      } else {
        setStep('info');
        setCustomerName('');
        setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
        setPhoneNumber('');
      }
      setErrors({});
      setDeliveryMethod('pickup');
      setDeliveryAddress('');
      setDeliveryReference('');
      setRecipientName('');
      setRecipientPhoneCode(DEFAULT_COUNTRY_CODE);
      setRecipientPhoneNumber('');
      setUseSamePhone(true);
      setDeliveryDate('');
      setDeliveryTime('');
      setDeliveryNotes('');
      setSavedCustomerInfo(null);
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, existingCustomer]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const buildCustomerInfo = (): CustomerInfo | null => {
    const nameTrimmed = customerName.trim();
    const digits = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    const fullPhone = digits.length > 0 ? phoneCountryCode + digits : undefined;

    const newErrors: Record<string, string> = {};
    if (!nameTrimmed) newErrors.name = 'El nombre es obligatorio';
    if (!fullPhone || digits.length < 7) newErrors.phone = 'El teléfono es obligatorio';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }
    return { customerName: nameTrimmed, customerPhone: fullPhone } as CustomerInfo;
  };

  const handleInfoSubmit = () => {
    setErrors({});
    const info = buildCustomerInfo();
    if (!info) return;
    setSavedCustomerInfo(info);
    setStep('delivery');
  };

  const handleConfirmIdentity = () => {
    if (existingCustomer) {
      setSavedCustomerInfo(existingCustomer);
      setStep('delivery');
    }
  };

  const handleNotThisPerson = () => {
    setStep('info');
    setCustomerName('');
    setPhoneCountryCode(DEFAULT_COUNTRY_CODE);
    setPhoneNumber('');
  };

  const handleDeliverySubmit = () => {
    setErrors({});
    const info = savedCustomerInfo;
    if (!info) return;

    if (deliveryMethod === 'delivery') {
      const newErrors: Record<string, string> = {};
      if (!deliveryAddress.trim()) newErrors.address = 'La dirección es obligatoria';
      if (!recipientName.trim()) newErrors.recipientName = 'El nombre de quien recibe es obligatorio';

      if (!useSamePhone) {
        const digits = recipientPhoneNumber.replace(/\D/g, '').replace(/^0+/, '');
        if (digits.length < 7) newErrors.recipientPhone = 'El teléfono de quien recibe es obligatorio';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    let recipientFullPhone: string | undefined;
    if (deliveryMethod === 'delivery') {
      if (useSamePhone) {
        recipientFullPhone = info.customerPhone;
      } else {
        const digits = recipientPhoneNumber.replace(/\D/g, '').replace(/^0+/, '');
        recipientFullPhone = digits.length > 0 ? recipientPhoneCode + digits : undefined;
      }
    }

    const delivery: DeliveryInfo = {
      deliveryMethod,
      ...(deliveryMethod === 'delivery' ? {
        deliveryAddress: deliveryAddress.trim(),
        deliveryReference: deliveryReference.trim() || undefined,
        deliveryRecipientName: recipientName.trim(),
        deliveryRecipientPhone: recipientFullPhone,
        deliveryDate: deliveryDate || undefined,
        deliveryTime: deliveryTime || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
      } : {}),
    };

    onConfirm(info, delivery);
  };

  if (!mounted) return null;

  const minDate = new Date().toISOString().split('T')[0];

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-[9999]"
            onClick={onCancel}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md pointer-events-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-neutral-900/95 to-neutral-900/95 rounded-2xl sm:rounded-3xl blur-xl" />

              <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-neutral-900/95 via-neutral-800/95 to-neutral-900/95 backdrop-blur-xl border border-primary-500/30 shadow-2xl overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent opacity-50" />

                <div className="relative p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
                  <button
                    onClick={onCancel}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 active:bg-neutral-800/70 transition-all duration-200 touch-manipulation z-10"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <AnimatePresence mode="wait">
                    {step === 'identity' && (
                      <motion.div key="identity" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                        <div className="flex justify-center mb-4 sm:mb-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-3 sm:border-4 border-primary-400/30 shadow-lg">
                              <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={2.5} />
                            </div>
                            <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 text-primary-400 animate-pulse" />
                          </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 leading-tight px-2">
                          ¿Eres tú? 👋
                        </h2>

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
                                  <p className="text-sm sm:text-base font-medium text-neutral-200 truncate">{existingCustomer.customerName}</p>
                                </div>
                              </div>
                            )}
                            {existingCustomer?.customerPhone && (
                              <div className="flex items-center gap-2 sm:gap-3">
                                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm text-neutral-400">Teléfono</p>
                                  <p className="text-sm sm:text-base font-medium text-neutral-200 truncate">{existingCustomer.customerPhone}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-0">
                          <button onClick={handleNotThisPerson} className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50 active:bg-neutral-700/60 hover:border-neutral-600/50 hover:text-neutral-100 transition-all duration-200 font-medium text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] sm:min-h-[48px]">
                            No, soy otra persona
                          </button>
                          <button onClick={handleConfirmIdentity} className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500/50 text-white hover:from-primary-500 hover:to-primary-600 active:from-primary-700 active:to-primary-800 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 group touch-manipulation min-h-[44px] sm:min-h-[48px]">
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <span>Sí, soy yo</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 'info' && (
                      <motion.div key="info" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                        <div className="flex justify-center mb-4 sm:mb-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-3 sm:border-4 border-primary-400/30 shadow-lg">
                              <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" strokeWidth={2.5} />
                            </div>
                            <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 text-primary-400 animate-pulse" />
                          </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 leading-tight px-2">
                          ¡Bienvenido! 👋
                        </h2>

                        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5 md:mb-6">
                          <p className="text-sm sm:text-base text-neutral-200 leading-relaxed text-center px-1">
                            Ingresa tus datos para procesar tu pedido.
                          </p>

                          <div className="bg-gradient-to-br from-primary-900/30 via-neutral-800/60 to-neutral-800/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-primary-500/30 shadow-lg">
                            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-3 sm:mb-4">
                              <span className="font-semibold text-primary-400">Nombre y teléfono son obligatorios</span> para procesar tu pedido y que la tienda pueda contactarte.
                            </p>

                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <label className={labelCls}>
                                  <User className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                  Nombre <span className="text-primary-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={customerName}
                                  onChange={(e) => { setCustomerName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }}
                                  placeholder="Tu nombre"
                                  required
                                  className={cn(inputCls, errors.name && inputErrCls)}
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                              </div>

                              <div className="space-y-3 sm:space-y-4">
                                <div>
                                  <label className={labelCls}>
                                    <Phone className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                    Teléfono <span className="text-primary-400">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => { setPhoneNumber(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })); }}
                                    placeholder="412 1234567"
                                    required
                                    className={cn(inputCls, errors.phone && inputErrCls)}
                                  />
                                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                                </div>
                                <div>
                                  <label className={labelCls}>País</label>
                                  <select
                                    value={phoneCountryCode}
                                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                                    className={inputCls}
                                    aria-label="País"
                                  >
                                    {phoneCountries.map(({ code, country }) => (
                                      <option key={code} value={code} className="bg-neutral-800 text-neutral-100">{code} {country}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 sm:pt-0">
                          <button onClick={handleInfoSubmit} className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500/50 text-white hover:from-primary-500 hover:to-primary-600 active:from-primary-700 active:to-primary-800 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 group touch-manipulation min-h-[44px] sm:min-h-[48px]">
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <span>Continuar</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {step === 'delivery' && (
                      <motion.div key="delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        <button
                          onClick={() => {
                            setErrors({});
                            setStep(existingCustomer && savedCustomerInfo === existingCustomer ? 'identity' : 'info');
                          }}
                          className="flex items-center gap-1 text-xs sm:text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-4 touch-manipulation"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Volver
                        </button>

                        <div className="flex justify-center mb-4 sm:mb-5">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-3 sm:border-4 border-primary-400/30 shadow-lg">
                              <Truck className="h-7 w-7 sm:h-8 sm:w-8 text-white" strokeWidth={2} />
                            </div>
                          </div>
                        </div>

                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-3 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-primary-300 to-neutral-100 leading-tight px-2">
                          ¿Cómo quieres recibir tu pedido?
                        </h2>

                        {/* Method toggle */}
                        <div className="grid grid-cols-2 gap-3 mb-4 sm:mb-5">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('pickup')}
                            className={cn(
                              'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation',
                              deliveryMethod === 'pickup'
                                ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                                : 'border-neutral-700/50 bg-neutral-800/30 text-neutral-400 hover:border-neutral-600'
                            )}
                          >
                            <Store className="h-6 w-6 sm:h-7 sm:w-7" />
                            <span className="text-xs sm:text-sm font-medium">Retiro en tienda</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('delivery')}
                            className={cn(
                              'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 touch-manipulation',
                              deliveryMethod === 'delivery'
                                ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                                : 'border-neutral-700/50 bg-neutral-800/30 text-neutral-400 hover:border-neutral-600'
                            )}
                          >
                            <Truck className="h-6 w-6 sm:h-7 sm:w-7" />
                            <span className="text-xs sm:text-sm font-medium">Delivery / Envío</span>
                          </button>
                        </div>

                        {deliveryMethod === 'pickup' && (
                          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 sm:p-4 mb-4">
                            <p className="text-xs sm:text-sm text-green-300 text-center">
                              Perfecto, la tienda te indicará la dirección y horario para retirar tu pedido.
                            </p>
                          </div>
                        )}

                        {deliveryMethod === 'delivery' && (
                          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                              <p className="text-xs sm:text-sm text-amber-300/90">
                                Completa los datos del envío para que la tienda pueda coordinar la entrega.
                              </p>
                            </div>

                            {/* Dirección */}
                            <div>
                              <label className={labelCls}>
                                <MapPin className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Dirección <span className="text-primary-400">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryAddress}
                                onChange={(e) => { setDeliveryAddress(e.target.value); setErrors(p => ({ ...p, address: undefined })); }}
                                placeholder="Calle, número, urbanización, ciudad..."
                                className={cn(inputCls, errors.address && inputErrCls)}
                              />
                              {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
                            </div>

                            {/* Punto de referencia */}
                            <div>
                              <label className={labelCls}>
                                <MapPin className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Punto de referencia
                              </label>
                              <input
                                type="text"
                                value={deliveryReference}
                                onChange={(e) => setDeliveryReference(e.target.value)}
                                placeholder="Ej: al lado de la farmacia, frente a..."
                                className={inputCls}
                              />
                            </div>

                            {/* Nombre de quien recibe */}
                            <div>
                              <label className={labelCls}>
                                <User className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Nombre de quien recibe <span className="text-primary-400">*</span>
                              </label>
                              <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => { setRecipientName(e.target.value); setErrors(p => ({ ...p, recipientName: undefined })); }}
                                placeholder="Nombre completo"
                                className={cn(inputCls, errors.recipientName && inputErrCls)}
                              />
                              {errors.recipientName && <p className="mt-1 text-xs text-red-400">{errors.recipientName}</p>}
                            </div>

                            {/* Teléfono de quien recibe */}
                            <div>
                              <label className={labelCls}>
                                <Phone className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Teléfono de quien recibe
                              </label>
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() => setUseSamePhone(true)}
                                  className={cn(
                                    'flex-1 text-xs sm:text-sm py-1.5 sm:py-2 rounded-lg border transition-all touch-manipulation',
                                    useSamePhone
                                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-300 font-medium'
                                      : 'border-neutral-700/50 bg-neutral-800/30 text-neutral-400'
                                  )}
                                >
                                  Mismo teléfono
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUseSamePhone(false)}
                                  className={cn(
                                    'flex-1 text-xs sm:text-sm py-1.5 sm:py-2 rounded-lg border transition-all touch-manipulation',
                                    !useSamePhone
                                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-300 font-medium'
                                      : 'border-neutral-700/50 bg-neutral-800/30 text-neutral-400'
                                  )}
                                >
                                  Otro teléfono
                                </button>
                              </div>
                              {useSamePhone && (
                                <p className="text-xs text-neutral-500">
                                  Se usará el teléfono: {savedCustomerInfo?.customerPhone || '(tu número)'}
                                </p>
                              )}
                              {!useSamePhone && (
                                <div className="space-y-2">
                                  <input
                                    type="tel"
                                    value={recipientPhoneNumber}
                                    onChange={(e) => { setRecipientPhoneNumber(e.target.value); setErrors(p => ({ ...p, recipientPhone: undefined })); }}
                                    placeholder="412 1234567"
                                    className={cn(inputCls, errors.recipientPhone && inputErrCls)}
                                  />
                                  {errors.recipientPhone && <p className="mt-1 text-xs text-red-400">{errors.recipientPhone}</p>}
                                  <select
                                    value={recipientPhoneCode}
                                    onChange={(e) => setRecipientPhoneCode(e.target.value)}
                                    className={inputCls}
                                    aria-label="País"
                                  >
                                    {phoneCountries.map(({ code, country }) => (
                                      <option key={code} value={code} className="bg-neutral-800 text-neutral-100">{code} {country}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* Fecha y hora */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className={labelCls}>
                                  <Clock className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                  Fecha de entrega
                                </label>
                                <input
                                  type="date"
                                  value={deliveryDate}
                                  onChange={(e) => setDeliveryDate(e.target.value)}
                                  min={minDate}
                                  className={cn(inputCls, 'appearance-none')}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>
                                  <Clock className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                  Hora preferida
                                </label>
                                <input
                                  type="time"
                                  value={deliveryTime}
                                  onChange={(e) => setDeliveryTime(e.target.value)}
                                  className={cn(inputCls, 'appearance-none')}
                                />
                              </div>
                            </div>

                            {/* Nota / Dedicatoria */}
                            <div>
                              <label className={labelCls}>
                                <MessageSquare className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 align-middle" />
                                Nota o dedicatoria
                              </label>
                              <textarea
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                placeholder="Ej: una dedicatoria, instrucciones especiales..."
                                rows={3}
                                className={cn(inputCls, 'resize-none')}
                              />
                            </div>
                          </div>
                        )}

                        <div className="pt-2 sm:pt-0">
                          <button onClick={handleDeliverySubmit} className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500/50 text-white hover:from-primary-500 hover:to-primary-600 active:from-primary-700 active:to-primary-800 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 group touch-manipulation min-h-[44px] sm:min-h-[48px]">
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <span>Enviar pedido</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
