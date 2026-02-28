'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { trackPasswordResetCompleted } from '@/lib/analytics/gtag';
import { useLocaleContext } from '@/lib/context/LocaleContext';
import { getDictionary } from '@/lib/i18n/dictionary';

function RestablecerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleContext();
  const { auth, common } = getDictionary(locale);
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
        setError((res.data as { error?: string })?.error || res.error || auth.invalidCode);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(auth.connectionError);
      setIsLoading(false);
    }
  };

  if (!emailParam) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-4">{auth.missingEmailRecover}</p>
          <Link href="/recuperar-contrasena" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
            {auth.goToRecover}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-medium text-white tracking-tight mb-2">{auth.passwordUpdated}</h1>
          <p className="text-neutral-500 text-sm">{auth.redirectingToSignIn}</p>
          <Link href="/admin/login" className="inline-block mt-4 text-sm text-primary-400 hover:text-primary-300 transition-colors">
            {auth.goToSignIn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 py-12 sm:py-16 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-white tracking-tight">{auth.newPassword}</h1>
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
            className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white text-center text-lg tracking-[0.3em] placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50"
          />
          <input
            id="newPassword"
            aria-label={auth.newPasswordLabel}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={auth.passwordPlaceholder}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading || code.length !== 6 || newPassword.length < 6}
          >
            {isLoading ? auth.updating : auth.resetPassword}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link href="/recuperar-contrasena" className="text-primary-400 hover:text-primary-300 transition-colors">
            {auth.requestNewCode}
          </Link>
        </p>
      </div>
    </div>
  );
}

function RestablecerLoadingFallback() {
  const locale = useLocaleContext();
  const { common } = getDictionary(locale);
  return (
    <div className="min-h-screen flex items-center justify-center">
      {common.loading}
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<RestablecerLoadingFallback />}>
      <RestablecerContent />
    </Suspense>
  );
}
