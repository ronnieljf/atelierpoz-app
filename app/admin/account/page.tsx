'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/store/auth-store';
import { getMe, changePassword, type MeUser } from '@/lib/services/auth';
import { Button } from '@/components/ui/Button';
import { User, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function AccountPage() {
  const { state: authState } = useAuth();
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingUser(true);
      const data = await getMe();
      setUser(data ?? null);
      setLoadingUser(false);
    };
    load();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'La nueva contraseña y la confirmación no coinciden' });
      return;
    }
    if (!currentPassword) {
      setMessage({ type: 'error', text: 'Ingresa tu contraseña actual' });
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Error al cambiar la contraseña' });
    }
  };

  const displayUser = user ?? authState.user;
  const roleLabel = displayUser?.role === 'admin' ? 'Administrador' : 'Usuario';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl mb-2">
        Mi cuenta
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Ver tus datos y cambiar la contraseña
      </p>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-6 rounded-xl border p-4',
              message.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Datos del usuario */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 mb-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-4">
          <User className="h-4 w-4 text-neutral-400" />
          Datos del usuario
        </h2>
        {loadingUser ? (
          <div className="flex items-center gap-2 text-neutral-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : displayUser ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">Nombre</dt>
              <dd className="text-neutral-100 font-medium">
                {displayUser.name || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Correo electrónico</dt>
              <dd className="text-neutral-100 font-medium">
                {displayUser.email}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Rol</dt>
              <dd className="text-neutral-100 font-medium">
                {roleLabel}
              </dd>
            </div>
            {user?.last_login && (
              <div>
                <dt className="text-neutral-500">Último acceso</dt>
                <dd className="text-neutral-400">
                  {new Date(user.last_login).toLocaleString('es')}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-neutral-500">No se pudieron cargar los datos.</p>
        )}
      </section>

      {/* Cambiar contraseña */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-base font-medium text-neutral-200 mb-4">
          <Lock className="h-4 w-4 text-neutral-400" />
          Cambiar contraseña
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-400 mb-1.5">
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-400 mb-1.5">
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-400 mb-1.5">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={changingPassword}
            className="w-full sm:w-auto"
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Actualizando…
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}
