'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store/auth-store';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { trackLogin } from '@/lib/analytics/gtag';

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
        trackLogin('admin_email_password');
        router.push('/admin');
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
      {/* Fondo ligero en móvil para evitar blurs costosos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none sm:block" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-primary-900/5 rounded-full blur-2xl sm:blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-96 sm:h-96 bg-primary-800/5 rounded-full blur-2xl sm:blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-auto px-0 sm:px-4 animate-fade-in">
        <div className="relative">
          <div className="relative bg-neutral-900/95 border border-neutral-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
            <div className="relative z-10">
              <div className="text-center mb-8 sm:mb-10">
                <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
                  <div className="bg-primary-600/20 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-primary-500/20">
                    <Lock className="h-9 w-9 sm:h-12 sm:w-12 text-primary-400" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-4xl font-light text-neutral-100 mb-2 tracking-tight">
                  {dict.admin.login.title}
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base">
                  Panel de Administración
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                  </div>
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
                  className="w-full mt-6 sm:mt-8"
                  disabled={isLoading}
                >
                  {isLoading ? dict.common.loading : dict.admin.login.submit}
                </Button>

                <div className="mt-6 space-y-3">
                  <div className="text-center">
                    <Link
                      href="/recuperar-contrasena"
                      className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/70">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 text-center mb-3">
                      ¿Aún no tienes cuenta para tu negocio?
                    </p>
                    <Link href="/registro" className="block">
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Crear cuenta para mi negocio</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
