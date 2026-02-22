'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { type Product, type ProductAttribute, type ProductVariant, type ProductCombination } from '@/types/product';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getProductById, createProduct, updateProduct, isValidImageFile } from '@/lib/services/products';
import { getCategoriesForAdmin, type Category } from '@/lib/services/categories';
import { uploadFiles, base64ToFile } from '@/lib/services/upload';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, X, Upload, Image as ImageIcon, ImagePlus, Expand, Save, Zap, Copy, Loader2, Eye, HelpCircle, ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { VariantSelector } from '@/components/products/VariantSelector';

const dict = getDictionary('es');

// Categorías por defecto (se reemplazarán con las del backend)
const DEFAULT_CATEGORIES = [
  { value: 'rings', label: 'Anillos', prefix: 'ANI' },
  { value: 'necklaces', label: 'Collares', prefix: 'COL' },
  { value: 'bracelets', label: 'Pulseras', prefix: 'PUL' },
  { value: 'earrings', label: 'Aretes', prefix: 'ARE' },
  { value: 'watches', label: 'Relojes', prefix: 'REL' },
] as const;

const ATTRIBUTE_TYPES: { value: ProductAttribute['type']; label: string }[] = [
  { value: 'color', label: 'Color' },
  { value: 'size', label: 'Talla' },
  { value: 'text', label: 'Texto' },
  { value: 'select', label: 'Selección' },
];

// Plantillas de atributos comunes por categoría
const ATTRIBUTE_TEMPLATES: Record<string, Partial<ProductAttribute>[]> = {
  rings: [
    { name: 'Talla', type: 'size', required: true },
    { name: 'Material', type: 'select', required: true },
  ],
  necklaces: [
    { name: 'Longitud', type: 'select', required: true },
    { name: 'Material', type: 'select', required: false },
  ],
  bracelets: [
    { name: 'Talla', type: 'size', required: true },
    { name: 'Material', type: 'select', required: false },
  ],
  earrings: [
    { name: 'Material', type: 'select', required: true },
  ],
  watches: [
    { name: 'Correa', type: 'select', required: true },
  ],
};

/** Normaliza un valor a hex #RRGGBB. Para variantes de tipo color. */
function normalizeHexColor(input: string | undefined): string {
  if (input == null || typeof input !== 'string') return '';
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  return input.trim().startsWith('#') ? input.trim() : input.trim() ? `#${input.trim()}` : '';
}

interface ProductFormData {
  name: string;
  description: string;
  basePrice: string;
  currency: string;
  stock: string;
  sku: string;
  category: string;
  categoryId: string;
  storeId: string;
  images: string[];
  attributes: ProductAttribute[];
  combinations: ProductCombination[];
  visibleInStore: boolean;
  hidePrice: boolean;
  sortOrder: string;
  iva: string;
}

interface ProductFormProps {
  productId?: string;
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const isEditing = !!productId;
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    basePrice: '',
    currency: 'USD',
    stock: '0',
    sku: '',
    category: '',
    categoryId: '',
    storeId: authState.stores.length > 0 ? authState.stores[0].id : '',
    images: [],
    attributes: [],
    combinations: [],
    visibleInStore: false,
    hidePrice: false,
    sortOrder: '',
    iva: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAttributesHelp, setShowAttributesHelp] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [openVariantes, setOpenVariantes] = useState(false);
  /** URL de la imagen del producto mostrada en grande (para confirmar al asignar a variante) */
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.trim().toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  /** Selección de variantes en la vista previa (attributeId -> variantId) */
  const [previewSelectedVariants, setPreviewSelectedVariants] = useState<Record<string, string>>({});

  /** Vista previa: combinación que coincide con la selección actual */
  const previewCurrentCombination = useMemo(() => {
    const combos = formData.combinations || [];
    if (combos.length === 0) return null;
    const sel = { ...previewSelectedVariants };
    return combos.find((c) => {
      const keys = Object.keys(c.selections || {});
      return keys.length === Object.keys(sel).length && keys.every((attrId) => (c.selections as Record<string, string>)[attrId] === sel[attrId]);
    }) ?? null;
  }, [formData.combinations, previewSelectedVariants]);

  /** Vista previa: imágenes a mostrar (combinación > variantes > producto) */
  const previewDisplayImages = useMemo(() => {
    if (!formData.attributes?.length) return formData.images || [];
    const combo = previewCurrentCombination;
    if (combo?.images?.length) return combo.images;
    const variantImages: string[] = [];
    formData.attributes.forEach((attr) => {
      const variantId = previewSelectedVariants[attr.id];
      if (variantId) {
        const v = attr.variants.find((x) => x.id === variantId);
        if (v?.images?.length) variantImages.push(...v.images);
      }
    });
    if (variantImages.length > 0) return variantImages;
    return formData.images || [];
  }, [formData.attributes, formData.images, previewSelectedVariants, previewCurrentCombination]);

  /** Vista previa: precio total (base + combinación o suma de variantes) */
  const previewTotalPrice = useMemo(() => {
    const base = parseFloat(formData.basePrice) || 0;
    if (previewCurrentCombination != null && (previewCurrentCombination.priceModifier ?? 0) !== 0) {
      const p = typeof previewCurrentCombination.priceModifier === 'number' ? previewCurrentCombination.priceModifier : parseFloat(String(previewCurrentCombination.priceModifier ?? 0));
      return base + (Number.isNaN(p) ? 0 : p);
    }
    let extra = 0;
    formData.attributes.forEach((attr) => {
      const variantId = previewSelectedVariants[attr.id];
      if (variantId) {
        const v = attr.variants.find((x) => x.id === variantId);
        const p = typeof v?.price === 'number' ? v.price : parseFloat(String(v?.price ?? 0));
        if (!Number.isNaN(p)) extra += p;
      }
    });
    return base + extra;
  }, [formData.basePrice, formData.attributes, previewSelectedVariants, previewCurrentCombination]);

  /** Vista previa: stock disponible */
  const previewAvailableStock = useMemo(() => {
    if (!formData.attributes?.length) return parseInt(formData.stock, 10) || 0;
    if (previewCurrentCombination != null) {
      const s = typeof previewCurrentCombination.stock === 'number' ? previewCurrentCombination.stock : parseInt(String(previewCurrentCombination.stock ?? 0), 10);
      return Number.isNaN(s) ? 0 : s;
    }
    const stocks: number[] = [];
    formData.attributes.forEach((attr) => {
      const variantId = previewSelectedVariants[attr.id];
      if (variantId) {
        const v = attr.variants.find((x) => x.id === variantId);
        stocks.push(typeof v?.stock === 'number' ? v.stock : parseInt(String(v?.stock ?? formData.stock ?? 0), 10) || 0);
      }
    });
    if (stocks.length === 0) return parseInt(formData.stock, 10) || 0;
    return Math.min(...stocks);
  }, [formData.stock, formData.attributes, previewSelectedVariants, previewCurrentCombination]);

  const [selectedPreviewImage, setSelectedPreviewImage] = useState<number>(0);

  useEffect(() => {
    if (selectedPreviewImage >= previewDisplayImages.length && previewDisplayImages.length > 0) {
      setSelectedPreviewImage(0);
    }
  }, [previewDisplayImages.length, selectedPreviewImage]);


  // Inicializar/sincronizar previewSelectedVariants cuando cambian los atributos o sus opciones
  const attributesSignature = formData.attributes.map((a) => `${a.id}:${a.variants.map((v) => v.id).join(',')}`).join('|');
  useEffect(() => {
    const next: Record<string, string> = {};
    formData.attributes.forEach((attr) => {
      if (attr.variants.length > 0) {
        const current = previewSelectedVariants[attr.id];
        const stillExists = current && attr.variants.some((v) => v.id === current);
        next[attr.id] = stillExists ? current! : attr.variants[0].id;
      }
    });
    setPreviewSelectedVariants((prev) => {
      const merged = { ...prev, ...next };
      Object.keys(merged).forEach((id) => {
        if (!formData.attributes.some((a) => a.id === id)) delete merged[id];
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributesSignature]);

  useEffect(() => {
    if (isEditing && productId) {
      // Cargar el producto (que también cargará las categorías si es necesario)
      loadProduct();
    } else if (!isEditing) {
      // Focus en el primer campo al crear
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, productId]);

  // Cargar categorías de la tienda seleccionada
  useEffect(() => {
    if (formData.storeId) {
      loadCategories();
    } else {
      setCategories([]);
      setFormData((prev) => ({ ...prev, categoryId: '', category: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.storeId]);

  // Cargar plantillas de atributos cuando cambia la categoría
  useEffect(() => {
    if (formData.category && formData.attributes.length === 0) {
      // Usar el slug de la categoría para buscar las plantillas
      const categorySlug = formData.category;
      const templates = ATTRIBUTE_TEMPLATES[categorySlug] || [];
      if (templates.length > 0) {
        const newAttributes: ProductAttribute[] = templates.map((template, idx) => ({
          id: `attr-${Date.now()}-${idx}`,
          name: template.name || '',
          type: template.type || 'select',
          required: template.required || false,
          variants: [],
        }));
        setFormData(prev => ({ ...prev, attributes: newAttributes }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  // Al crear producto, prellenar IVA con el de la tienda seleccionada
  useEffect(() => {
    if (isEditing || !formData.storeId) return;
    const store = authState.stores.find((s) => s.id === formData.storeId);
    const storeIva = store?.iva;
    if (storeIva != null && !Number.isNaN(Number(storeIva))) {
      setFormData((prev) => ({ ...prev, iva: String(storeIva) }));
    }
    // Solo cuando cambia la tienda en modo creación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.storeId, isEditing]);

  // Atajo de teclado Ctrl+S para guardar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCategories = async () => {
    const storeId = formData.storeId;
    if (!storeId) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    try {
      const cats = await getCategoriesForAdmin(storeId);
      setCategories(cats);
      const currentId = formData.categoryId;
      const stillValid = currentId && cats.some((c) => c.id === currentId);
      if (cats.length > 0 && !stillValid) {
        setFormData((prev) => ({ ...prev, category: cats[0].slug, categoryId: cats[0].id }));
      } else if (cats.length === 0) {
        setFormData((prev) => ({ ...prev, categoryId: '', category: '' }));
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProduct = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      // Primero necesitamos obtener el storeId del producto
      // Por ahora, intentamos con la primera tienda del usuario
      // En el futuro, podríamos obtener el storeId desde la URL o desde el producto mismo
      const storeId = formData.storeId || authState.stores[0]?.id;
      
      if (!storeId) {
        throw new Error('No se encontró una tienda para cargar el producto');
      }

      const product = await getProductById(productId, storeId);
      if (product) {
        // Si el producto tiene storeId, usarlo
        const productStoreId = product.storeId || storeId;
        
        if (productStoreId !== formData.storeId) {
          setFormData(prev => ({ ...prev, storeId: productStoreId }));
        }
        const cats = categories.length > 0 && formData.storeId === productStoreId
          ? categories
          : await getCategoriesForAdmin(productStoreId);
        if (cats.length > 0 && categories.length === 0) setCategories(cats);
        const category = cats.find(c => c.slug === product.category) || cats.find(c => c.id === product.categoryId) || null;
        
        setFormData({
          name: product.name,
          description: product.description,
          basePrice: product.basePrice.toString(),
          currency: product.currency,
          iva: product.iva != null && !Number.isNaN(Number(product.iva)) ? String(product.iva) : '',
          stock: product.stock.toString(),
          sku: product.sku,
          category: product.category,
          categoryId: category?.id || '',
          storeId: productStoreId,
          images: product.images || [],
          attributes: product.attributes || [],
          combinations: product.combinations || [],
          visibleInStore: product.visibleInStore === true,
          hidePrice: product.hidePrice === true,
          sortOrder: product.sortOrder != null && !Number.isNaN(Number(product.sortOrder)) ? String(product.sortOrder) : '',
        });
        if (product.images && product.images.length > 0) setSelectedPreviewImage(0);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setSubmitMessage({ type: 'error', text: 'Error al cargar el producto' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(isValidImageFile);
    
    if (validFiles.length !== files.length) {
      setSubmitMessage({ type: 'error', text: 'Algunos archivos no son imágenes válidas' });
      return;
    }

    setUploadingImages(true);
    setSubmitMessage(null);

    try {
      // Subir imágenes directamente a R2
      const uploadedFiles = await uploadFiles(validFiles, 'products');
      
      // Obtener las URLs de las imágenes subidas
      // La respuesta del backend es: { success: true, files: [{ url, key }], count: number }
      const imageUrls = uploadedFiles.map(file => file.url);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageUrls],
      }));

      // Si es la primera imagen, seleccionarla automáticamente
      if (formData.images.length === 0) {
        setSelectedPreviewImage(0);
      }

      setSubmitMessage({ type: 'success', text: `${validFiles.length} imagen(es) subida(s) exitosamente` });
    } catch (error) {
      console.error('Error uploading images:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al subir las imágenes' 
      });
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleVariantImageUpload = async (
    attributeIndex: number,
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(isValidImageFile);
    
    if (validFiles.length !== files.length) {
      setSubmitMessage({ type: 'error', text: 'Algunos archivos no son imágenes válidas' });
      return;
    }

    setUploadingImages(true);
    setSubmitMessage(null);

    try {
      // Subir imágenes directamente a R2
      const uploadedFiles = await uploadFiles(validFiles, 'products/variants');
      
      // Obtener las URLs de las imágenes subidas
      const imageUrls = uploadedFiles.map(file => file.url);

      // Actualizar las imágenes de la variante
      setFormData((prev) => ({
        ...prev,
        attributes: prev.attributes.map((attr, i) =>
          i === attributeIndex
            ? {
                ...attr,
                variants: attr.variants.map((variant, vIdx) =>
                  vIdx === variantIndex
                    ? {
                        ...variant,
                        images: [...(variant.images || []), ...imageUrls],
                      }
                    : variant
                ),
              }
            : attr
        ),
      }));

      setSubmitMessage({ type: 'success', text: `${validFiles.length} imagen(es) subida(s) exitosamente` });
    } catch (error) {
      console.error('Error uploading variant images:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al subir las imágenes' 
      });
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeVariantImage = (attributeIndex: number, variantIndex: number, imageIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? {
              ...attr,
              variants: attr.variants.map((variant, vIdx) =>
                vIdx === variantIndex
                  ? {
                      ...variant,
                      images: (variant.images || []).filter((_, imgIdx) => imgIdx !== imageIndex),
                    }
                  : variant
              ),
            }
          : attr
      ),
    }));
  };

  /** Añade una imagen del producto global a la variante (sin subir de nuevo). */
  const addProductImageToVariant = (attributeIndex: number, variantIndex: number, imageUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? {
              ...attr,
              variants: attr.variants.map((variant, vIdx) =>
                vIdx === variantIndex
                  ? {
                      ...variant,
                      images: [...(variant.images || []), imageUrl],
                    }
                  : variant
              ),
            }
          : attr
      ),
    }));
  };

  const addAttribute = () => {
    const newAttribute: ProductAttribute = {
      id: `attr-${Date.now()}`,
      name: '',
      type: 'select',
      variants: [],
      required: false,
    };
    setFormData((prev) => ({
      ...prev,
      attributes: [...prev.attributes, newAttribute],
    }));
  };

  const updateAttribute = (index: number, updates: Partial<ProductAttribute>) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === index ? { ...attr, ...updates } : attr
      ),
    }));
  };

  const removeAttribute = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const addVariant = (attributeIndex: number) => {
    const newVariant: ProductVariant = {
      id: `variant-${Date.now()}`,
      name: '',
      value: '',
      stock: 0,
      images: [],
    };
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? { ...attr, variants: [...attr.variants, newVariant] }
          : attr
      ),
    }));
  };

  const duplicateVariant = (attributeIndex: number, variantIndex: number) => {
    const attribute = formData.attributes[attributeIndex];
    const variant = attribute.variants[variantIndex];
    const newVariant: ProductVariant = {
      id: `variant-${Date.now()}`,
      name: `${variant.name || variant.value || ''} (copia)`,
      value: variant.value || '',
      stock: 0,
      images: variant.images ? [...variant.images] : [],
    };
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? { ...attr, variants: [...attr.variants, newVariant] }
          : attr
      ),
    }));
  };

  const updateVariant = (
    attributeIndex: number,
    variantIndex: number,
    updates: Partial<ProductVariant>
  ) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? {
              ...attr,
              variants: attr.variants.map((variant, vIdx) =>
                vIdx === variantIndex ? { ...variant, ...updates } : variant
              ),
            }
          : attr
      ),
    }));
  };

  const removeVariant = (attributeIndex: number, variantIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === attributeIndex
          ? {
              ...attr,
              variants: attr.variants.filter((_, vIdx) => vIdx !== variantIndex),
            }
          : attr
      ),
    }));
  };

  /** Genera todas las combinaciones: con 1 atributo = una por opción; con 2+ = producto cartesiano (ej. Color × Talla). Código, stock y precio se definen en cada combinación. */
  const generateAllCombinations = () => {
    const attrs = formData.attributes.filter((a) => a.variants.length > 0);
    if (attrs.length < 1) {
      setSubmitMessage({ type: 'error', text: 'Agrega al menos un tipo (ej. Color o Talla) con al menos una opción para generar combinaciones.' });
      return;
    }
    let rows: Record<string, string>[] = [{}];
    for (const attr of attrs) {
      const newRows: Record<string, string>[] = [];
      for (const row of rows) {
        for (const v of attr.variants) {
          newRows.push({ ...row, [attr.id]: v.id });
        }
      }
      if (newRows.length === 0) break;
      rows = newRows;
    }
    const combinations: ProductCombination[] = rows.map((selections) => ({
      id: `combo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      selections,
      stock: 0,
      priceModifier: 0,
      sku: '',
      images: [],
    }));
    setFormData((prev) => ({ ...prev, combinations }));
    setSubmitMessage(null);
  };

  const updateCombination = (comboIndex: number, updates: Partial<ProductCombination>) => {
    setFormData((prev) => ({
      ...prev,
      combinations: prev.combinations.map((c, i) =>
        i === comboIndex ? { ...c, ...updates } : c
      ),
    }));
  };

  const removeCombination = (comboIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      combinations: prev.combinations.filter((_, i) => i !== comboIndex),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      if (!formData.name || !formData.categoryId) {
        throw new Error('Faltan datos obligatorios: nombre del producto y categoría.');
      }
      const productStock = parseInt(formData.stock, 10) || 0;
      const combos = formData.combinations || [];
      const attrs = formData.attributes || [];
      const hasVariants = attrs.some((a) => a?.variants?.length > 0);
      if (hasVariants && combos.length === 0) {
        throw new Error(
          'Este producto tiene variantes. Haz clic en "Generar todas las combinaciones" y asigna código, stock y precio a cada fila.'
        );
      }
      let sumCombos = 0;
      if (combos.length > 0) {
        sumCombos = combos.reduce((s, c) => {
          const raw = c?.stock;
          const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : parseInt(String(raw), 10);
          return s + (Number.isNaN(n) ? 0 : Math.max(0, n));
        }, 0);
      }
      // Productos con variantes: la suma del stock de las combinaciones debe ser igual al stock total del producto
      if (hasVariants && combos.length > 0 && sumCombos !== productStock) {
        throw new Error(
          `La suma del stock de las combinaciones (${sumCombos}) debe ser igual al stock del producto (${productStock}). Ajusta el stock del producto o el de cada combinación.`
        );
      }
      const priceNum = formData.basePrice !== '' && formData.basePrice != null ? parseFloat(formData.basePrice) : 0;

      // Separar imágenes base64 (locales) de URLs (ya subidas)
      const base64Images = formData.images.filter(img => img.startsWith('data:'));
      const uploadedImageUrls = formData.images.filter(img => !img.startsWith('data:'));

      let finalImageUrls = [...uploadedImageUrls];

      // Si hay imágenes base64, subirlas primero
      if (base64Images.length > 0) {
        try {
          // Convertir base64 a File
          const files = base64Images.map((base64, index) => {
            const filename = `image-${Date.now()}-${index}.jpg`;
            return base64ToFile(base64, filename);
          });

          // Subir imágenes a R2
          const uploadedFiles = await uploadFiles(files, 'products');
          finalImageUrls = [...uploadedImageUrls, ...uploadedFiles.map(f => f.url)];
        } catch (uploadError) {
          console.error('Error subiendo imágenes:', uploadError);
          throw new Error('Error al subir las imágenes. Por favor, intenta de nuevo.');
        }
      }

      const sortOrderNum = formData.sortOrder.trim() !== '' && !Number.isNaN(Number(formData.sortOrder))
        ? Number(formData.sortOrder)
        : undefined;
      const productData: Partial<Product> & { storeId: string; categoryId: string; visibleInStore?: boolean; hidePrice?: boolean; sortOrder?: number } = {
        name: formData.name,
        description: formData.description,
        images: finalImageUrls, // Usar solo URLs de imágenes subidas
        basePrice: Number.isNaN(priceNum) ? 0 : priceNum,
        currency: formData.currency,
        stock: parseInt(formData.stock) || 0,
        sku: formData.sku.trim() || undefined,
        category: formData.category,
        storeId: formData.storeId || authState.stores[0]?.id || '',
        categoryId: formData.categoryId,
        visibleInStore: formData.visibleInStore,
        hidePrice: formData.hidePrice,
        sortOrder: sortOrderNum,
        iva: formData.iva !== '' && !Number.isNaN(parseFloat(formData.iva)) ? parseFloat(formData.iva) : undefined,
        attributes: formData.attributes.map((attr) => ({
          ...attr,
          variants: attr.variants.map((variant) => ({
            ...variant,
            price: 0,
            stock: 0,
            sku: '',
          })),
        })),
        combinations: formData.combinations || [],
      };

      if (isEditing && productId) {
        const updated = await updateProduct(productId, productData);
        if (updated) {
          setSubmitMessage({ type: 'success', text: 'Producto actualizado exitosamente' });
          setTimeout(() => {
            router.push('/admin/products');
          }, 1500);
        } else {
          throw new Error('Error al actualizar el producto');
        }
      } else {
        await createProduct(productData as Product & { storeId: string; categoryId: string });
        setSubmitMessage({ type: 'success', text: dict.admin.product.create.success });
        setTimeout(() => {
          router.push('/admin/products');
        }, 1500);
      }
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : dict.admin.product.create.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-neutral-400">{dict.common.loading}</div>
      </div>
    );
  }

  // Diálogo de categoría (portal): compartido por modo básico y completo
  const categoryDialogPortal =
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {showCategoryDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowCategoryDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative z-[10000]"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h3 className="text-lg font-medium text-neutral-100">Elegir categoría</h3>
                <button
                  type="button"
                  onClick={() => setShowCategoryDialog(false)}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 border-b border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Buscar categoría..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {filteredCategories.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-8">
                    {categorySearch.trim()
                      ? 'Ninguna categoría coincide con la búsqueda.'
                      : 'No hay categorías disponibles.'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filteredCategories.map((cat) => {
                      const isSelected = formData.categoryId === cat.id;
                      return (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                category: cat.slug,
                                categoryId: cat.id,
                              }));
                              setShowCategoryDialog(false);
                              setCategorySearch('');
                            }}
                            className={cn(
                              'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                              isSelected
                                ? 'bg-primary-500/20 border border-primary-500/40 text-primary-300'
                                : 'bg-neutral-800/30 border border-transparent text-neutral-200 hover:bg-neutral-800/50 hover:border-neutral-700'
                            )}
                          >
                            <span className="font-medium">{cat.name}</span>
                            {isSelected && <Check className="h-5 w-5 flex-shrink-0 text-primary-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <div className="min-h-screen bg-neutral-950 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
      {categoryDialogPortal}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Formulario Principal - 2 columnas; en móvil va primero */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6 order-1">
            {/* Header */}
            <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-neutral-100">
                  {isEditing ? dict.admin.product.create.editTitle : dict.admin.product.create.title}
                </h1>
                <p className="text-sm text-neutral-500">
                  {isEditing ? 'Edita los datos del producto' : 'Nombre, categoría, precio y stock. El resto es opcional.'}
                </p>
                <div className="hidden sm:flex items-center gap-2 mt-2 text-xs text-neutral-500 bg-neutral-800/50 px-3 py-1.5 rounded-lg w-fit">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Ctrl+S para guardar</span>
                </div>
              </div>
            </div>

            {/* Mensaje de estado */}
            <AnimatePresence>
              {submitMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'p-4 rounded-xl border text-sm sm:text-base font-medium',
                    submitMessage.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  )}
                >
                  {submitMessage.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario: una sola vista, secciones opcionales colapsables */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <h2 className="text-base font-medium text-neutral-200">Datos del producto</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">{dict.admin.product.create.name} <span className="text-red-400">*</span></label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={dict.admin.product.create.namePlaceholder}
                      required
                      className="w-full h-11 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                    />
                  </div>
                  {authState.stores.length !== 1 && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Tienda</label>
                      <select
                        value={formData.storeId || authState.stores[0]?.id || ''}
                        onChange={(e) => {
                          const newStoreId = e.target.value;
                          setFormData({
                            ...formData,
                            storeId: newStoreId || authState.stores[0]?.id || '',
                            category: '',
                            categoryId: '',
                          });
                        }}
                        className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:text-sm sm:min-h-0"
                      >
                        {authState.stores.map((store) => (
                          <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">{dict.admin.product.create.category} <span className="text-red-400">*</span></label>
                    <input type="hidden" name="categoryId" value={formData.categoryId} required readOnly />
                    <button
                      type="button"
                      onClick={() => formData.storeId && setShowCategoryDialog(true)}
                      disabled={!formData.storeId || loadingCategories}
                      className="w-full h-11 px-3 rounded-lg text-left flex items-center justify-between bg-neutral-800/50 border border-neutral-700 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                    >
                      <span className="truncate">
                        {!formData.storeId ? 'Elige tienda' : formData.categoryId ? (categories.find((c) => c.id === formData.categoryId)?.name ?? formData.category) : loadingCategories ? '…' : 'Elige categoría'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
                    </button>
                    {formData.storeId && categories.length === 0 && !loadingCategories && (
                      <p className="text-xs text-neutral-500 mt-1">Admin → Categorías.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Precio</label>
                    <div className="flex gap-2 min-w-0">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        inputMode="decimal"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0"
                        className="flex-1 min-w-0 h-11 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                      />
                      <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-20 h-11 px-2 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="VES">VES</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Stock</label>
                    <input type="number" inputMode="numeric" min={0} value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="0" className="w-full h-11 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Descripción</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={dict.admin.product.create.descriptionPlaceholder} rows={2} className="w-full px-3 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Fotos</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="file" id="image-upload" accept="image/*" multiple onChange={handleImageUpload} disabled={uploadingImages} className="hidden" />
                    <label htmlFor="image-upload" className={cn('inline-flex h-10 items-center gap-2 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-sm text-neutral-300 cursor-pointer hover:border-neutral-600', uploadingImages && 'opacity-50')}>
                      {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingImages ? 'Subiendo…' : 'Subir fotos'}
                    </label>
                    {formData.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {formData.images.slice(0, 6).map((img, i) => (
                          <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-700 group">
                            <Image src={img} alt="" width={48} height={48} className="w-full h-full object-cover" unoptimized={img.startsWith('data:')} />
                            <button type="button" onClick={() => removeImage(i)} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-4 w-4 text-white" /></button>
                          </div>
                        ))}
                        {formData.images.length > 6 && <span className="text-xs text-neutral-500">+{formData.images.length - 6}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 pt-1">
                    <label className="flex items-center gap-3 cursor-pointer text-sm text-neutral-300">
                      <input type="checkbox" checked={formData.visibleInStore} onChange={(e) => setFormData({ ...formData, visibleInStore: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-primary-500 focus:ring-primary-500" />
                      Visible en tienda
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer text-sm text-neutral-300">
                      <input type="checkbox" checked={formData.hidePrice} onChange={(e) => setFormData({ ...formData, hidePrice: e.target.checked })} className="rounded border-neutral-700 bg-neutral-800 text-primary-500 focus:ring-primary-500" />
                      Ocultar precio
                    </label>
                  </div>
              </div>

              {/* Más opciones: SKU, IVA, orden, variantes */}
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                <button type="button" onClick={() => setOpenVariantes(!openVariantes)} className="w-full flex items-center justify-between gap-3 p-4 min-h-[48px] text-left hover:bg-neutral-800/30 active:bg-neutral-800/50 transition-colors touch-manipulation">
                  <span className="text-sm font-medium text-neutral-200">Más opciones</span>
                  <motion.div animate={{ rotate: openVariantes ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-5 w-5 text-neutral-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openVariantes && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-neutral-800">
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Código (SKU)</label>
                            <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="Opcional" className="w-full h-10 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">IVA (%)</label>
                            <input type="number" step="0.01" min={0} max={100} value={formData.iva} onChange={(e) => setFormData({ ...formData, iva: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="19" className="w-full h-10 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Orden en tienda</label>
                            <input type="number" min={0} value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} onWheel={(e) => e.currentTarget.blur()} placeholder="Menor = primero" className="w-full h-10 px-3 rounded-lg border border-neutral-700 bg-neutral-800/50 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                          </div>
                        </div>
                        <div className="border-t border-neutral-700 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-neutral-200">Variantes (opcional)</h3>
                        <button
                          type="button"
                          onClick={() => setShowAttributesHelp(!showAttributesHelp)}
                          className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-lg text-neutral-400 hover:text-primary-400 hover:bg-neutral-800/50 transition-colors touch-manipulation"
                          aria-label="Ayuda sobre atributos"
                        >
                          <HelpCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-500">Colores, tallas, etc.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={addAttribute}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-sm"
                  >
                    <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-2" />
                    <span>Agregar tipo (Color, Talla…)</span>
                  </Button>
                </div>

                {/* Ayuda: para qué sirven las variantes y cómo se ven en la tienda */}
                <AnimatePresence>
                  {showAttributesHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 sm:p-6 space-y-4 mt-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <HelpCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
                          <h3 className="text-sm sm:text-base font-semibold text-blue-300">
                            ¿Para qué sirven las variantes?
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAttributesHelp(false)}
                          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors touch-manipulation flex-shrink-0"
                          aria-label="Cerrar ayuda"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-4 text-sm text-neutral-300">
                        <p className="text-neutral-400 leading-relaxed">
                          Las <strong className="text-neutral-200">variantes</strong> son solo las opciones que el cliente puede elegir (ej. Rojo, Azul, M, L). No llevan código, stock ni precio. Después de añadir tipos (Color, Talla…) y sus opciones, usa <strong className="text-neutral-200">Generar todas las combinaciones</strong>; en la tabla que aparece asignarás <strong className="text-neutral-200">código, stock y precio</strong> a cada combinación.
                        </p>

                        <div>
                          <h4 className="font-semibold text-blue-300 mb-2">Flujo</h4>
                          <ul className="space-y-2 text-xs sm:text-sm text-neutral-400 ml-4 list-disc space-y-1">
                            <li><strong className="text-neutral-200">Tipos</strong> (ej. Color, Talla) → Agrega con &quot;Agregar tipo&quot;.</li>
                            <li><strong className="text-neutral-200">Opciones</strong> por tipo (ej. Rojo, Azul / M, L) → Solo el nombre de cada opción; sin código, stock ni precio aquí.</li>
                            <li><strong className="text-neutral-200">Generar combinaciones</strong> → Crea una fila por combinación (con 1 tipo: una fila por opción; con 2+: todas las combinaciones, ej. Rojo+M, Rojo+L).</li>
                            <li><strong className="text-neutral-200">En cada fila</strong> → Asigna código, stock y precio (o precio adicional +$).</li>
                            <li><strong className="text-neutral-200">Fotos de la opción</strong> → Opcional; al elegir esa opción el cliente puede ver esa imagen en la ficha.</li>
                          </ul>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-xs sm:text-sm text-green-200">
                            <strong>Resumen:</strong> Variantes = solo nombres de opciones. Código, stock y precio = en las combinaciones.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {formData.attributes.map((attr, attrIndex) => (
                    <div
                      key={attr.id}
                      className="bg-neutral-800/30 border border-neutral-700 rounded-xl p-4 sm:p-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) =>
                            updateAttribute(attrIndex, { name: e.target.value })
                          }
                          placeholder="Ej: Color, Talla"
                          className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl sm:rounded-lg text-base sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                        />
                        <select
                          value={attr.type}
                          onChange={(e) =>
                            updateAttribute(attrIndex, {
                              type: e.target.value as ProductAttribute['type'],
                            })
                          }
                          className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl sm:rounded-lg text-base sm:text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                        >
                          {ATTRIBUTE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:col-span-1">
                          <label className="flex items-center gap-2 min-h-[44px] sm:min-h-0 text-sm text-neutral-400 cursor-pointer touch-manipulation">
                            <input
                              type="checkbox"
                              checked={attr.required}
                              onChange={(e) =>
                                updateAttribute(attrIndex, { required: e.target.checked })
                              }
                              className="w-4 h-4 rounded border-neutral-700 bg-neutral-900/50 text-primary-500 focus:ring-primary-500"
                            />
                            <span>Requerido</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeAttribute(attrIndex)}
                            className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1.5 flex items-center justify-center hover:bg-red-500/20 rounded-xl sm:rounded text-red-400 transition-colors touch-manipulation"
                            aria-label="Quitar atributo"
                          >
                            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Variantes: solo opciones (nombre). Código, stock y precio van en las combinaciones. */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-neutral-500">Opciones (ej. Rojo, Azul, M, L)</span>
                          <button
                            type="button"
                            onClick={() => addVariant(attrIndex)}
                            className="min-h-[40px] px-3 py-2 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-2 rounded-lg hover:bg-primary-500/10 transition-colors touch-manipulation"
                          >
                            <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                            Agregar
                          </button>
                        </div>
                        {attr.variants.map((variant, variantIndex) => (
                          <div
                            key={variant.id}
                            className="bg-neutral-900/50 p-4 sm:p-3 rounded-xl sm:rounded-lg space-y-3 sm:space-y-2 border border-neutral-700/50"
                          >
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    name: e.target.value,
                                    value: attr.type === 'color' ? (variant.value || '') : (e.target.value.trim() || variant.value),
                                  })
                                }
                                placeholder="Nombre de la opción"
                                className="min-h-[44px] sm:min-h-0 flex-1 min-w-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => duplicateVariant(attrIndex, variantIndex)}
                                  className="min-h-[44px] sm:min-h-0 p-2.5 sm:p-1.5 flex items-center justify-center hover:bg-primary-500/20 rounded-xl sm:rounded text-primary-400 transition-colors touch-manipulation"
                                  title="Duplicar opción"
                                >
                                  <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeVariant(attrIndex, variantIndex)}
                                  className="min-h-[44px] sm:min-h-0 p-2.5 sm:p-1.5 flex items-center justify-center hover:bg-red-500/20 rounded-xl sm:rounded text-red-400 transition-colors touch-manipulation"
                                  aria-label="Quitar opción"
                                >
                                  <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Para tipo Color: hex + vista previa (la tienda usa variant.value como backgroundColor) */}
                            {attr.type === 'color' && (
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                <span className="text-xs text-neutral-500">Color (hex):</span>
                                <div
                                  className="w-10 h-10 rounded-xl border-2 border-neutral-600 shrink-0"
                                  style={{
                                    backgroundColor: variant.value && /^#[0-9A-Fa-f]{3,8}$/.test(variant.value.trim()) ? variant.value.trim() : 'transparent',
                                    boxShadow: variant.value && /^#[0-9A-Fa-f]{3,8}$/.test(variant.value.trim()) ? 'none' : 'inset 0 0 0 2px var(--tw-neutral-600)',
                                  }}
                                  title={variant.value || 'Sin color'}
                                />
                                <input
                                  type="text"
                                  value={variant.value || ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const normalized = normalizeHexColor(raw || '');
                                    updateVariant(attrIndex, variantIndex, { value: normalized || raw });
                                  }}
                                  placeholder="#RRGGBB o #RGB"
                                  className="min-h-[40px] w-28 px-2.5 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm font-mono"
                                />
                                <input
                                  type="color"
                                  value={variant.value && /^#[0-9A-Fa-f]{6}$/.test(variant.value.trim()) ? variant.value.trim() : '#000000'}
                                  onChange={(e) => updateVariant(attrIndex, variantIndex, { value: e.target.value })}
                                  className="w-10 h-10 cursor-pointer rounded-lg border border-neutral-600 p-0.5 bg-neutral-800 shrink-0"
                                  title="Elegir color"
                                />
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-neutral-700/50">
                              <label className="block text-xs text-neutral-500 mb-2">
                                Fotos de esta opción (opcional)
                              </label>
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-neutral-700 rounded-xl p-3 min-h-[52px] flex items-center">
                                  <input
                                    type="file"
                                    id={`variant-image-${attrIndex}-${variantIndex}`}
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleVariantImageUpload(attrIndex, variantIndex, e)}
                                    disabled={uploadingImages}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`variant-image-${attrIndex}-${variantIndex}`}
                                    className={`cursor-pointer flex items-center gap-3 w-full ${uploadingImages ? 'opacity-50 pointer-events-none' : ''} touch-manipulation`}
                                  >
                                    <div className="p-2 bg-neutral-800/50 rounded-lg flex-shrink-0">
                                      {uploadingImages ? (
                                        <Loader2 className="h-4 w-4 text-primary-400 animate-spin" />
                                      ) : (
                                        <Upload className="h-4 w-4 text-neutral-400" />
                                      )}
                                    </div>
                                    <span className="text-sm text-neutral-400">
                                      {uploadingImages ? 'Subiendo…' : 'Subir fotos'}
                                    </span>
                                  </label>
                                </div>

                                {/* Usar fotos ya subidas del producto */}
                                {formData.images.length > 0 ? (
                                  <div>
                                    <p className="text-xs text-neutral-500 mb-1.5 flex items-center gap-1.5">
                                      <ImagePlus className="h-3.5 w-3.5" />
                                      Usar una foto del producto (clic para asignar; botón para ver en grande)
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {formData.images.map((img, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-neutral-700 hover:border-primary-500/70 flex-shrink-0 group"
                                        >
                                          <Image
                                            src={img}
                                            alt=""
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                            unoptimized={img.startsWith('data:')}
                                          />
                                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              type="button"
                                              onClick={() => setProductImagePreviewUrl(img)}
                                              className="p-1.5 rounded-lg bg-neutral-800/90 hover:bg-primary-600 text-white transition-colors touch-manipulation"
                                              title="Ver en grande"
                                              aria-label="Ver imagen en grande"
                                            >
                                              <Expand className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => addProductImageToVariant(attrIndex, variantIndex, img)}
                                              className="p-1.5 rounded-lg bg-primary-600/90 hover:bg-primary-500 text-white transition-colors touch-manipulation"
                                              title="Añadir a esta opción"
                                              aria-label="Añadir esta foto a esta opción"
                                            >
                                              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-500">
                                    Sube fotos en «Fotos» arriba para poder asignarlas a las opciones aquí.
                                  </p>
                                )}

                                {/* Preview de imágenes */}
                                {(variant.images && variant.images.length > 0) && (
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {variant.images.map((img, imgIndex) => (
                                      <div key={imgIndex} className="relative group aspect-square">
                                        <Image
                                          src={img}
                                          alt={`Variant ${variant.name} image ${imgIndex + 1}`}
                                          width={60}
                                          height={60}
                                          className="w-full h-full object-cover rounded border border-neutral-700"
                                          unoptimized={img.startsWith('data:')}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeVariantImage(attrIndex, variantIndex, imgIndex)}
                                          className="absolute top-1 right-1 p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center bg-red-500/90 hover:bg-red-500 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                                          aria-label="Quitar imagen"
                                        >
                                          <X className="h-3 w-3 text-white" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Combinaciones: código, stock y precio por cada una (1 atributo = una fila por opción; 2+ = todas las combinaciones) */}
                {formData.attributes.filter((a) => a.variants.length > 0).length >= 1 && (
                  <div className="mt-6 pt-6 border-t border-neutral-700 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Combinaciones (código, stock y precio)</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Genera las filas y asigna a cada una su código, stock y precio. Con un solo tipo (ej. Color) habrá una fila por opción; con varios (ej. Color y Talla) se generan todas las combinaciones.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAllCombinations}
                        className="min-h-[40px]"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generar todas las combinaciones
                      </Button>
                    </div>
                    {formData.combinations.length > 0 && (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {/* Encabezados: identifican qué guarda cada columna */}
                        <div className="grid grid-cols-[1fr_auto_auto_1fr_auto] sm:grid-cols-[minmax(120px,1fr)_auto_auto_1fr_auto] items-center gap-2 sm:gap-3 px-1 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                          <span>Combinación (opción)</span>
                          <span className="w-16 sm:w-20 text-center">Stock</span>
                          <span className="w-16 sm:w-20 text-center">Precio (+$)</span>
                          <span className="min-w-[100px]">Código (SKU)</span>
                          <span className="w-10" aria-hidden />
                        </div>
                        {formData.combinations.map((combo, comboIndex) => {
                          const labelParts: string[] = [];
                          formData.attributes.forEach((attr) => {
                            const variantId = combo.selections[attr.id];
                            if (variantId) {
                              const v = attr.variants.find((x) => x.id === variantId);
                              labelParts.push(v?.name || v?.value || variantId);
                            }
                          });
                          const label = labelParts.join(' / ') || `Combinación ${comboIndex + 1}`;
                          const stockVal = combo.stock;
                          const priceVal = combo.priceModifier;
                          const safeStock = typeof stockVal === 'number' && !Number.isNaN(stockVal) ? Math.max(0, Math.floor(stockVal)) : 0;
                          const safePrice = typeof priceVal === 'number' && !Number.isNaN(priceVal) ? Math.max(0, Math.round(priceVal * 100) / 100) : 0;
                          return (
                            <div
                              key={combo.id}
                              className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-700/50 grid grid-cols-[1fr_auto_auto_1fr_auto] sm:grid-cols-[minmax(120px,1fr)_auto_auto_1fr_auto] items-center gap-2 sm:gap-3"
                            >
                              <span className="text-sm font-medium text-neutral-200 truncate min-w-0" title={label}>
                                {label}
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={combo.stock === undefined || combo.stock === null ? '' : safeStock}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    updateCombination(comboIndex, { stock: 0 });
                                    return;
                                  }
                                  const n = parseInt(raw, 10);
                                  if (Number.isNaN(n)) return;
                                  updateCombination(comboIndex, { stock: Math.max(0, Math.floor(n)) });
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="0"
                                className="w-16 sm:w-20 min-h-[44px] sm:min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label="Stock (entero, sin decimales)"
                              />
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.01}
                                value={combo.priceModifier === undefined || combo.priceModifier === null ? '' : safePrice}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    updateCombination(comboIndex, { priceModifier: 0 });
                                    return;
                                  }
                                  const n = parseFloat(raw.replace(',', '.'));
                                  if (Number.isNaN(n)) return;
                                  const rounded = Math.max(0, Math.round(n * 100) / 100);
                                  updateCombination(comboIndex, { priceModifier: rounded });
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="0.00"
                                className="w-16 sm:w-20 min-h-[44px] sm:min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label="Precio adicional (máx. 2 decimales)"
                              />
                              <input
                                type="text"
                                value={combo.sku ?? ''}
                                onChange={(e) => updateCombination(comboIndex, { sku: e.target.value })}
                                placeholder="Código"
                                className="min-w-[100px] min-h-[44px] sm:min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                aria-label="Código o SKU"
                              />
                              <button
                                type="button"
                                onClick={() => removeCombination(comboIndex)}
                                className="p-2.5 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center hover:bg-red-500/20 rounded-lg text-red-400 transition-colors touch-manipulation"
                                aria-label="Quitar combinación"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botones de acción */}
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col-reverse sm:flex-row gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/products')}
                    className="w-full sm:flex-1 min-h-[48px] sm:min-h-0 text-base sm:text-sm order-2 sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full sm:flex-1 min-h-[52px] sm:min-h-0 text-base sm:text-sm order-1 sm:order-2 font-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 mr-2 animate-spin" />
                        {dict.common.loading}
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                        {isEditing ? 'Actualizar producto' : 'Crear producto'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

        {/* Preview Lateral: en móvil debajo del formulario */}
        <div className="lg:col-span-1 order-2 lg:order-last">
          <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl lg:sticky lg:top-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-500/20 rounded-xl">
                <Eye className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-medium text-neutral-200">Vista previa</h3>
                <p className="text-xs sm:text-sm text-neutral-500">Así se verá en la tienda</p>
              </div>
            </div>
            <div className="space-y-4 overflow-hidden">
              {/* Imagen principal (de producto o variante/combinación) */}
              {previewDisplayImages.length > 0 ? (
                <div className="aspect-square max-h-[280px] sm:max-h-none rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <Image
                    src={previewDisplayImages[selectedPreviewImage] ?? previewDisplayImages[0]}
                    alt="Preview"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                    unoptimized={(previewDisplayImages[selectedPreviewImage] ?? previewDisplayImages[0])?.startsWith('data:')}
                  />
                </div>
              ) : (
                <div className="aspect-square max-h-[280px] sm:max-h-none rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-neutral-600" />
                </div>
              )}
              {previewDisplayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {previewDisplayImages.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPreviewImage(idx)}
                      className={cn(
                        'aspect-square rounded-lg overflow-hidden border-2 transition-all',
                        selectedPreviewImage === idx
                          ? 'border-primary-500 ring-2 ring-primary-400/50'
                          : 'border-neutral-700 hover:border-neutral-600'
                      )}
                    >
                      <Image
                        src={img}
                        alt=""
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                        unoptimized={img.startsWith('data:')}
                      />
                    </button>
                  ))}
                </div>
              )}
              {/* Título y precio (como en tienda pública) */}
              <div className="rounded-xl bg-neutral-800/50 border border-neutral-700/50 p-4">
                <h4 className="text-lg font-bold text-neutral-100 mb-1 line-clamp-2">
                  {formData.name || 'Nombre del producto'}
                </h4>
                <p className="text-xs sm:text-sm text-neutral-400 mb-3 line-clamp-2">
                  {formData.description || 'Descripción del producto...'}
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold text-primary-300">
                    {formData.currency === 'USD' ? '$' : ''}{(previewTotalPrice ?? 0).toFixed(2)}
                  </span>
                  {parseFloat(formData.basePrice || '0') > 0 && Math.abs((previewTotalPrice ?? 0) - parseFloat(formData.basePrice || '0')) > 0.001 && (
                    <span className="text-xs text-neutral-500">
                      Precio base: {formData.currency === 'USD' ? '$' : ''}{parseFloat(formData.basePrice || '0').toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              {/* Selectores de variantes (como en tienda pública) */}
              {formData.attributes.filter((a) => a.variants.length > 0).map((attr) => (
                <div key={attr.id} className="rounded-xl bg-neutral-800/30 border border-neutral-700 p-3">
                  <VariantSelector
                    attribute={attr}
                    selectedVariantId={previewSelectedVariants[attr.id] ?? null}
                    onSelect={(variantId) => setPreviewSelectedVariants((prev) => ({ ...prev, [attr.id]: variantId }))}
                    dict={dict}
                  />
                </div>
              ))}
              {/* Stock y cantidad (resumen como en tienda) */}
              <div className="rounded-xl bg-neutral-800/50 border border-neutral-700 p-3 space-y-2">
                <p className="text-sm font-medium text-neutral-200">Disponibilidad</p>
                {previewAvailableStock > 0 ? (
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                    {previewAvailableStock} disponibles
                  </p>
                ) : (
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                    Sin stock
                  </p>
                )}
                <p className="text-xs text-neutral-500">Cantidad: 1 (en la tienda el cliente elige)</p>
              </div>
              {formData.category && (
                <span className="inline-block px-2 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-xs border border-primary-500/30">
                  {categories.find(c => c.slug === formData.category)?.name ||
                    DEFAULT_CATEGORIES.find(c => c.value === formData.category)?.label ||
                    formData.category}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal: ver imagen del producto en grande (al asignar a variante) */}
    {productImagePreviewUrl &&
      createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85"
          onClick={() => setProductImagePreviewUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Ver imagen en grande"
        >
          <button
            type="button"
            onClick={() => setProductImagePreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors z-10"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={productImagePreviewUrl}
              alt="Vista en grande"
              width={800}
              height={800}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
              unoptimized={productImagePreviewUrl.startsWith('data:')}
            />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-neutral-400">
            Clic fuera o en X para cerrar
          </p>
        </div>,
        document.body
      )}

    </div>
  );
}
