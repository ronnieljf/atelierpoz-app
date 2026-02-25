'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Mail, AlertCircle } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { trackPasswordResetRequested } from '@/lib/analytics/gtag';

export default function RecuperarContrasenaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await httpClient.post<{ success?: boolean; error?: string }>(
        '/api/auth/forgot-password',
        { email: email.trim().toLowerCase() },
        { skipAuth: true }
      );

      if (res.success) {
        setSent(true);
        trackPasswordResetRequested();
        router.push(`/recuperar-contrasena/restablecer?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        setError(res.error || 'Error al enviar el código');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

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
              <span className="text-[11px] text-neutral-500">Paso 1 de 2</span>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-4 rounded-2xl p-4 bg-primary-600/20 border border-primary-500/20">
                <Mail className="h-10 w-10 text-primary-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">Recuperar contraseña</h1>
              <p className="text-neutral-400 text-sm sm:text-[15px]">
                Te enviaremos un código de verificación a tu correo para que puedas crear una nueva contraseña.
              </p>
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
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-neutral-800/60 border border-neutral-700/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Usa el mismo correo con el que inicias sesión en el panel de administración.
              </p>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar código'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/admin/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              ← Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
