'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllUsers, createUser, updateUser } from '@/lib/services/users';
import { useAuth } from '@/lib/store/auth-store';
import { type User } from '@/lib/services/users';
import { Button } from '@/components/ui/Button';
import { Plus, Users as UsersIcon, Mail, User as UserIcon, Shield, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function UsersListPage() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
  });

  // Verificar que el usuario sea admin
  useEffect(() => {
    if (authState.user?.role !== 'admin') {
      router.push('/admin/products');
    }
  }, [authState.user, router]);

  useEffect(() => {
    // Solo cargar usuarios si el usuario es admin
    if (authState.user?.role === 'admin') {
      loadUsers();
    }
  }, [authState.user?.role]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error: unknown) {
      console.error('Error cargando usuarios:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al cargar usuarios',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const newUser = await createUser(
        formData.email,
        formData.password,
        formData.name || undefined,
        formData.role
      );

      if (newUser) {
        setMessage({
          type: 'success',
          text: 'Usuario creado exitosamente',
        });
        setShowCreateForm(false);
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'user',
        });
        await loadUsers();
      }
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear usuario',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditFormData({
      email: user.email,
      password: '',
      name: user.name || '',
      role: user.role,
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updates: { email?: string; password?: string; name?: string; role?: string } = {};
      if (editFormData.email) updates.email = editFormData.email;
      if (editFormData.password) updates.password = editFormData.password;
      if (editFormData.name !== undefined) updates.name = editFormData.name;
      if (editFormData.role) updates.role = editFormData.role;

      const updatedUser = await updateUser(editingUserId, updates);

      if (updatedUser) {
        setMessage({
          type: 'success',
          text: 'Usuario actualizado exitosamente',
        });
        setEditingUserId(null);
        setEditFormData({
          email: '',
          password: '',
          name: '',
          role: 'user',
        });
        await loadUsers();
      }
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al actualizar usuario',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-100">
            Usuarios
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            'p-4 rounded-xl border-2',
            message.type === 'success'
              ? 'bg-green-900/30 border-green-700/50 text-green-200'
              : 'bg-red-900/30 border-red-700/50 text-red-200'
          )}
        >
          {message.text}
        </motion.div>
      )}

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border-2 border-neutral-700/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6"
          >
            <h2 className="text-xl font-semibold text-neutral-100 mb-4">
              Crear Nuevo Usuario
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Nombre del usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      email: '',
                      password: '',
                      name: '',
                      role: 'user',
                    });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-neutral-400">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border-2 border-neutral-700/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
          <UsersIcon className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id}>
              {editingUserId === user.id ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border-2 border-primary-500/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6"
                >
                  <h3 className="text-lg font-semibold text-neutral-100 mb-4">
                    Editar Usuario
                  </h3>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Nueva Contraseña (dejar vacío para no cambiar)
                      </label>
                      <input
                        type="password"
                        minLength={6}
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                        className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Rol
                      </label>
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingUserId(null);
                          setEditFormData({
                            email: '',
                            password: '',
                            name: '',
                            role: 'user',
                          });
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 border-neutral-700/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6 hover:border-primary-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl',
                        user.role === 'admin'
                          ? 'bg-primary-600/20 border border-primary-500/30'
                          : 'bg-neutral-700/50'
                      )}>
                        {user.role === 'admin' ? (
                          <Shield className="h-6 w-6 text-primary-400" />
                        ) : (
                          <UserIcon className="h-6 w-6 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-100">
                          {user.name || 'Sin nombre'}
                        </h3>
                        <p className="text-sm text-neutral-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30">
                          Admin
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-neutral-400">
                    {user.created_at && (
                      <p>
                        Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </p>
                    )}
                    {user.last_login && (
                      <p>
                        Último acceso: {new Date(user.last_login).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
