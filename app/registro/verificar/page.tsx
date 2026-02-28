'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/store/auth-store';
import { trackSignUp } from '@/lib/analytics/gtag';
import { httpClient } from '@/lib/http/client';
import { useLocaleContext } from '@/lib/context/LocaleContext';
import { getDictionary } from '@/lib/i18n/dictionary';

function VerificarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleContext();
  const { auth, common } = getDictionary(locale);
  const { loginWithData } = useAuth();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await httpClient.post<{ success?: boolean; user?: unknown; token?: string; error?: string }>(
        '/api/auth/register/verify',
        { email: email.trim().toLowerCase(), code: code.trim() },
        { skipAuth: true }
      );

      if (res.success && res.data?.token) {
        const data = res.data as { user: { id: string; email: string; name: string | null; role: string; number_stores?: number }; token: string };
        await loginWithData(data.user, data.token);
        trackSignUp('email_code');
        router.push('/admin');
      } else {
        setError((res.data as { error?: string })?.error || res.error || auth.invalidCode);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error verificando:', err);
      setError(auth.connectionError);
      setIsLoading(false);
    }
  };

  if (!emailParam) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-4">{auth.missingEmail}</p>
          <Link href="/registro" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
            {auth.goToRegister}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 py-12 sm:py-16 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-white tracking-tight">{auth.verifyCode}</h1>
          <p className="text-neutral-500 text-sm mt-1 truncate">{email}</p>
          <p className="text-neutral-500 text-xs mt-0.5">{auth.step.replace('{{current}}', '2').replace('{{total}}', '2')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input
            id="code"
            aria-label={auth.verifyCode}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder={auth.codePlaceholder}
            required
            className="w-full px-4 py-4 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white text-center text-xl tracking-[0.4em] placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading || code.length !== 6}>
            {isLoading ? auth.verifying : auth.verifyAndCreate}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/registro" className="text-primary-400 hover:text-primary-300 transition-colors">
            {auth.requestNewCode}
          </Link>
        </p>
      </div>
    </div>
  );
}

function AuthLoadingFallback() {
  const locale = useLocaleContext();
  const { common } = getDictionary(locale);
  return (
    <div className="min-h-screen flex items-center justify-center">
      {common.loading}
    </div>
  );
}

export default function VerificarPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <VerificarContent />
    </Suspense>
  );
}
