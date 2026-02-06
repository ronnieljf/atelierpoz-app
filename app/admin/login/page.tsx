'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth-store';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';

// Por ahora usamos español por defecto para el admin
const dict = getDictionary('es');

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const LOGIN_TIMEOUT_MS = 15000;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setIsLoading(true);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), LOGIN_TIMEOUT_MS);
    });

    try {
      const success = await Promise.race([
        login(email, password),
        timeoutPromise,
      ]);
      
      if (success) {
        router.push('/admin/products');
      } else {
        setError(dict.admin.login.error);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error en login:', err);
      const isTimeout = err instanceof Error && err.message === 'timeout';
      setError(
        isTimeout
          ? 'La conexión está tardando mucho. Revisa tu internet e intenta de nuevo.'
          : err instanceof Error
            ? err.message
            : 'Error de conexión. Por favor, intenta de nuevo.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-8 sm:py-12">
      {/* Efectos de fondo decorativos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-800/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <PageTransition>
        <div className="w-full max-w-md mx-auto px-0 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Card principal */}
            <div className="relative bg-gradient-to-br from-neutral-900/95 via-neutral-900/90 to-neutral-800/95 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-8 sm:p-10 shadow-2xl overflow-hidden">
              {/* Efecto de brillo sutil */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000" />
              
              {/* Contenido */}
              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center mb-6">
                    <div className="relative">
                      {/* Efecto de brillo animado detrás del icono */}
                      <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                      {/* Icono de candado mejorado */}
                      <div className="relative bg-gradient-to-br from-primary-600/30 via-primary-700/20 to-primary-800/30 rounded-2xl p-4 sm:p-5 border border-primary-500/20 shadow-lg">
                        <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-primary-400 drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-light text-neutral-100 mb-2 tracking-tight">
                    {dict.admin.login.title}
                  </h1>
                  <p className="text-neutral-400 text-sm sm:text-base">
                    Panel de Administración
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm backdrop-blur-sm"
                    >
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="flex-1">{error}</span>
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-neutral-300 mb-2.5"
                      >
                        {dict.admin.login.email}
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 group-focus-within:text-primary-400 transition-colors" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={dict.admin.login.emailPlaceholder}
                          required
                          className="w-full pl-12 pr-4 py-3.5 bg-neutral-800/60 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200 hover:border-neutral-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-neutral-300 mb-2.5"
                      >
                        {dict.admin.login.password}
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500 group-focus-within:text-primary-400 transition-colors" />
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={dict.admin.login.passwordPlaceholder}
                          required
                          className="w-full pl-12 pr-4 py-3.5 bg-neutral-800/60 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200 hover:border-neutral-600"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-8"
                    disabled={isLoading}
                  >
                    {isLoading ? dict.common.loading : dict.admin.login.submit}
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </PageTransition>
    </div>
  );
}
