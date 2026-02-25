'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth-store';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    // La redirección a tiendas o productos la hace el layout cuando storesLoaded
    if (state.storesLoaded) {
      const dest = state.stores.length === 0 ? '/admin/stores' : '/admin/products';
      router.push(dest);
    }
  }, [isAuthenticated, state.storesLoaded, state.stores.length, router]);

  return null;
}
