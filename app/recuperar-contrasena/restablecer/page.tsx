'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { trackPasswordResetCompleted } from '@/lib/analytics/gtag';

function RestablecerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await httpClient.post<{ success?: boolean; error?: string }>(
        '/api/auth/reset-password',
        { email: email.trim().toLowerCase(), code: code.trim(), newPassword },
        { skipAuth: true }
      );

      if (res.success) {
        setSuccess(true);
        trackPasswordResetCompleted();
        setTimeout(() => router.push('/admin/login'), 2000);
      } else {
        setError((res.data as { error?: string })?.error || res.error || 'Código inválido o expirado');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  if (!emailParam) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">Falta el correo. Vuelve a solicitar recuperación.</p>
          <Link href="/recuperar-contrasena" className="text-primary-400 hover:text-primary-300">
            Recuperar contraseña
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center mb-4 rounded-2xl p-4 bg-green-500/20 border border-green-500/30">
            <Lock className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-light text-white mb-2">Contraseña actualizada</h1>
          <p className="text-neutral-400 mb-6">
            Redirigiendo al inicio de sesión...
          </p>
          <Link href="/admin/login" className="text-primary-400 hover:text-primary-300">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-12 sm:py-16">
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-800/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        <div className="bg-neutral-900/95 border border-neutral-800/60 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xl shadow-black/40">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-950/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-400" />
                Recuperar contraseña
              </span>
              <span className="text-[11px] text-neutral-500">Paso 2 de 2</span>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-4 rounded-2xl p-4 bg-primary-600/20 border border-primary-500/20">
                <Lock className="h-10 w-10 text-primary-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">Nueva contraseña</h1>
              <p className="text-neutral-400 text-sm">
                Ingresa el código que enviamos y elige tu nueva contraseña.
              </p>
              <p className="text-primary-400 font-medium mt-1 truncate text-sm">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="code" className="block text-sm font-medium text-neutral-300 mb-2">
                Código de verificación
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full px-4 py-3.5 bg-neutral-800/60 border border-neutral-700/50 rounded-xl text-white text-center text-xl tracking-[0.4em] placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
              />
              <p className="mt-1 text-[11px] text-neutral-500 text-center">
                El código tiene 6 dígitos. Si expiró, puedes solicitar uno nuevo.
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-300 mb-2">
                Nueva contraseña (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-800/60 border border-neutral-700/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading || code.length !== 6 || newPassword.length < 6}
            >
              {isLoading ? 'Actualizando...' : 'Restablecer contraseña'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/recuperar-contrasena" className="text-primary-400 hover:text-primary-300 transition-colors">
              ← Solicitar nuevo código
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <RestablecerContent />
    </Suspense>
  );
}
