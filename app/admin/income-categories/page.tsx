'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getFinanceCategories, createFinanceCategory, updateFinanceCategory, deleteFinanceCategory } from '@/lib/services/financeCategories';
import type { FinanceCategory } from '@/types/expense';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Tag, Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export default function IncomeCategoriesPage() {
  const { state: authState, loadStores } = useAuth();
  const [storeId, setStoreId] = useState('');
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<FinanceCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadStores(); }, [loadStores]);
  useEffect(() => {
    if (authState.stores.length > 0 && !storeId) setStoreId(authState.stores[0].id);
  }, [authState.stores, storeId]);

  const fetchCategories = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      setCategories(await getFinanceCategories('income', storeId));
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditingCat(null);
    setFormName('');
    setFormDescription('');
    setFormColor('#6366f1');
    setShowModal(true);
  };

  const openEdit = (cat: FinanceCategory) => {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormColor(cat.color || '#6366f1');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editingCat) {
        await updateFinanceCategory('income', editingCat.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          color: formColor || undefined,
        });
        setMessage({ type: 'success', text: 'Categoría actualizada' });
      } else {
        await createFinanceCategory('income', {
          storeId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          color: formColor || undefined,
        });
        setMessage({ type: 'success', text: 'Categoría creada' });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: FinanceCategory) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    setMessage(null);
    try {
      await deleteFinanceCategory('income', cat.id);
      setMessage({ type: 'success', text: 'Categoría eliminada' });
      fetchCategories();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar' });
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    'h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 text-sm text-neutral-100 placeholder-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50';

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-medium text-neutral-100 sm:text-2xl sm:font-light sm:text-3xl">
            Categorías de Ingresos
          </h1>
          <p className="text-sm text-neutral-400">
            Clasifica tus <span className="font-medium text-green-400">ventas</span> y <span className="font-medium text-green-400">cuentas por cobrar</span> por categoría
          </p>
        </div>
        <Button variant="primary" className="h-11 w-full justify-center sm:h-auto sm:w-auto" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {authState.stores.length > 1 && (
        <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 backdrop-blur-sm sm:mb-6 sm:rounded-3xl sm:p-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">Tienda</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 text-base text-neutral-100 focus:border-primary-500 focus:outline-none sm:h-auto sm:py-3 sm:text-sm"
          >
            {authState.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4 sm:mb-6">
        <p className="text-sm text-green-300">
          Estas categorías se usan para clasificar <strong>ventas</strong> y <strong>cuentas por cobrar</strong> (ingresos de tu negocio).
          No se aplican a productos ni a gastos.
        </p>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-4 rounded-xl border p-4 sm:mb-6',
              message.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/80 sm:rounded-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-center backdrop-blur-sm sm:rounded-3xl sm:p-12">
          <Tag className="mx-auto mb-4 h-14 w-14 text-neutral-600 sm:h-16 sm:w-16" />
          <h3 className="mb-2 text-lg font-medium text-neutral-200 sm:text-xl sm:font-light">
            Sin categorías de ingresos
          </h3>
          <p className="mb-6 text-sm text-neutral-400 sm:text-base">
            Crea categorías para organizar tus ventas y cuentas por cobrar.
          </p>
          <Button variant="primary" className="h-11 min-w-[180px] gap-2 px-5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva categoría
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm sm:rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-neutral-700 bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-300 sm:px-6">Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-300 sm:px-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {categories.map((cat) => (
                  <motion.tr key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition-colors hover:bg-neutral-800/30">
                    <td className="px-4 py-3 sm:px-6">
                      {cat.color ? (
                        <span className="inline-block h-5 w-5 rounded-full border border-neutral-600" style={{ backgroundColor: cat.color }} />
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span className="text-sm font-medium text-neutral-100">{cat.name}</span>
                    </td>
                    <td className="px-4 py-3 sm:px-6 text-sm text-neutral-400">{cat.description || '—'}</td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(cat)}>
                          <Edit className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          className="text-xs text-red-400 hover:border-red-500/50 hover:text-red-300"
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="h-3 w-3 animate-spin sm:h-4 sm:w-4" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-medium text-neutral-100">
                {editingCat ? 'Editar categoría de ingresos' : 'Nueva categoría de ingresos'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Servicios, Productos físicos..." className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Descripción (opcional)</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción breve" className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-neutral-700 bg-neutral-800/50 p-1" />
                    <span className="text-sm text-neutral-400">{formColor}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !formName.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-1.5">{editingCat ? 'Guardar' : 'Crear'}</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
