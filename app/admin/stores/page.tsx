'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createStore, updateStore, addUserToStore, updateUserPhoneNumber, getStoreUsers, uploadStoreLogo, removeUserFromStore, type StoreUserRow } from '@/lib/services/stores';
import { getMyPermissions, getAllPermissions, setUserPermissions, type PermissionItem } from '@/lib/services/permissions';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import {
  Plus, Store as StoreIcon, CheckCircle, XCircle, Edit, X, Users, UserPlus,
  Phone, ImagePlus, Loader2, ChevronDown, MapPin, Instagram, Hash, Percent,
  Crown, Shield, TriangleAlert, Trash2, KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

/** Títulos de módulos de permisos en español (solo vista front) */
const MODULE_LABELS_ES: Record<string, string> = {
  products: 'Productos',
  categories: 'Categorías de productos',
  sales: 'Ventas',
  receivables: 'Cuentas por cobrar',
  clients: 'Clientes',
  vendors: 'Proveedores',
  purchases: 'Compras',
  expenses: 'Gastos',
  finance_categories: 'Categorías financieras',
  requests: 'Pedidos',
  reports: 'Reportes',
  stores: 'Tiendas',
};

const EMPTY_FORM = {
  name: '',
  state: 'active',
  store_id: '',
  instagram: '',
  tiktok: '',
  description: '',
  location: '',
  iva: '',
};

export default function StoresPage() {
  const { state: authState, loadStores } = useAuth();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ ...EMPTY_FORM });

  const [activeTab, setActiveTab] = useState<Record<string, 'info' | 'users'>>({});
  const [addingUserToStore, setAddingUserToStore] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userIsCreator, setUserIsCreator] = useState(false);
  const [addingUserLoading, setAddingUserLoading] = useState(false);

  const [editingPhoneStoreId, setEditingPhoneStoreId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [updatingPhoneLoading, setUpdatingPhoneLoading] = useState(false);

  const [storeUsers, setStoreUsers] = useState<Record<string, StoreUserRow[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [permissionsCatalog, setPermissionsCatalog] = useState<PermissionItem[]>([]);
  const [editingPermissionsKey, setEditingPermissionsKey] = useState<string | null>(null);
  const [permissionCheckboxes, setPermissionCheckboxes] = useState<Record<string, boolean>>({});
  const [savingPermissionsKey, setSavingPermissionsKey] = useState<string | null>(null);

  const [uploadingLogoStoreId, setUploadingLogoStoreId] = useState<string | null>(null);
  const [logoImgErrorStoreIds, setLogoImgErrorStoreIds] = useState<Set<string>>(new Set());
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [showLimitReachedAlert, setShowLimitReachedAlert] = useState(false);
  const [removingUserKey, setRemovingUserKey] = useState<string | null>(null);

  useEffect(() => {
    if (authState.storesLoaded) setLoading(false);
    else if (!authState.user) setLoading(false);
  }, [authState.storesLoaded, authState.user]);

  useEffect(() => {
    setLogoImgErrorStoreIds(new Set());
  }, [authState.stores.length]);

  const loadUsersForStore = useCallback(async (storeId: string) => {
    if (loadingUsers[storeId]) return;
    setLoadingUsers(prev => ({ ...prev, [storeId]: true }));
    try {
      const users = await getStoreUsers(storeId);
      setStoreUsers(prev => ({ ...prev, [storeId]: users }));
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoadingUsers(prev => ({ ...prev, [storeId]: false }));
    }
  }, [loadingUsers]);

  const canCreateStore = authState.storeCountAsCreator < authState.storeLimit;
  const storeUsagePercent = authState.storeLimit > 0
    ? Math.round((authState.storeCountAsCreator / authState.storeLimit) * 100)
    : 100;

  const toggleExpand = (storeId: string) => {
    if (expandedStoreId === storeId) {
      setExpandedStoreId(null);
      setEditingStoreId(null);
      setAddingUserToStore(null);
    } else {
      setExpandedStoreId(storeId);
      setEditingStoreId(null);
      setAddingUserToStore(null);
      if (!activeTab[storeId]) {
        setActiveTab(prev => ({ ...prev, [storeId]: 'info' }));
      }
    }
  };

  const switchTab = (storeId: string, tab: 'info' | 'users') => {
    setActiveTab(prev => ({ ...prev, [storeId]: tab }));
    if (tab === 'users') {
      if (!storeUsers[storeId]) loadUsersForStore(storeId);
      if (permissionsCatalog.length === 0) {
        getAllPermissions().then(setPermissionsCatalog).catch(() => setPermissionsCatalog([]));
      }
    }
  };

  const openPermissionsEditor = (storeId: string, user: StoreUserRow) => {
    const key = `${storeId}-${user.userId}`;
    if (editingPermissionsKey === key) {
      setEditingPermissionsKey(null);
      return;
    }
    setEditingPermissionsKey(key);
    const codes = user.isCreator ? [] : (user.permissionCodes ?? []);
    const next: Record<string, boolean> = {};
    permissionsCatalog.forEach((p) => { next[p.code] = codes.includes(p.code); });
    setPermissionCheckboxes(next);
  };

  const setPermissionChecked = (code: string, checked: boolean) => {
    setPermissionCheckboxes(prev => ({ ...prev, [code]: checked }));
  };

  const selectAllPermissions = () => {
    const next: Record<string, boolean> = {};
    permissionsCatalog.forEach((p) => { next[p.code] = true; });
    setPermissionCheckboxes(next);
  };

  const handleSavePermissions = async (storeId: string, userId: string) => {
    const key = `${storeId}-${userId}`;
    setSavingPermissionsKey(key);
    setMessage(null);
    try {
      const codes = Object.entries(permissionCheckboxes)
        .filter(([, v]) => v)
        .map(([code]) => code);
      await setUserPermissions(storeId, userId, codes);
      setMessage({ type: 'success', text: 'Permisos actualizados' });
      setEditingPermissionsKey(null);
      await loadUsersForStore(storeId);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar permisos' });
    } finally {
      setSavingPermissionsKey(null);
    }
  };

  const openCreateFormOrShowLimitAlert = () => {
    if (!canCreateStore) {
      setShowLimitReachedAlert(true);
      setMessage(null);
      return;
    }
    setShowLimitReachedAlert(false);
    setShowCreateForm(true);
  };

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
        formData.iva !== '' && !Number.isNaN(Number(formData.iva)) ? Number(formData.iva) : undefined,
      );
      if (newStore) {
        setMessage({ type: 'success', text: 'Tienda creada exitosamente' });
        setShowCreateForm(false);
        setFormData({ ...EMPTY_FORM });
        if (loadStores) await loadStores();
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : 'Error al crear tienda';
      setMessage({ type: 'error', text: errorText });
      if (errorText.toLowerCase().includes('límite') || errorText.toLowerCase().includes('soporte')) {
        setShowLimitReachedAlert(true);
      }
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
    setLogoImgErrorStoreIds(s => { const n = new Set(s); n.delete(store.id); return n; });
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreId) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const updates: Record<string, unknown> = {};
      if (editFormData.name) updates.name = editFormData.name;
      if (editFormData.state) updates.state = editFormData.state;
      updates.store_id = editFormData.store_id.trim() || null;
      updates.instagram = editFormData.instagram.trim() || null;
      updates.tiktok = editFormData.tiktok.trim() || null;
      updates.description = editFormData.description.trim() || null;
      updates.location = editFormData.location.trim() || null;
      if (editFormData.iva !== '') {
        const ivaNum = parseFloat(editFormData.iva);
        updates.iva = !Number.isNaN(ivaNum) ? Math.max(0, Math.min(100, ivaNum)) : null;
      }

      const updatedStore = await updateStore(editingStoreId, updates as Parameters<typeof updateStore>[1]);
      if (updatedStore) {
        setMessage({ type: 'success', text: 'Tienda actualizada exitosamente' });
        setEditingStoreId(null);
        setEditFormData({ ...EMPTY_FORM });
        setUploadedLogoUrl(null);
        if (loadStores) await loadStores();
      }
    } catch (error: unknown) {
      let errorMessage = 'Error al actualizar tienda';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'object' && error !== null && 'error' in error) errorMessage = String((error as { error: string }).error);
      else if (typeof error === 'string') errorMessage = error;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent, storeId: string, storeName: string) => {
    e.preventDefault();
    if (!userEmail.trim()) return;
    setAddingUserLoading(true);
    setMessage(null);
    try {
      await addUserToStore(storeId, userEmail.trim(), userIsCreator);
      setMessage({ type: 'success', text: `Usuario agregado a ${storeName}` });
      setUserEmail('');
      setUserIsCreator(false);
      setAddingUserToStore(null);
      await loadUsersForStore(storeId);
      if (loadStores) await loadStores();
    } catch (error: unknown) {
      let errorMessage = 'Error al agregar usuario';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'object' && error !== null && 'error' in error) errorMessage = String((error as { error: string }).error);
      else if (typeof error === 'string') errorMessage = error;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setAddingUserLoading(false);
    }
  };

  const handleRemoveUser = async (storeId: string, userId: string, userLabel: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar a ${userLabel} de esta tienda? Ya no tendrá acceso a la tienda.`)) return;

    const key = `${storeId}-${userId}`;
    setRemovingUserKey(key);
    setMessage(null);
    try {
      await removeUserFromStore(storeId, userId);
      setMessage({ type: 'success', text: 'Usuario eliminado de la tienda' });
      await loadUsersForStore(storeId);
      if (loadStores) await loadStores();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar usuario';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setRemovingUserKey(null);
    }
  };

  const handleUpdatePhone = async (e: React.FormEvent, storeId: string) => {
    e.preventDefault();
    setUpdatingPhoneLoading(true);
    setMessage(null);
    try {
      await updateUserPhoneNumber(storeId, phoneNumber.trim() || null);
      setMessage({ type: 'success', text: 'Número actualizado' });
      setEditingPhoneStoreId(null);
      setPhoneNumber('');
      if (loadStores) await loadStores();
    } catch (error: unknown) {
      let errorMessage = 'Error al actualizar número';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUpdatingPhoneLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, storeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogoStoreId(storeId);
    setMessage(null);
    try {
      const { store: updated } = await uploadStoreLogo(storeId, file);
      if (updated?.logo) setUploadedLogoUrl(updated.logo);
      setLogoImgErrorStoreIds(s => { const n = new Set(s); n.delete(storeId); return n; });
      setMessage({ type: 'success', text: 'Logo actualizado' });
      if (loadStores) await loadStores();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al subir el logo' });
    } finally {
      setUploadingLogoStoreId(null);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-neutral-100">
            Mis Tiendas
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Gestiona tus tiendas y sus usuarios
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={openCreateFormOrShowLimitAlert} variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tienda
          </Button>
        )}
      </div>

      {/* Store Usage Indicator */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-300">
            Tiendas creadas
          </span>
          <span className="text-sm font-medium text-neutral-100">
            {authState.storeCountAsCreator} / {authState.storeLimit}
          </span>
        </div>
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full transition-colors',
              storeUsagePercent >= 100 ? 'bg-amber-500' : 'bg-primary-500',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(storeUsagePercent, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {!canCreateStore && (
          <p className="mt-2 text-xs text-amber-400/80">
            Has alcanzado el límite de tiendas. Contacta al soporte para aumentar tu plan.
          </p>
        )}
      </div>

      {/* Alerta: límite de tiendas alcanzado */}
      <AnimatePresence>
        {showLimitReachedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border-2 border-amber-500/50 bg-amber-950/40 p-4 flex items-start gap-3"
          >
            <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200">
                Has alcanzado el límite de tiendas permitidas
              </p>
              <p className="text-xs text-amber-200/80 mt-1">
                Tu plan permite crear hasta {authState.storeLimit} {authState.storeLimit === 1 ? 'tienda' : 'tiendas'}. Para crear más, contacta a soporte para aumentar tu plan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLimitReachedAlert(false)}
              className="p-1 rounded-lg text-amber-300 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label="Cerrar alerta"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'p-4 rounded-xl border text-sm',
              message.type === 'success'
                ? 'bg-green-950/40 border-green-800/50 text-green-300'
                : 'bg-red-950/40 border-red-800/50 text-red-300',
            )}
          >
            <div className="flex items-center justify-between">
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-neutral-500 hover:text-neutral-300 ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-primary-500/30 bg-neutral-900/80 backdrop-blur-sm p-6">
              <h2 className="text-lg font-medium text-neutral-100 mb-5">Nueva Tienda</h2>
              <StoreForm
                data={formData}
                onChange={setFormData}
                onSubmit={handleCreateStore}
                onCancel={() => { setShowCreateForm(false); setFormData({ ...EMPTY_FORM }); }}
                isSubmitting={isSubmitting}
                submitLabel="Crear Tienda"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {authState.stores.length === 0 && !showCreateForm && (
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/40 p-12 text-center">
          <StoreIcon className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-light text-neutral-200 mb-1">No tienes tiendas</h3>
          <p className="text-sm text-neutral-500 mb-5">Crea tu primera tienda para empezar</p>
          <Button onClick={openCreateFormOrShowLimitAlert} variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Crear Mi Primera Tienda
          </Button>
        </div>
      )}

      {/* Store List */}
      {authState.stores.length > 0 && (
        <div className="space-y-3">
          {authState.stores.map((store, index) => {
            const isExpanded = expandedStoreId === store.id;
            const isEditing = editingStoreId === store.id;
            const currentTab = activeTab[store.id] || 'info';
            const logoUrl = isEditing && uploadedLogoUrl ? uploadedLogoUrl : store.logo;
            const showLogo = !!logoUrl && !logoImgErrorStoreIds.has(store.id);

            return (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className={cn(
                  'rounded-2xl border bg-neutral-900/70 backdrop-blur-sm transition-all duration-300',
                  isExpanded ? 'border-primary-500/40 shadow-lg shadow-primary-500/5' : 'border-neutral-800 hover:border-neutral-700',
                )}
              >
                {/* Card Header (always visible) */}
                <button
                  type="button"
                  onClick={() => toggleExpand(store.id)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 text-left"
                >
                  {/* Logo */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-700/50 bg-neutral-800/60">
                    {showLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl!}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setLogoImgErrorStoreIds(s => new Set(s).add(store.id))}
                      />
                    ) : (
                      <StoreIcon className="h-5 w-5 text-neutral-500" />
                    )}
                  </div>

                  {/* Name + Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-medium text-neutral-100 truncate">{store.name}</h3>
                      {store.is_creator && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-primary-600/15 text-primary-400 border border-primary-500/20">
                          <Crown className="h-3 w-3" />
                          Creador
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
                      {store.state === 'active' ? (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="h-3 w-3" /> Activa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="h-3 w-3" /> Inactiva
                        </span>
                      )}
                      {store.store_id && (
                        <span className="flex items-center gap-1 truncate">
                          <Hash className="h-3 w-3" /> {store.store_id}
                        </span>
                      )}
                      {store.location && (
                        <span className="hidden sm:flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {store.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-neutral-500 transition-transform duration-200 shrink-0',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-5 space-y-4">
                        <div className="h-px bg-neutral-800" />

                        {/* Tabs */}
                        <div className="flex gap-1 bg-neutral-800/60 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => switchTab(store.id, 'info')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all',
                              currentTab === 'info'
                                ? 'bg-neutral-700 text-neutral-100 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-300',
                            )}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Información
                          </button>
                          {store.is_creator && (
                            <button
                              type="button"
                              onClick={() => switchTab(store.id, 'users')}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all',
                                currentTab === 'users'
                                  ? 'bg-neutral-700 text-neutral-100 shadow-sm'
                                  : 'text-neutral-400 hover:text-neutral-300',
                              )}
                            >
                              <Users className="h-3.5 w-3.5" />
                              Usuarios
                            </button>
                          )}
                        </div>

                        {/* Info Tab */}
                        {currentTab === 'info' && (
                          <div>
                            {isEditing && store.is_creator ? (
                              <div className="space-y-4">
                                <StoreForm
                                  data={editFormData}
                                  onChange={setEditFormData}
                                  onSubmit={handleUpdateStore}
                                  onCancel={() => { setEditingStoreId(null); setEditFormData({ ...EMPTY_FORM }); setUploadedLogoUrl(null); }}
                                  isSubmitting={isSubmitting}
                                  submitLabel="Guardar Cambios"
                                />
                                {/* Logo upload */}
                                <div className="pt-2 border-t border-neutral-800">
                                  <label className="block text-xs font-medium text-neutral-400 mb-2">Logo</label>
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800/50">
                                      {showLogo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoUrl!} alt="" className="h-full w-full object-cover"
                                          onError={() => setLogoImgErrorStoreIds(s => new Set(s).add(store.id))}
                                        />
                                      ) : (
                                        <StoreIcon className="h-6 w-6 text-neutral-500" />
                                      )}
                                    </div>
                                    <input
                                      ref={logoInputRef}
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                                      className="hidden"
                                      onChange={(e) => handleLogoUpload(e, store.id)}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={uploadingLogoStoreId === store.id}
                                      onClick={() => logoInputRef.current?.click()}
                                    >
                                      {uploadingLogoStoreId === store.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <ImagePlus className="h-4 w-4 mr-2" />
                                      )}
                                      {uploadingLogoStoreId === store.id ? 'Subiendo…' : store.logo ? 'Cambiar' : 'Subir'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Store Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <DetailItem icon={Hash} label="Atelier name" value={store.store_id} />
                                  <DetailItem icon={MapPin} label="Ubicación" value={store.location} />
                                  <DetailItem icon={Instagram} label="Instagram" value={store.instagram ? `@${store.instagram}` : null} />
                                  <DetailItem
                                    icon={() => (
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1V9.01c-.26-.04-.52-.06-.79-.06a6.33 6.33 0 0 0-6.33 6.33A6.33 6.33 0 0 0 9.49 21.6a6.33 6.33 0 0 0 6.33-6.33V8.87a8.18 8.18 0 0 0 4.77 1.52V6.94a4.85 4.85 0 0 1-1-.25z"/>
                                      </svg>
                                    )}
                                    label="TikTok"
                                    value={store.tiktok ? `@${store.tiktok}` : null}
                                  />
                                  <DetailItem icon={Percent} label="IVA" value={store.iva != null && store.iva > 0 ? `${store.iva}%` : null} />
                                  <DetailItem icon={Phone} label="Mi teléfono" value={store.phone_number} />
                                </div>

                                {store.description && (
                                  <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800">
                                    <p className="text-xs text-neutral-400 mb-1">Descripción</p>
                                    <p className="text-sm text-neutral-300">{store.description}</p>
                                  </div>
                                )}

                                {/* Action Buttons: solo creador puede editar tienda; todos pueden editar su teléfono */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {store.is_creator && (
                                    <Button variant="outline" size="sm" onClick={() => handleEditStore(store)}>
                                      <Edit className="h-3.5 w-3.5 mr-2" />
                                      Editar
                                    </Button>
                                  )}
                                  {editingPhoneStoreId !== store.id ? (
                                    <Button variant="outline" size="sm" onClick={() => { setEditingPhoneStoreId(store.id); setPhoneNumber(store.phone_number || ''); }}>
                                      <Phone className="h-3.5 w-3.5 mr-2" />
                                      {store.phone_number ? 'Cambiar Teléfono' : 'Agregar Teléfono'}
                                    </Button>
                                  ) : (
                                    <form onSubmit={(e) => handleUpdatePhone(e, store.id)} className="flex gap-2">
                                      <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+1 234 567 8900"
                                        maxLength={20}
                                        className="w-40 px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                      />
                                      <Button type="submit" variant="primary" size="sm" disabled={updatingPhoneLoading}>
                                        {updatingPhoneLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                                      </Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => { setEditingPhoneStoreId(null); setPhoneNumber(''); }}>
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </form>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Users Tab */}
                        {currentTab === 'users' && store.is_creator && (
                          <div className="space-y-3">
                            {/* Add User Button / Form */}
                            {addingUserToStore !== store.id ? (
                              <Button variant="outline" size="sm" onClick={() => { setAddingUserToStore(store.id); setUserEmail(''); setUserIsCreator(false); }}>
                                <UserPlus className="h-3.5 w-3.5 mr-2" />
                                Agregar Usuario
                              </Button>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-neutral-800/40 rounded-lg border border-neutral-700/50"
                              >
                                <form onSubmit={(e) => handleAddUser(e, store.id, store.name)} className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="email"
                                      required
                                      value={userEmail}
                                      onChange={(e) => setUserEmail(e.target.value)}
                                      placeholder="Email del usuario"
                                      className="flex-1 px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-lg text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    />
                                    <Button type="submit" variant="primary" size="sm" disabled={addingUserLoading || !userEmail.trim()}>
                                      {addingUserLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Agregar'}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => { setAddingUserToStore(null); setUserEmail(''); setUserIsCreator(false); }}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={userIsCreator}
                                      onChange={(e) => setUserIsCreator(e.target.checked)}
                                      className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-900/50 text-primary-500 focus:ring-primary-500/50 cursor-pointer"
                                    />
                                    <span className="text-xs text-neutral-400">Agregar como creador</span>
                                  </label>
                                </form>
                              </motion.div>
                            )}

                            {/* User List */}
                            {loadingUsers[store.id] ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                              </div>
                            ) : storeUsers[store.id] && storeUsers[store.id].length > 0 ? (
                              <div className="space-y-1.5">
                                {storeUsers[store.id].map((user) => {
                                  const removingKey = `${store.id}-${user.userId}`;
                                  const permKey = `${store.id}-${user.userId}`;
                                  const isRemoving = removingUserKey === removingKey;
                                  const isEditingPerm = editingPermissionsKey === permKey;
                                  const isSavingPerm = savingPermissionsKey === permKey;
                                  return (
                                    <div key={user.id} className="rounded-lg bg-neutral-800/30 border border-neutral-800 overflow-hidden">
                                      <div className="flex items-center gap-3 p-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700/50 text-neutral-400">
                                          {user.isCreator ? <Crown className="h-3.5 w-3.5 text-primary-400" /> : <Shield className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-neutral-200 truncate">
                                              {user.userName || user.userEmail}
                                            </p>
                                            {user.isCreator && (
                                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary-600/15 text-primary-400 border border-primary-500/20">
                                                Creador
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-neutral-500 truncate">{user.userEmail}</p>
                                        </div>
                                        {user.phoneNumber && (
                                          <span className="text-[11px] text-neutral-500 flex items-center gap-1 shrink-0">
                                            <Phone className="h-3 w-3" /> {user.phoneNumber}
                                          </span>
                                        )}
                                        {!user.isCreator && (
                                          <button
                                            type="button"
                                            onClick={() => openPermissionsEditor(store.id, user)}
                                            className={cn(
                                              'p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                                              isEditingPerm ? 'bg-primary-500/20 text-primary-400' : 'text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10'
                                            )}
                                            title="Editar permisos"
                                          >
                                            <KeyRound className="h-4 w-4" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveUser(store.id, user.userId, user.userName || user.userEmail)}
                                          disabled={isRemoving}
                                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
                                          title="Eliminar de la tienda"
                                        >
                                          {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                      </div>
                                      {isEditingPerm && !user.isCreator && (
                                        <div className="border-t border-neutral-700/80 p-3 bg-neutral-900/40 space-y-3">
                                          <p className="text-xs font-medium text-neutral-400">Permisos</p>
                                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {permissionsCatalog.length === 0 ? (
                                              <span className="text-xs text-neutral-500">Cargando…</span>
                                            ) : (
                                              Object.entries(
                                                permissionsCatalog.reduce<Record<string, PermissionItem[]>>((acc, p) => {
                                                  (acc[p.module] = acc[p.module] ?? []).push(p);
                                                  return acc;
                                                }, {})
                                              ).map(([module, perms]) => (
                                                <div key={module} className="space-y-1.5">
                                                  <span className="text-[10px] font-semibold uppercase text-neutral-500 block">{MODULE_LABELS_ES[module] ?? module.replace(/_/g, ' ')}</span>
                                                  <div className="flex flex-col gap-1">
                                                    {perms.map((p) => (
                                                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          checked={permissionCheckboxes[p.code] ?? false}
                                                          onChange={(e) => setPermissionChecked(p.code, e.target.checked)}
                                                          className="w-3.5 h-3.5 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500/50"
                                                        />
                                                        <span className="text-xs text-neutral-300">{p.name}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-2 pt-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={selectAllPermissions}
                                              type="button"
                                            >
                                              Agregar todos los permisos
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="primary"
                                              disabled={isSavingPerm}
                                              onClick={() => handleSavePermissions(store.id, user.userId)}
                                            >
                                              {isSavingPerm ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                              Guardar permisos
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setEditingPermissionsKey(null)}>
                                              Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : storeUsers[store.id] ? (
                              <div className="text-center py-6">
                                <Users className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
                                <p className="text-xs text-neutral-500">No hay usuarios en esta tienda</p>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Reusable Components ───────────────────────────────────────────── */

function DetailItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
      <span className="text-neutral-500">{label}:</span>
      <span className="text-neutral-300 truncate">{value}</span>
    </div>
  );
}

function StoreForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  data: typeof EMPTY_FORM;
  onChange: (data: typeof EMPTY_FORM) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const inputClass = 'w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 placeholder:text-neutral-600';
  const labelClass = 'block text-xs font-medium text-neutral-400 mb-1.5';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>Nombre *</label>
          <input type="text" required value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} className={inputClass} placeholder="Nombre de la tienda" />
        </div>
        <div>
          <label className={labelClass}>Atelier name</label>
          <input type="text" value={data.store_id} onChange={(e) => onChange({ ...data, store_id: e.target.value.replace(/\s/g, '-').toLowerCase() })} className={inputClass} placeholder="mi-atelier" />
          <p className="mt-1 text-[10px] text-neutral-600">URL única ej: /mi-atelier</p>
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <select value={data.state} onChange={(e) => onChange({ ...data, state: e.target.value })} className={inputClass}>
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Instagram</label>
          <input type="text" value={data.instagram} onChange={(e) => onChange({ ...data, instagram: e.target.value.toLowerCase().trim() })} className={inputClass} placeholder="usuario (sin @)" />
        </div>
        <div>
          <label className={labelClass}>TikTok</label>
          <input type="text" value={data.tiktok} onChange={(e) => onChange({ ...data, tiktok: e.target.value.toLowerCase().trim() })} className={inputClass} placeholder="usuario (sin @)" />
        </div>
        <div>
          <label className={labelClass}>Ubicación</label>
          <input type="text" value={data.location} onChange={(e) => onChange({ ...data, location: e.target.value })} className={inputClass} placeholder="Ej: Caracas, Venezuela" />
        </div>
        <div>
          <label className={labelClass}>IVA (%)</label>
          <input type="number" min={0} max={100} step={0.01} value={data.iva} onChange={(e) => onChange({ ...data, iva: e.target.value })} className={inputClass} placeholder="Ej: 16" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} rows={2} className={cn(inputClass, 'resize-y')} placeholder="Breve descripción de la tienda" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
