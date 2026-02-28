'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store/auth-store';
import { getDictionary } from '@/lib/i18n/dictionary';
import { useLocaleContext } from '@/lib/context/LocaleContext';
import { Button } from '@/components/ui/Button';
import { AlertCircle, UserPlus } from 'lucide-react';
import { trackLogin } from '@/lib/analytics/gtag';

export default function AdminLoginPage() {
  const locale = useLocaleContext();
  const dict = getDictionary(locale);
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
          ? dict.admin.login.connectionTimeout
          : err instanceof Error
            ? err.message
            : dict.admin.login.connectionError
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 py-8 sm:py-12 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-white tracking-tight">
            {dict.admin.login.title}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <input
              id="email"
              type="email"
              aria-label={dict.admin.login.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={dict.admin.login.emailPlaceholder}
              required
              className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
            />
          </div>
          <div>
            <input
              id="password"
              type="password"
              aria-label={dict.admin.login.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={dict.admin.login.passwordPlaceholder}
              required
              className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? dict.common.loading : dict.admin.login.submit}
          </Button>

          <div className="flex flex-col items-center gap-2 pt-2 text-sm">
            <Link href="/recuperar-contrasena" className="text-neutral-500 hover:text-primary-400 transition-colors">
              {dict.admin.login.forgotPassword}
            </Link>
            <span className="text-neutral-600">·</span>
            <Link href="/registro" className="text-neutral-400 hover:text-primary-400 transition-colors flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              {dict.admin.login.createAccount}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
