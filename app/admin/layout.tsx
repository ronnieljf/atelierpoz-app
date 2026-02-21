'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/auth-store';
import { AuthProvider } from '@/lib/store/auth-store';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LogOut, Package, Users, Store, User, ShoppingBag, Receipt, Menu, X, UserCircle, FolderTree, KeyRound, BarChart3, ShoppingCart, PanelLeftClose, PanelLeft, Wallet, Truck, ClipboardList, Tag } from 'lucide-react';
import Link from 'next/link';
import { PageTransition } from '@/components/ui/PageTransition';
import { AdminAuthLoading } from '@/components/admin/AdminAuthLoading';
import { cn } from '@/lib/utils/cn';

const dict = getDictionary('es');

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout, state, loadStores } = useAuth();
  const isAdmin = state.user?.role === 'admin';
  const hydrated = state.authHydrated;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin-sidebar-open');
      setDesktopSidebarOpen(stored !== 'false');
    }
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('admin-sidebar-open', String(desktopSidebarOpen));
  }, [desktopSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hydrated) return;

    const checkAuth = async () => {
      // /admin: redirigir a products o login
      if (pathname === '/admin') {
        if (isAuthenticated()) router.push('/admin/products');
        else router.push('/admin/login');
        return;
      }

      // Login: si ya está autenticado, ir a products
      if (pathname === '/admin/login') {
        if (isAuthenticated()) router.push('/admin/products');
        return;
      }

      // Resto de rutas: verificar auth
      if (!isAuthenticated()) {
        try {
          const { httpClient } = await import('@/lib/http/client');
          const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
          if (token) {
            const response = await httpClient.get<{ user?: unknown }>('/api/auth/me');
            if (response.success && response.data && 'user' in response.data && response.data.user) {
              if (loadStores) await loadStores();
              return;
            }
          }
        } catch (error) {
          console.error('Error validando autenticación:', error);
        }
        router.push('/admin/login');
        return;
      }

      if (state.user && state.stores.length === 0 && loadStores) {
        loadStores().catch((err) => console.error('Error cargando tiendas:', err));
      }
    };

    checkAuth();
  }, [hydrated, isAuthenticated, pathname, router, state.user, state.stores.length, loadStores]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  // Una sola pantalla de carga hasta que auth y tiendas estén listos (en rutas protegidas)
  const isProtectedRoute = pathname !== '/admin' && pathname !== '/admin/login';
  const waitingForStores = isProtectedRoute && !!state.user && state.stores.length === 0;
  const showLoading =
    pathname === '/admin' ||
    (!hydrated && pathname !== '/admin/login') ||
    (isProtectedRoute && !isAuthenticated()) ||
    waitingForStores;

  if (showLoading) {
    return <AdminAuthLoading />;
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navLinkClass = (isActive: boolean) =>
    cn(
      'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
      isActive
        ? 'text-primary-400 bg-primary-500/10'
        : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/40'
    );
  const navIconClass = (isActive: boolean) =>
    cn(
      'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
      isActive ? 'bg-primary-500/20 text-primary-400' : 'bg-neutral-800/60 text-neutral-500 group-hover:bg-neutral-700/60 group-hover:text-neutral-300'
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Sidebar - Web (desktop, con opción de ocultar) */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-full border-r border-neutral-800/80 bg-neutral-900/60 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-[width,transform] duration-200 ease-out lg:block',
          desktopSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        <div className="flex h-full w-64 flex-col">
          {/* User */}
          <div className="shrink-0 border-b border-neutral-800/80 px-5 pt-6 pb-5">
            {state.user && (
              <div className="flex items-center gap-3 rounded-xl bg-neutral-800/40 px-3 py-2.5 ring-1 ring-neutral-700/30">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-700/50">
                  <User className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-100">
                    {state.user.name || state.user.email}
                  </p>
                  {state.user.name && (
                    <p className="truncate text-xs text-neutral-500">
                      {state.user.email}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {/* ── Catálogo ── */}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Catálogo
            </p>
            <Link href="/admin/products" className={navLinkClass(pathname === '/admin/products' || pathname.startsWith('/admin/products/'))}>
              {(pathname === '/admin/products' || pathname.startsWith('/admin/products/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/products' || pathname.startsWith('/admin/products/'))}><Package className="h-4 w-4" /></span>
              <span className="truncate">{dict.admin.navigation.listProducts}</span>
            </Link>
            <Link href="/admin/categories" className={navLinkClass(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/'))}>
              {(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/'))}><FolderTree className="h-4 w-4" /></span>
              <span className="truncate">Categorías de Productos</span>
            </Link>

            <div className="my-4 border-t border-neutral-800/80" />

            {/* ── Ingresos ── */}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-green-500/80">
              Ingresos
            </p>
            <Link href="/admin/sales" className={navLinkClass(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/'))}>
              {(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/'))}><ShoppingCart className="h-4 w-4" /></span>
              <span className="truncate">Ventas</span>
            </Link>
            <Link href="/admin/receivables" className={navLinkClass(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/'))}>
              {(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/'))}><Receipt className="h-4 w-4" /></span>
              <span className="truncate">Cuentas por cobrar</span>
            </Link>
            <Link href="/admin/requests" className={navLinkClass(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/'))}>
              {(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/'))}><ShoppingBag className="h-4 w-4" /></span>
              <span className="truncate">Pedidos</span>
            </Link>
            <Link href="/admin/income-categories" className={navLinkClass(pathname === '/admin/income-categories')}>
              {pathname === '/admin/income-categories' && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/income-categories')}><Tag className="h-4 w-4" /></span>
              <span className="truncate">Categorías de Ingresos</span>
            </Link>

            <div className="my-4 border-t border-neutral-800/80" />

            {/* ── Egresos ── */}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-red-500/80">
              Egresos
            </p>
            <Link href="/admin/purchases" className={navLinkClass(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/'))}>
              {(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/'))}><ClipboardList className="h-4 w-4" /></span>
              <span className="truncate">Compras</span>
            </Link>
            <Link href="/admin/expenses" className={navLinkClass(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/'))}>
              {(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/'))}><Wallet className="h-4 w-4" /></span>
              <span className="truncate">Cuentas por pagar</span>
            </Link>
            <Link href="/admin/expense-categories" className={navLinkClass(pathname === '/admin/expense-categories')}>
              {pathname === '/admin/expense-categories' && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/expense-categories')}><Tag className="h-4 w-4" /></span>
              <span className="truncate">Categorías de Egresos</span>
            </Link>

            <div className="my-4 border-t border-neutral-800/80" />

            {/* ── Contactos ── */}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Contactos
            </p>
            <Link href="/admin/clients" className={navLinkClass(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/'))}>
              {(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/'))}><UserCircle className="h-4 w-4" /></span>
              <span className="truncate">Clientes</span>
            </Link>
            <Link href="/admin/vendors" className={navLinkClass(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/'))}>
              {(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/'))}><Truck className="h-4 w-4" /></span>
              <span className="truncate">Proveedores</span>
            </Link>

            <div className="my-4 border-t border-neutral-800/80" />

            {/* ── Reportes ── */}
            <Link href="/admin/reports" className={navLinkClass(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/'))}>
              {(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
              <span className={navIconClass(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/'))}><BarChart3 className="h-4 w-4" /></span>
              <span className="truncate">Reportes</span>
            </Link>

            <div className="my-4 border-t border-neutral-800/80" />

            {/* ── Configuración ── */}
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Configuración
            </p>
            {isAdmin && (
              <Link
                href="/admin/users"
                className={navLinkClass(pathname === '/admin/users' || pathname.startsWith('/admin/users/'))}
              >
                {(pathname === '/admin/users' || pathname.startsWith('/admin/users/')) && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
                )}
                <span className={navIconClass(pathname === '/admin/users' || pathname.startsWith('/admin/users/'))}>
                  <Users className="h-4 w-4" />
                </span>
                <span className="truncate">Usuarios</span>
              </Link>
            )}
            <Link
              href="/admin/stores"
              className={navLinkClass(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/'))}
            >
              {(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/')) && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
              )}
              <span className={navIconClass(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/'))}>
                <Store className="h-4 w-4" />
              </span>
              <span className="truncate">Tiendas</span>
            </Link>
            <Link
              href="/admin/account"
              className={navLinkClass(pathname === '/admin/account')}
            >
              {pathname === '/admin/account' && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
              )}
              <span className={navIconClass(pathname === '/admin/account')}>
                <KeyRound className="h-4 w-4" />
              </span>
              <span className="truncate">Mi cuenta</span>
            </Link>
          </nav>

          {/* Ocultar sidebar (solo desktop) */}
          <div className="shrink-0 border-t border-neutral-800/80 px-3 py-2">
            <button
              type="button"
              onClick={() => setDesktopSidebarOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/40 hover:text-neutral-200"
              aria-label="Ocultar menú"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-800/60 text-neutral-500">
                <PanelLeftClose className="h-4 w-4" />
              </span>
              <span>Ocultar menú</span>
            </button>
          </div>
          {/* Logout */}
          <div className="shrink-0 border-t border-neutral-800/80 px-3 py-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/40 hover:text-neutral-200"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-800/60 text-neutral-500">
                <LogOut className="h-4 w-4" />
              </span>
              <span>{dict.admin.navigation.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Botón flotante para abrir sidebar cuando está oculto (solo desktop) */}
      {!desktopSidebarOpen && (
        <button
          type="button"
          onClick={() => setDesktopSidebarOpen(true)}
          className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-r-xl border border-l-0 border-neutral-700 bg-neutral-800/95 py-4 pl-2 pr-3 shadow-lg backdrop-blur-sm transition-colors hover:bg-neutral-700/90 lg:flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <PanelLeft className="h-5 w-5 text-neutral-300" />
        </button>
      )}

      {/* Mobile sidebar drawer: solo CSS para mejor rendimiento en móvil */}
      {mobileSidebarOpen && (
        <>
          <div
            className="mobile-sidebar-backdrop lg:hidden fixed inset-0 z-[60] bg-neutral-950/70"
            style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
          <aside
            className="mobile-sidebar-panel lg:hidden fixed left-0 top-0 bottom-0 z-[61] w-[min(280px,85vw)] flex flex-col border-r border-neutral-800/80 bg-neutral-900/95 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-2 shrink-0 border-b border-neutral-800/80 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-200">Atelier Poz</p>
                  {state.user?.email && (
                    <p className="text-xs text-neutral-500 truncate mt-0.5">{state.user.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {/* ── Catálogo ── */}
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Catálogo</p>
                <Link href="/admin/products" className={navLinkClass(pathname === '/admin/products' || pathname.startsWith('/admin/products/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/products' || pathname.startsWith('/admin/products/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/products' || pathname.startsWith('/admin/products/'))}><Package className="h-4 w-4" /></span>
                  <span className="truncate">{dict.admin.navigation.listProducts}</span>
                </Link>
                <Link href="/admin/categories" className={navLinkClass(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/categories' || pathname.startsWith('/admin/categories/'))}><FolderTree className="h-4 w-4" /></span>
                  <span className="truncate">Categorías de Productos</span>
                </Link>
                <div className="my-4 border-t border-neutral-800/80" />

                {/* ── Ingresos ── */}
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-green-500/80">Ingresos</p>
                <Link href="/admin/sales" className={navLinkClass(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/sales' || pathname.startsWith('/admin/sales/'))}><ShoppingCart className="h-4 w-4" /></span>
                  <span className="truncate">Ventas</span>
                </Link>
                <Link href="/admin/receivables" className={navLinkClass(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/receivables' || pathname.startsWith('/admin/receivables/'))}><Receipt className="h-4 w-4" /></span>
                  <span className="truncate">Cuentas por cobrar</span>
                </Link>
                <Link href="/admin/requests" className={navLinkClass(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/requests' || pathname.startsWith('/admin/requests/'))}><ShoppingBag className="h-4 w-4" /></span>
                  <span className="truncate">Pedidos</span>
                </Link>
                <Link href="/admin/income-categories" className={navLinkClass(pathname === '/admin/income-categories')} onClick={() => setMobileSidebarOpen(false)}>
                  {pathname === '/admin/income-categories' && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/income-categories')}><Tag className="h-4 w-4" /></span>
                  <span className="truncate">Categorías de Ingresos</span>
                </Link>
                <div className="my-4 border-t border-neutral-800/80" />

                {/* ── Egresos ── */}
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-red-500/80">Egresos</p>
                <Link href="/admin/purchases" className={navLinkClass(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/purchases' || pathname.startsWith('/admin/purchases/'))}><ClipboardList className="h-4 w-4" /></span>
                  <span className="truncate">Compras</span>
                </Link>
                <Link href="/admin/expenses" className={navLinkClass(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/expenses' || pathname.startsWith('/admin/expenses/'))}><Wallet className="h-4 w-4" /></span>
                  <span className="truncate">Cuentas por pagar</span>
                </Link>
                <Link href="/admin/expense-categories" className={navLinkClass(pathname === '/admin/expense-categories')} onClick={() => setMobileSidebarOpen(false)}>
                  {pathname === '/admin/expense-categories' && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/expense-categories')}><Tag className="h-4 w-4" /></span>
                  <span className="truncate">Categorías de Egresos</span>
                </Link>
                <div className="my-4 border-t border-neutral-800/80" />

                {/* ── Contactos ── */}
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Contactos</p>
                <Link href="/admin/clients" className={navLinkClass(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/clients' || pathname.startsWith('/admin/clients/'))}><UserCircle className="h-4 w-4" /></span>
                  <span className="truncate">Clientes</span>
                </Link>
                <Link href="/admin/vendors" className={navLinkClass(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/vendors' || pathname.startsWith('/admin/vendors/'))}><Truck className="h-4 w-4" /></span>
                  <span className="truncate">Proveedores</span>
                </Link>
                <div className="my-4 border-t border-neutral-800/80" />

                {/* ── Reportes ── */}
                <Link href="/admin/reports" className={navLinkClass(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/'))} onClick={() => setMobileSidebarOpen(false)}>
                  {(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/')) && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />}
                  <span className={navIconClass(pathname === '/admin/reports' || pathname.startsWith('/admin/reports/'))}><BarChart3 className="h-4 w-4" /></span>
                  <span className="truncate">Reportes</span>
                </Link>
                <div className="my-4 border-t border-neutral-800/80" />

                {/* ── Configuración ── */}
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Configuración</p>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className={navLinkClass(pathname === '/admin/users' || pathname.startsWith('/admin/users/'))}
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    {(pathname === '/admin/users' || pathname.startsWith('/admin/users/')) && (
                      <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
                    )}
                    <span className={navIconClass(pathname === '/admin/users' || pathname.startsWith('/admin/users/'))}>
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="truncate">Usuarios</span>
                  </Link>
                )}
                <Link
                  href="/admin/stores"
                  className={navLinkClass(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/'))}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  {(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/')) && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
                  )}
                  <span className={navIconClass(pathname === '/admin/stores' || pathname.startsWith('/admin/stores/'))}>
                    <Store className="h-4 w-4" />
                  </span>
                  <span className="truncate">Tiendas</span>
                </Link>
                <Link
                  href="/admin/account"
                  className={navLinkClass(pathname === '/admin/account')}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  {pathname === '/admin/account' && (
                    <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500" />
                  )}
                  <span className={navIconClass(pathname === '/admin/account')}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <span className="truncate">Mi cuenta</span>
                </Link>
              </nav>
              <div className="shrink-0 border-t border-neutral-800/80 px-3 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800/40 hover:text-neutral-200"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-800/60 text-neutral-500">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span>{dict.admin.navigation.logout}</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Mobile User Info Bar + botón para abrir sidebar */}
      {state.user && (
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 z-40 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-700/80 bg-neutral-800/40 text-neutral-300 hover:bg-neutral-700/60 hover:text-neutral-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-100 truncate">
                  {state.user.name || state.user.email}
                </p>
                {state.user.name && (
                  <p className="text-xs text-neutral-400 truncate">
                    {state.user.email}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-neutral-400 hover:text-neutral-200"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn('min-h-screen pb-4 transition-[margin] duration-200 lg:pb-0', desktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0')}>
        <div className={cn(
          "px-2 py-4 sm:px-4 sm:py-6 lg:p-8",
          state.user && "pt-16 lg:pt-4"
        )}>
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
}
