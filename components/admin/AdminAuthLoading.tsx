'use client';

import { Loader2 } from 'lucide-react';

export function AdminAuthLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Loader2 className="h-10 w-10 animate-spin text-primary-400" aria-hidden />
      <p className="mt-4 text-sm font-light text-neutral-500">Verificando…</p>
    </div>
  );
}
