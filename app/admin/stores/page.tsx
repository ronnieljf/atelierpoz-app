'use client';

import { useState, useEffect, useRef } from 'react';
import { createStore, updateStore, addUserToStore, updateUserPhoneNumber, getStoreUsers, uploadStoreLogo } from '@/lib/services/stores';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Plus, Store as StoreIcon, CheckCircle, XCircle, Edit, X, Users, UserPlus, Phone, ImagePlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function StoresCreatePage() {
  const { state: authState, loadStores } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    state: 'active',
    store_id: '',
    instagram: '',
    tiktok: '',
    description: '',
    location: '',
    iva: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    state: 'active',
    store_id: '',
    instagram: '',
    tiktok: '',
    description: '',
    location: '',
    iva: '',
  });
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [addingUserToStore, setAddingUserToStore] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userIsCreator, setUserIsCreator] = useState(false);
  const [addingUserLoading, setAddingUserLoading] = useState(false);
  const [editingPhoneStoreId, setEditingPhoneStoreId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [updatingPhoneLoading, setUpdatingPhoneLoading] = useState(false);
  const [storeUsers, setStoreUsers] = useState<Record<string, Array<{
    id: string;
    userId: string;
    isCreator: boolean;
    phoneNumber: string | null;
    userEmail: string;
    userName: string | null;
    userRole: string;
  }>>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [uploadingLogoStoreId, setUploadingLogoStoreId] = useState<string | null>(null);
  const [logoImgErrorStoreIds, setLogoImgErrorStoreIds] = useState<Set<string>>(new Set());
  /** URL del logo recién subido (optimista) para mostrarlo de inmediato en la preview. */
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cargar tiendas al montar el componente
  useEffect(() => {
    const loadData = async () => {
      if (authState.user && loadStores) {
        try {
          setLoading(true);
          console.log('Cargando tiendas para usuario:', authState.user.id);
          await loadStores();
          console.log('Tiendas cargadas:', authState.stores.length);
        } catch (error) {
          console.error('Error cargando tiendas:', error);
          setMessage({ 
            type: 'error', 
            text: error instanceof Error ? error.message : 'Error al cargar tiendas' 
          });
        } finally {
          setLoading(false);
        }
      } else if (!authState.user) {
        setLoading(false);
      } else {
        // Usuario existe pero no hay loadStores disponible
        setLoading(false);
      }
    };

    loadData();
  }, [authState.user, authState.stores.length, loadStores]);

  // Al cargar o actualizar tiendas, limpiar errores de carga de logo para reintentar mostrarlos al entrar a la vista
  useEffect(() => {
    setLogoImgErrorStoreIds(new Set());
  }, [authState.stores.length]);

  // Cargar usuarios cuando se expande una tienda
  useEffect(() => {
    expandedStores.forEach(storeId => {
      if (!storeUsers[storeId] && !loadingUsers[storeId]) {
        setLoadingUsers(prev => ({ ...prev, [storeId]: true }));
        getStoreUsers(storeId)
          .then(users => {
            setStoreUsers(prev => ({ ...prev, [storeId]: users }));
          })
          .catch(error => {
            console.error('Error cargando usuarios:', error);
          })
          .finally(() => {
            setLoadingUsers(prev => ({ ...prev, [storeId]: false }));
          });
      }
    });
  }, [expandedStores, storeUsers, loadingUsers]);

  // Ya no requerimos que sea admin para ver esta página
  // Los usuarios normales pueden ver y editar sus propias tiendas

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const newStore = await createStore(
        formData.name,
        formData.state,
        formData.store_id.trim() || undefined,
        formData.instagram.trim() || undefined,
        formData.tiktok.trim() || undefined,
        formData.description.trim() || undefined,
        formData.location.trim() || undefined,
        formData.iva !== '' && !Number.isNaN(Number(formData.iva)) ? Number(formData.iva) : undefined
      );

      if (newStore) {
        setMessage({
          type: 'success',
          text: 'Tienda creada exitosamente',
        });
        setShowCreateForm(false);
        setFormData({
          name: '',
          state: 'active',
          store_id: '',
          instagram: '',
          tiktok: '',
          description: '',
          location: '',
          iva: '',
        });
        // Recargar las tiendas del usuario
        if (loadStores) {
          await loadStores();
        }
      }
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al crear tienda',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStore = (store: { id: string; name: string; state: string; store_id?: string | null; instagram?: string | null; tiktok?: string | null; description?: string | null; location?: string | null; iva?: number | null }) => {
    setEditingStoreId(store.id);
    setEditFormData({
      name: store.name,
      state: store.state,
      store_id: store.store_id || '',
      instagram: store.instagram || '',
      tiktok: store.tiktok || '',
      description: store.description || '',
      location: store.location || '',
      iva: store.iva != null && !Number.isNaN(Number(store.iva)) ? String(store.iva) : '',
    });
    setUploadedLogoUrl(null);
    setLogoImgErrorStoreIds((s) => {
      const n = new Set(s);
      n.delete(store.id);
      return n;
    });
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreId) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updates: { name?: string; state?: string; store_id?: string | null; instagram?: string | null; tiktok?: string | null; description?: string | null; location?: string | null; iva?: number | null } = {};
      if (editFormData.name) updates.name = editFormData.name;
      if (editFormData.state) updates.state = editFormData.state;
      if (editFormData.store_id !== undefined) {
        updates.store_id = editFormData.store_id.trim() || null;
      }
      if (editFormData.instagram !== undefined) {
        updates.instagram = editFormData.instagram.trim() || null;
      }
      if (editFormData.tiktok !== undefined) {
        updates.tiktok = editFormData.tiktok.trim() || null;
      }
      if (editFormData.description !== undefined) {
        updates.description = editFormData.description.trim() || null;
      }
      if (editFormData.location !== undefined) {
        updates.location = editFormData.location.trim() || null;
      }
      if (editFormData.iva !== undefined && editFormData.iva !== '') {
        const ivaNum = parseFloat(editFormData.iva);
        updates.iva = !Number.isNaN(ivaNum) ? Math.max(0, Math.min(100, ivaNum)) : null;
      }

      const updatedStore = await updateStore(editingStoreId, updates);

      if (updatedStore) {
        setMessage({
          type: 'success',
          text: 'Tienda actualizada exitosamente',
        });
        const storeId = editingStoreId;
        setEditingStoreId(null);
        setEditFormData({
          name: '',
          state: 'active',
          store_id: '',
          instagram: '',
          tiktok: '',
          description: '',
          location: '',
          iva: '',
        });
        setUploadedLogoUrl(null);
        // Cerrar la sección expandida si estaba abierta
        if (storeId && expandedStores.has(storeId)) {
          const newExpanded = new Set(expandedStores);
          newExpanded.delete(storeId);
          setExpandedStores(newExpanded);
          // Limpiar estados relacionados
          if (addingUserToStore === storeId) {
            setAddingUserToStore(null);
            setUserEmail('');
            setUserIsCreator(false);
          }
          if (editingPhoneStoreId === storeId) {
            setEditingPhoneStoreId(null);
            setPhoneNumber('');
          }
        }
        // Recargar las tiendas del usuario
        if (loadStores) {
          await loadStores();
        }
      }
    } catch (error: unknown) {
      // Extraer el mensaje de error de manera más robusta
      let errorMessage = 'Error al actualizar tienda';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('error' in error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ya no requerimos que sea admin

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">Cargando tiendas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-100">
            {authState.user?.role === 'admin' ? 'Gestionar Tiendas' : 'Mis Tiendas'}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {authState.user?.role === 'admin' 
              ? 'Gestiona todas las tiendas del sistema' 
              : 'Gestiona tus tiendas'}
          </p>
        </div>
        {(!authState.user?.role || authState.user?.role === 'user') && authState.stores.length === 0 && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Cancelar' : 'Crear Mi Primera Tienda'}
          </Button>
        )}
        {authState.user?.role === 'admin' && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreateForm ? 'Cancelar' : 'Crear Tienda'}
          </Button>
        )}
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
              Nueva Tienda
            </h2>
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Nombre de la Tienda *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Nombre de la tienda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Estado
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Atelier name (opcional)
                </label>
                <input
                  type="text"
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value.replace(/\s/g, '-').toLowerCase() })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="mi-atelier"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Identificador único para la URL de tu tienda (ej: /mi-atelier). Solo letras, números, guiones y guiones bajos.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Instagram (opcional)
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value.toLowerCase().trim() })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="@usuario (sin @)"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  El Instagram debe ser único. Se convertirá automáticamente a minúsculas.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  TikTok (opcional)
                </label>
                <input
                  type="text"
                  value={formData.tiktok}
                  onChange={(e) => setFormData({ ...formData, tiktok: e.target.value.toLowerCase().trim() })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="@usuario (sin @)"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Usuario de TikTok (sin @). Se convertirá a minúsculas.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y"
                  placeholder="Breve descripción de la tienda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Ej: Caracas, Venezuela"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  IVA (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.iva}
                  onChange={(e) => setFormData({ ...formData, iva: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Ej: 19"
                />
                <p className="text-xs text-neutral-500 mt-1">Porcentaje de IVA por defecto para productos de esta tienda (ej. 19, 13).</p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando...' : 'Crear Tienda'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      name: '',
                      state: 'active',
                      store_id: '',
                      instagram: '',
                      tiktok: '',
                      description: '',
                      location: '',
                      iva: '',
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

      {authState.stores.length === 0 && !loading && (
        <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-12 text-center">
          <StoreIcon className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-light text-neutral-200 mb-2">
            No tienes tiendas
          </h3>
          <p className="text-neutral-400 mb-6">
            {authState.user?.role === 'admin' 
              ? 'Crea tu primera tienda para comenzar' 
              : 'Crea tu primera tienda para comenzar a vender'}
          </p>
        </div>
      )}

      {authState.stores.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-neutral-100 mb-6">
            {authState.user?.role === 'admin' ? 'Todas las Tiendas' : 'Tus Tiendas'}
          </h2>
          <div className="space-y-4">
            {authState.stores.map((store, index) => (
              <motion.div 
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                {editingStoreId === store.id ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border-2 border-primary-500/50 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6"
                  >
                    <h3 className="text-lg font-semibold text-neutral-100 mb-4">
                      Editar Tienda
                    </h3>
                    <form onSubmit={handleUpdateStore} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Nombre de la Tienda *
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Estado
                        </label>
                        <select
                          value={editFormData.state}
                          onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                        >
                          <option value="active">Activa</option>
                          <option value="inactive">Inactiva</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Atelier name
                        </label>
                        <input
                          type="text"
                          value={editFormData.store_id}
                          onChange={(e) => setEditFormData({ ...editFormData, store_id: e.target.value.replace(/\s/g, '-').toLowerCase() })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          placeholder="mi-atelier"
                        />
                        <p className="mt-1 text-xs text-neutral-400">
                          Identificador único para la URL de tu tienda (ej: /mi-atelier).
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={editFormData.instagram}
                          onChange={(e) => setEditFormData({ ...editFormData, instagram: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          placeholder="@usuario (sin @)"
                        />
                        <p className="mt-1 text-xs text-neutral-400">
                          Usuario de Instagram (sin @). Debe ser único.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          TikTok
                        </label>
                        <input
                          type="text"
                          value={editFormData.tiktok}
                          onChange={(e) => setEditFormData({ ...editFormData, tiktok: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          placeholder="@usuario (sin @)"
                        />
                        <p className="mt-1 text-xs text-neutral-400">
                          Usuario de TikTok (sin @).
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Descripción
                        </label>
                        <textarea
                          value={editFormData.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y"
                          placeholder="Breve descripción de la tienda"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Ubicación
                        </label>
                        <input
                          type="text"
                          value={editFormData.location}
                          onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          placeholder="Ej: Caracas, Venezuela"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          IVA (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={editFormData.iva}
                          onChange={(e) => setEditFormData({ ...editFormData, iva: e.target.value })}
                          className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                          placeholder="Ej: 19"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Porcentaje de IVA por defecto para productos de esta tienda.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Logo
                        </label>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800/50">
                            {(() => {
                              const logoUrl = editingStoreId === store.id && uploadedLogoUrl ? uploadedLogoUrl : store.logo;
                              const showImg = !!logoUrl && !logoImgErrorStoreIds.has(store.id);
                              return showImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoUrl!}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={() => setLogoImgErrorStoreIds((s) => new Set(s).add(store.id))}
                                />
                              ) : (
                                <StoreIcon className="h-8 w-8 text-neutral-500" />
                              );
                            })()}
                          </div>
                          <div className="flex flex-col gap-2">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !editingStoreId) return;
                                setUploadingLogoStoreId(editingStoreId);
                                setMessage(null);
                                try {
                                  const { store: updated } = await uploadStoreLogo(editingStoreId, file);
                                  if (updated?.logo) {
                                    setUploadedLogoUrl(updated.logo);
                                  }
                                  setLogoImgErrorStoreIds((s) => {
                                    const n = new Set(s);
                                    n.delete(editingStoreId);
                                    return n;
                                  });
                                  setMessage({ type: 'success', text: 'Logo actualizado' });
                                  if (loadStores) await loadStores();
                                } catch (err) {
                                  setMessage({
                                    type: 'error',
                                    text: err instanceof Error ? err.message : 'Error al subir el logo',
                                  });
                                } finally {
                                  setUploadingLogoStoreId(null);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingLogoStoreId === store.id}
                              onClick={() => logoInputRef.current?.click()}
                              className="inline-flex items-center gap-2"
                            >
                              {uploadingLogoStoreId === store.id ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : (
                                <ImagePlus className="h-4 w-4 shrink-0" />
                              )}
                              <span>
                                {uploadingLogoStoreId === store.id
                                  ? 'Subiendo…'
                                  : (uploadedLogoUrl && editingStoreId === store.id) || store.logo
                                    ? 'Cambiar logo'
                                    : 'Subir logo'}
                              </span>
                            </Button>
                          </div>
                        </div>
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
                            setEditingStoreId(null);
                            setEditFormData({
                              name: '',
                              state: 'active',
                              store_id: '',
                              instagram: '',
                              tiktok: '',
                              description: '',
                              location: '',
                              iva: '',
                            });
                            setUploadedLogoUrl(null);
                            // Cerrar la sección expandida si estaba abierta
                            if (expandedStores.has(store.id)) {
                              const newExpanded = new Set(expandedStores);
                              newExpanded.delete(store.id);
                              setExpandedStores(newExpanded);
                              // Limpiar estados relacionados
                              if (addingUserToStore === store.id) {
                                setAddingUserToStore(null);
                                setUserEmail('');
                                setUserIsCreator(false);
                              }
                              if (editingPhoneStoreId === store.id) {
                                setEditingPhoneStoreId(null);
                                setPhoneNumber('');
                              }
                            }
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
                    className={cn(
                      "rounded-2xl border-2 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6 transition-all duration-300",
                      expandedStores.has(store.id) 
                        ? "border-primary-500/50 shadow-lg shadow-primary-500/10 max-h-[calc(100vh-250px)] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-800/50 [&::-webkit-scrollbar-thumb]:bg-neutral-600/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-neutral-500/50" 
                        : "border-neutral-700/50 hover:border-primary-500/30 overflow-hidden"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary-500/30 bg-primary-600/20">
                          {store.logo && !logoImgErrorStoreIds.has(store.id) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={store.logo}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={() => setLogoImgErrorStoreIds((s) => new Set(s).add(store.id))}
                            />
                          ) : (
                            <StoreIcon className="h-6 w-6 text-primary-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-100">
                            {store.name}
                          </h3>
                          <p className="text-sm text-neutral-400 flex items-center gap-1">
                            {store.state === 'active' ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-400" />
                                Activa
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 text-red-400" />
                                Inactiva
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {store.is_creator && (
                          <span className="px-2 py-1 text-xs font-medium rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30">
                            Creador
                          </span>
                        )}
                        {(store.is_creator || authState.user?.role === 'admin') && (
                          <Button
                            variant={expandedStores.has(store.id) ? "primary" : "outline"}
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedStores);
                              if (newExpanded.has(store.id)) {
                                // Cerrar: limpiar estados relacionados
                                newExpanded.delete(store.id);
                                if (addingUserToStore === store.id) {
                                  setAddingUserToStore(null);
                                  setUserEmail('');
                                  setUserIsCreator(false);
                                }
                                if (editingPhoneStoreId === store.id) {
                                  setEditingPhoneStoreId(null);
                                  setPhoneNumber('');
                                }
                              } else {
                                // Abrir: agregar a expandidos
                                newExpanded.add(store.id);
                              }
                              setExpandedStores(newExpanded);
                            }}
                            className={cn(
                              "transition-all duration-200",
                              expandedStores.has(store.id) && "ring-2 ring-primary-500/50"
                            )}
                          >
                            <Users className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              expandedStores.has(store.id) && "scale-110"
                            )} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStore(store)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Sección de usuarios de la tienda */}
                    <AnimatePresence mode="wait">
                      {(store.is_creator || authState.user?.role === 'admin') && expandedStores.has(store.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ 
                            opacity: 1, 
                            height: 'auto',
                            marginTop: 16
                          }}
                          exit={{ 
                            opacity: 0, 
                            height: 0,
                            marginTop: 0
                          }}
                          transition={{ 
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          className="pt-4 border-t border-neutral-700/50"
                        >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Usuarios de la Tienda
                          </h4>
                          {addingUserToStore !== store.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setAddingUserToStore(store.id);
                                setUserEmail('');
                                setUserIsCreator(false);
                                // Cargar usuarios de la tienda si no están cargados
                                if (!storeUsers[store.id] && !loadingUsers[store.id]) {
                                  setLoadingUsers(prev => ({ ...prev, [store.id]: true }));
                                  try {
                                    const users = await getStoreUsers(store.id);
                                    setStoreUsers(prev => ({ ...prev, [store.id]: users }));
                                  } catch (error) {
                                    console.error('Error cargando usuarios:', error);
                                  } finally {
                                    setLoadingUsers(prev => ({ ...prev, [store.id]: false }));
                                  }
                                }
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Agregar Usuario
                            </Button>
                          )}
                        </div>

                        {/* Formulario para agregar usuario */}
                        <AnimatePresence>
                          {addingUserToStore === store.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, y: -10, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mb-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden"
                            >
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!userEmail.trim()) return;

                                setAddingUserLoading(true);
                                setMessage(null); // Limpiar mensajes anteriores
                                try {
                                  await addUserToStore(store.id, userEmail.trim(), userIsCreator);
                                  setMessage({
                                    type: 'success',
                                    text: `Usuario agregado exitosamente a ${store.name} como ${userIsCreator ? 'creador' : 'usuario'}`,
                                  });
                                  setUserEmail('');
                                  setUserIsCreator(false);
                                  setAddingUserToStore(null);
                                  // Recargar usuarios de la tienda
                                  try {
                                    const users = await getStoreUsers(store.id);
                                    setStoreUsers(prev => ({ ...prev, [store.id]: users }));
                                  } catch (error) {
                                    console.error('Error recargando usuarios:', error);
                                  }
                                  // Recargar tiendas para obtener datos actualizados
                                  if (loadStores) {
                                    await loadStores();
                                  }
                                } catch (error) {
                                  // Extraer el mensaje de error
                                  let errorMessage = 'Error al agregar usuario';
                                  if (error instanceof Error) {
                                    errorMessage = error.message;
                                  } else if (typeof error === 'object' && error !== null && 'error' in error) {
                                    errorMessage = String(error.error);
                                  } else if (typeof error === 'string') {
                                    errorMessage = error;
                                  }
                                  
                                  setMessage({
                                    type: 'error',
                                    text: errorMessage,
                                  });
                                } finally {
                                  setAddingUserLoading(false);
                                }
                              }}
                              className="space-y-3"
                            >
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <input
                                    type="email"
                                    required
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    placeholder="Email del usuario"
                                    className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                  />
                                </div>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="sm"
                                  disabled={addingUserLoading || !userEmail.trim()}
                                >
                                  {addingUserLoading ? 'Agregando...' : 'Agregar'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAddingUserToStore(null);
                                    setUserEmail('');
                                    setUserIsCreator(false);
                                  }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`is-creator-${store.id}`}
                                  checked={userIsCreator}
                                  onChange={(e) => setUserIsCreator(e.target.checked)}
                                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900/50 text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0 cursor-pointer"
                                />
                                <label
                                  htmlFor={`is-creator-${store.id}`}
                                  className="text-sm text-neutral-300 cursor-pointer select-none"
                                >
                                  Marcar como creador de la tienda
                                </label>
                              </div>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>

                        {/* Lista de usuarios */}
                        {loadingUsers[store.id] ? (
                          <div className="text-sm text-neutral-400 text-center py-4">
                            Cargando usuarios...
                          </div>
                        ) : storeUsers[store.id] && storeUsers[store.id].length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {storeUsers[store.id].map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-lg border border-neutral-700/50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-neutral-200">
                                      {user.userName || user.userEmail}
                                    </p>
                                    {user.isCreator && (
                                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary-600/20 text-primary-400 border border-primary-500/30">
                                        Creador
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-neutral-400 mt-1">{user.userEmail}</p>
                                  {user.phoneNumber && (
                                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {user.phoneNumber}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : storeUsers[store.id] && storeUsers[store.id].length === 0 ? (
                          <div className="text-sm text-neutral-400 text-center py-4 mb-4">
                            <p className="text-xs text-neutral-500 italic">
                              No hay usuarios agregados a esta tienda.
                            </p>
                          </div>
                        ) : null}

                        {/* Sección para actualizar número de teléfono del usuario actual */}
                        <div className="mt-4 p-4 bg-neutral-800/30 rounded-lg border border-neutral-700/50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5" />
                              Mi Número de Teléfono
                            </h5>
                            {editingPhoneStoreId !== store.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingPhoneStoreId(store.id);
                                  setPhoneNumber(store.phone_number || '');
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                {store.phone_number ? 'Editar' : 'Agregar'}
                              </Button>
                            )}
                          </div>

                          <AnimatePresence mode="wait">
                            {editingPhoneStoreId === store.id ? (
                              <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex gap-2 overflow-hidden"
                                onSubmit={async (e) => {
                                e.preventDefault();
                                setUpdatingPhoneLoading(true);
                                setMessage(null);
                                try {
                                  await updateUserPhoneNumber(store.id, phoneNumber.trim() || null);
                                  setMessage({
                                    type: 'success',
                                    text: 'Número de teléfono actualizado exitosamente',
                                  });
                                  setEditingPhoneStoreId(null);
                                  setPhoneNumber('');
                                  // Recargar tiendas para obtener datos actualizados
                                  if (loadStores) {
                                    await loadStores();
                                  }
                                } catch (error) {
                                  let errorMessage = 'Error al actualizar número de teléfono';
                                  if (error instanceof Error) {
                                    errorMessage = error.message;
                                  } else if (typeof error === 'object' && error !== null && 'error' in error) {
                                    errorMessage = String(error.error);
                                  } else if (typeof error === 'string') {
                                    errorMessage = error;
                                  }
                                  
                                  setMessage({
                                    type: 'error',
                                    text: errorMessage,
                                  });
                                } finally {
                                  setUpdatingPhoneLoading(false);
                                }
                              }}
                            >
                              <div className="flex-1">
                                <input
                                  type="tel"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  placeholder="Ej: +1 234 567 8900"
                                  maxLength={20}
                                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                />
                              </div>
                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={updatingPhoneLoading}
                              >
                                {updatingPhoneLoading ? 'Guardando...' : 'Guardar'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingPhoneStoreId(null);
                                  setPhoneNumber('');
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              </motion.form>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm"
                              >
                                {store.phone_number ? (
                                  <p className="text-neutral-200 font-medium">{store.phone_number}</p>
                                ) : (
                                  <p className="text-neutral-500 italic text-xs">No hay número de teléfono registrado</p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
