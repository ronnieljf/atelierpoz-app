'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { httpClient } from '@/lib/http/client';
import { useLocaleContext } from '@/lib/context/LocaleContext';
import { getDictionary } from '@/lib/i18n/dictionary';

export default function RegistroPage() {
  const router = useRouter();
  const locale = useLocaleContext();
  const { auth } = getDictionary(locale);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await httpClient.post<{ success?: boolean; error?: string }>(
        '/api/auth/register/send-code',
        { email: email.trim().toLowerCase(), name: name.trim() || undefined, password, locale },
        { skipAuth: true }
      );

      if (res.success) {
        router.push(`/registro/verificar?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        setError(res.error || auth.sendCodeError);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error en registro:', err);
      setError(auth.connectionError);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 py-12 sm:py-16 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-white tracking-tight">
            {auth.createAccount}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">{auth.step.replace('{{current}}', '1').replace('{{total}}', '2')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input
            id="email"
            type="email"
            aria-label={auth.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={auth.emailPlaceholder}
            required
            className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
          />
          <input
            id="name"
            type="text"
            aria-label={auth.nameOptional}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={auth.namePlaceholder}
            className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
          />
          <input
            id="password"
            type="password"
            aria-label={auth.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={auth.passwordPlaceholder}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-neutral-900/80 border border-neutral-700/60 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:border-primary-500/50 text-sm"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? auth.sending : auth.continueAndReceive}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          {auth.alreadyHaveAccount}{' '}
          <Link href="/admin/login" className="text-primary-400 hover:text-primary-300 transition-colors">
            {auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
