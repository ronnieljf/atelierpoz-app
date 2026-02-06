'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth-store';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/admin/products');
    } else {
      router.push('/admin/login');
    }
  }, [isAuthenticated, router]);

  return null;
}
