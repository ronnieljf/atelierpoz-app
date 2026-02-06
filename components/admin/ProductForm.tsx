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
import { Plus, Trash2, X, Upload, Image as ImageIcon, Save, Zap, Copy, Sparkles, Loader2, Eye, HelpCircle, ChevronDown, Search, Check, ChevronRight, ChevronLeft } from 'lucide-react';
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [productDescription, setProductDescription] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAttributesHelp, setShowAttributesHelp] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  // Wizard: creación y edición. Pasos: 1 = IA + nombre + descripción, 2 = info básica, 3 = imágenes, 4 = variantes + guardar
  const [wizardStep, setWizardStep] = useState(1);
  const TOTAL_WIZARD_STEPS = 4;
  const isWizard = true;

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

  // Mostrar campos avanzados por defecto si se está editando, ocultos si se está creando
  const [showAdvanced, setShowAdvanced] = useState(isEditing);

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
        // Inicializar la imagen seleccionada en la vista previa
        if (product.images && product.images.length > 0) {
          setSelectedPreviewImage(0);
        }
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
      price: 0,
      stock: 0,
      sku: '',
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
      ...variant,
      id: `variant-${Date.now()}`,
      name: `${variant.name} (copia)`,
      images: variant.images ? [...variant.images] : [], // Copiar imágenes también
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

  /** Genera todas las combinaciones (producto cartesiano) de los atributos que tengan al menos una opción */
  const generateAllCombinations = () => {
    const attrs = formData.attributes.filter((a) => a.variants.length > 0);
    if (attrs.length < 2) {
      setSubmitMessage({ type: 'error', text: 'Necesitas al menos 2 tipos (ej. Color y Talla) con opciones para generar combinaciones.' });
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

  const generateTitleAndDescription = async () => {
    if (!productDescription.trim()) {
      setSubmitMessage({ type: 'error', text: 'Por favor escribe el nombre del producto y algunas palabras clave para generar con IA' });
      return;
    }

    setGeneratingContent(true);
    setSubmitMessage(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    try {
      // Generar nombre del producto (el backend sabe cómo tratarlo: descripción corta)
      const titleResponse = await fetch(`${backendUrl}/api/grok/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: productDescription.trim(),
          type: 'title',
        }),
      });

      if (!titleResponse.ok) {
        const errorData = await titleResponse.json();
        throw new Error(errorData.error || 'Error al generar el título');
      }

      const titleData = await titleResponse.json();

      // Intentar descripción: primero búsqueda, si no hay resultado generar descripción corta con IA
      let descriptionContent = '';
      const searchResponse = await fetch('/api/grok/search-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productDescription: productDescription.trim(),
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.found && searchData.description) {
          descriptionContent = searchData.description;
        }
      }

      // Si no hay descripción de búsqueda, generar descripción corta con la API
      if (!descriptionContent.trim()) {
        const descResponse = await fetch(`${backendUrl}/api/grok/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: productDescription.trim(),
            type: 'description',
          }),
        });
        if (descResponse.ok) {
          const descData = await descResponse.json();
          if (descData.content && descData.content.trim()) {
            descriptionContent = descData.content.trim();
          }
        }
      }

      // Actualizar los campos del formulario
      setFormData((prev) => ({
        ...prev,
        name: titleData.content || prev.name,
        description: descriptionContent,
      }));

      setSubmitMessage({ type: 'success', text: 'Título y descripción generados exitosamente' });
    } catch (error) {
      console.error('Error generando contenido:', error);
      let errorText = error instanceof Error ? error.message : 'Error al generar contenido con IA';
      
      if (errorText.includes('API key') || errorText.includes('incorrecta')) {
        errorText = 'La API key de Groq es incorrecta. Por favor, verifica tu clave en https://console.groq.com';
      }
      
      setSubmitMessage({
        type: 'error',
        text: errorText,
      });
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      if (!formData.name || !formData.categoryId) {
        throw new Error('Faltan datos obligatorios: nombre del producto y categoría.');
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
        attributes: formData.attributes.map((attr) => ({
          ...attr,
          variants: attr.variants.map((variant) => ({
            ...variant,
            price: variant.price || 0,
            stock: variant.stock || 0,
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

  return (
    <div className="min-h-screen bg-neutral-950 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Formulario Principal - 2 columnas */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-neutral-100">
                  {isEditing ? dict.admin.product.create.editTitle : dict.admin.product.create.title}
                </h1>
                <p className="text-sm text-neutral-500">
                  {isEditing ? 'Sigue los pasos para editar tu producto' : 'Sigue los pasos para crear tu producto'}
                </p>
                {!isWizard && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 bg-neutral-800/50 px-3 py-1.5 rounded-lg w-fit">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Ctrl+S para guardar</span>
                </div>
                )}
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

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Indicador de pasos del wizard (solo creación) */}
              {isWizard && (
                <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl">
                  <div className="flex items-center justify-between gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className="flex flex-1 items-center">
                        <button
                          type="button"
                          onClick={() => setWizardStep(s)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 sm:gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all',
                            wizardStep === s
                              ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                              : s < wizardStep
                                ? 'bg-neutral-800/50 text-neutral-300 border border-neutral-700 hover:bg-neutral-800'
                                : 'bg-neutral-800/30 text-neutral-500 border border-neutral-800'
                          )}
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-current/20 text-xs font-bold">
                            {s}
                          </span>
                          <span className="hidden sm:inline truncate">
                            {s === 1 ? 'Nombre' : s === 2 ? 'Info' : s === 3 ? 'Fotos' : 'Variantes'}
                          </span>
                        </button>
                        {s < TOTAL_WIZARD_STEPS && (
                          <ChevronRight className="h-4 w-4 text-neutral-600 flex-shrink-0 mx-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 1: Generar con IA + Nombre + Descripción (solo wizard) */}
              {(!isWizard || wizardStep === 1) && (
                <motion.div
                  key="step1"
                  initial={isWizard ? { opacity: 0, x: -12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5 sm:space-y-6"
                >
                  <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-medium text-neutral-200">Generar con IA</h2>
                        <p className="text-xs sm:text-sm text-neutral-500">Opcional: genera nombre y descripción automáticamente</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-neutral-300">
                        Escribe primero el nombre del producto y luego palabras clave separadas por comas
                      </label>
                      <input
                        type="text"
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Ej: Anillo de compromiso — plata, diamante, elegante, minimalista"
                        className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            generateTitleAndDescription();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={generateTitleAndDescription}
                        disabled={generatingContent || !productDescription.trim()}
                        className="flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto sm:min-h-0 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm font-medium shadow-lg"
                      >
                        {generatingContent ? (
                          <>
                            <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                            <span>Generando…</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 sm:h-4 sm:w-4" />
                            <span>Generar con IA</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs sm:text-sm text-neutral-500">
                        Pon el nombre del producto (o una idea breve) y, después, palabras clave (material, estilo, ocasión, etc.) para que la IA genere un nombre y descripción más precisos.
                      </p>
                    </div>
                  </div>

                  <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                    <h2 className="text-base sm:text-lg font-medium text-neutral-200 mb-4">Nombre y descripción</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          {dict.admin.product.create.name} <span className="text-red-400">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={dict.admin.product.create.namePlaceholder}
                          required
                          className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 sm:text-sm sm:min-h-0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          {dict.admin.product.create.description}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={dict.admin.product.create.descriptionPlaceholder}
                          rows={4}
                          className="w-full min-h-[100px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {isWizard && wizardStep === 1 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setWizardStep(2)}
                        disabled={!formData.name.trim()}
                        className="min-h-[48px]"
                      >
                        Siguiente
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Paso 2: Información básica (tienda, categoría, precio, etc.) */}
              {(!isWizard || wizardStep === 2) && (
                <motion.div
                  key="step2"
                  initial={isWizard && wizardStep === 2 ? { opacity: 0, x: 12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5 sm:space-y-6"
                >
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-primary-500/20 rounded-xl">
                    <Zap className="h-5 w-5 text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-medium text-neutral-200">Información básica</h2>
                    <p className="text-xs sm:text-sm text-neutral-500">Tienda, categoría, precio y stock</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      Tienda
                    </label>
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
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    >
                      {authState.stores.length === 0 && (
                      <option value="">Sin tiendas</option>
                      )}
                      {authState.stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      {dict.admin.product.create.category} <span className="text-red-400">*</span>
                      {loadingCategories && (
                        <span className="ml-2 text-primary-400 text-xs">(Cargando…)</span>
                      )}
                    </label>
                    <input
                      type="hidden"
                      name="categoryId"
                      value={formData.categoryId}
                      required
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => formData.storeId && setShowCategoryDialog(true)}
                      disabled={!formData.storeId || loadingCategories}
                      className={cn(
                        'w-full min-h-[48px] px-4 py-3.5 rounded-xl text-left flex items-center justify-between gap-2',
                        'bg-neutral-800/50 border border-neutral-700 text-base text-neutral-100',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all',
                        'disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg',
                        'hover:border-neutral-600'
                      )}
                    >
                      <span className="truncate">
                        {!formData.storeId
                          ? 'Selecciona primero una tienda'
                          : formData.categoryId
                            ? categories.find((c) => c.id === formData.categoryId)?.name ?? formData.category
                            : loadingCategories
                              ? 'Cargando…'
                              : 'Elige una categoría...'}
                      </span>
                      <ChevronDown className="h-5 w-5 flex-shrink-0 text-neutral-400" />
                    </button>
                    {formData.storeId && categories.length === 0 && !loadingCategories && (
                      <p className="text-xs sm:text-sm text-neutral-500 mt-2">
                        No hay categorías en esta tienda. Crea categorías en Admin → Categorías.
                      </p>
                    )}
                  </div>

                  {/* Diálogo de selección de categoría (portal para quedar siempre encima) */}
                  {typeof document !== 'undefined' && createPortal(
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
                              <h3 className="text-lg font-medium text-neutral-100">
                                Elegir categoría
                              </h3>
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
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      {dict.admin.product.create.sku} <span className="text-neutral-500 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder={dict.admin.product.create.skuPlaceholder}
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    />
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Si ingresas un código es más fácil identificar el producto después (ej: en inventario o pedidos).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      {dict.admin.product.create.basePrice} <span className="text-neutral-500 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="0.00"
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    />
                    <p className="mt-1 text-xs text-neutral-500">Si no tienes el precio aún, puedes dejarlo vacío y se guardará como 0.</p>
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      {dict.admin.product.create.currency}
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="VES">VES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      {dict.admin.product.create.stock}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                      Orden en tienda <span className="text-neutral-500 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      placeholder="Menor = aparece primero"
                      className="w-full min-h-[48px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Número menor se muestra antes en la página de la tienda. Vacío = al final.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-3 p-4 bg-neutral-800/30 border border-neutral-700 rounded-xl">
                      <input
                        type="checkbox"
                        id="visible-in-store"
                        checked={formData.visibleInStore}
                        onChange={(e) => setFormData({ ...formData, visibleInStore: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-900/50 text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0 cursor-pointer"
                      />
                      <label
                        htmlFor="visible-in-store"
                        className="flex-1 text-sm sm:text-base text-neutral-300 cursor-pointer select-none"
                      >
                        <span className="font-medium">Visible en la tienda</span>
                        <span className="block text-xs text-neutral-500 mt-1">
                          Si está marcado, el producto será visible para los clientes en la tienda pública
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-3 p-4 bg-neutral-800/30 border border-neutral-700 rounded-xl">
                      <input
                        type="checkbox"
                        id="hide-price"
                        checked={formData.hidePrice}
                        onChange={(e) => setFormData({ ...formData, hidePrice: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-900/50 text-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0 cursor-pointer"
                      />
                      <label
                        htmlFor="hide-price"
                        className="flex-1 text-sm sm:text-base text-neutral-300 cursor-pointer select-none"
                      >
                        <span className="font-medium">Ocultar precio</span>
                        <span className="block text-xs text-neutral-500 mt-1">
                          Si está marcado, el precio no se mostrará en la tienda pública (consultar precio)
                        </span>
                      </label>
                    </div>
                  </div>

                  {showAdvanced && !isWizard && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-2">
                        {dict.admin.product.create.description}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={dict.admin.product.create.descriptionPlaceholder}
                        rows={4}
                        className="w-full min-h-[120px] px-4 py-3.5 bg-neutral-800/50 border border-neutral-700 rounded-xl text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none sm:text-sm sm:min-h-0 sm:py-3 sm:rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

                  {isWizard && wizardStep === 2 && (
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWizardStep(1)}
                        className="min-h-[48px]"
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Atrás
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setWizardStep(3)}
                        disabled={!formData.categoryId}
                        className="min-h-[48px]"
                      >
                        Siguiente
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Paso 3: Imágenes */}
              {(!isWizard || wizardStep === 3) && (
                <motion.div
                  key="step3"
                  initial={isWizard && wizardStep === 3 ? { opacity: 0, x: 12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5 sm:space-y-6"
                >
              {/* Sección: Imágenes */}
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl">
                    <ImageIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-medium text-neutral-200">Fotos del producto</h2>
                    <p className="text-xs sm:text-sm text-neutral-500">Añade fotos para que se vea bien en la tienda</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-neutral-300 mb-3">
                    {dict.admin.product.create.images}
                  </label>
                  <div className="border-2 border-dashed border-neutral-700 rounded-xl p-5 sm:p-4 hover:border-primary-500/50 active:border-primary-500/70 transition-colors min-h-[100px] sm:min-h-0 flex items-center">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImages}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex items-center gap-4 w-full touch-manipulation ${uploadingImages ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div className="p-3 sm:p-2 bg-neutral-800/50 rounded-xl flex-shrink-0">
                        {uploadingImages ? (
                          <Loader2 className="h-6 w-6 sm:h-5 sm:w-5 text-primary-400 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 sm:h-5 sm:w-5 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base sm:text-sm font-medium text-neutral-300">
                          {uploadingImages ? 'Subiendo…' : 'Toca para subir fotos'}
                        </p>
                        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                          {uploadingImages ? 'Espera un momento' : 'Desde tu galería o cámara'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3 mt-5">
                      {formData.images.map((img, index) => (
                        <div 
                          key={index} 
                          className={`relative group aspect-square cursor-pointer transition-all rounded-xl overflow-hidden ${
                            selectedPreviewImage === index 
                              ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-neutral-900' 
                              : ''
                          }`}
                          onClick={() => setSelectedPreviewImage(index)}
                        >
                          <Image
                            src={img}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-full object-cover border border-neutral-700"
                            unoptimized={img.startsWith('data:')}
                          />
                          {selectedPreviewImage === index && (
                            <div className="absolute inset-0 bg-primary-500/20" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                              if (selectedPreviewImage === index) {
                                setSelectedPreviewImage(0);
                              } else if (selectedPreviewImage > index) {
                                setSelectedPreviewImage(selectedPreviewImage - 1);
                              }
                            }}
                            className="absolute top-1.5 right-1.5 p-2 min-w-[32px] min-h-[32px] flex items-center justify-center bg-red-500/90 hover:bg-red-500 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                            aria-label="Quitar imagen"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                  {isWizard && wizardStep === 3 && (
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWizardStep(2)}
                        className="min-h-[48px]"
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Atrás
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setWizardStep(4)}
                        className="min-h-[48px]"
                      >
                        Siguiente
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Paso 4: Variantes (opcional) + Crear producto */}
              {(!isWizard || wizardStep === 4) && (
                <motion.div
                  key="step4"
                  initial={isWizard && wizardStep === 4 ? { opacity: 0, x: 12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5 sm:space-y-6"
                >
              {/* Botón Avanzado (solo en modo edición; en wizard mostramos variantes directamente) */}
              {!isEditing && !isWizard && (
                <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-neutral-800/50 to-neutral-800/30 hover:from-neutral-700/50 hover:to-neutral-700/30 border border-neutral-700/50 hover:border-primary-500/50 rounded-xl text-neutral-300 hover:text-primary-400 transition-all duration-200 group"
                  >
                    <span className="text-sm font-medium">
                      {showAdvanced ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas'}
                    </span>
                    <motion.div
                      animate={{ rotate: showAdvanced ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg
                        className="w-5 h-5 text-neutral-400 group-hover:text-primary-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.div>
                  </button>
                </div>
              )}

              {/* Sección: Atributos y Variantes (en wizard paso 4 siempre visible; en edición si showAdvanced) */}
              {(showAdvanced || (isWizard && wizardStep === 4)) && (
                <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/20 rounded-xl">
                      <Sparkles className="h-5 w-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-medium text-neutral-200">Variantes (opcional)</h2>
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
                          Las variantes son las <strong className="text-neutral-200">opciones que el cliente elige</strong> antes de agregar al carrito. Puedes tener <strong className="text-neutral-200">varios tipos</strong> (ej. Color y Talla): agrega un tipo con &quot;Agregar tipo (Color, Talla…)&quot; y en cada tipo añade las opciones (ej. Rojo, Azul / M, L). Si el producto tiene Color y Talla, más abajo podrás <strong className="text-neutral-200">generar combinaciones</strong> (Rojo+M, Rojo+L, etc.) y definir stock y precio por cada una.
                        </p>

                        <div>
                          <h4 className="font-semibold text-blue-300 mb-2">Cómo se ve en la tienda pública</h4>
                          <ul className="space-y-2 text-xs sm:text-sm text-neutral-400 ml-4 list-disc space-y-1">
                            <li><strong className="text-neutral-200">Nombre del atributo</strong> (ej: Color, Talla) → Se muestra como título encima de las opciones.</li>
                            <li><strong className="text-neutral-200">Valor</strong> de cada opción → Es lo que el cliente ve y elige (ej: &quot;Rojo&quot;, &quot;M&quot;). En colores puede ser un código (#FF0000) y se muestra como círculo de color.</li>
                            <li><strong className="text-neutral-200">Precio adicional</strong> → Si esta opción cuesta más, se suma al precio base y se muestra en la tienda (ej: +$10).</li>
                            <li><strong className="text-neutral-200">Stock</strong> → Cantidad disponible; si es 0, la opción no se podrá elegir.</li>
                            <li><strong className="text-neutral-200">Fotos de la opción</strong> → Si subes fotos, al elegir esa opción el cliente verá esas imágenes en la ficha del producto.</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-blue-300 mb-2">Qué es obligatorio y qué es opcional</h4>
                          <ul className="space-y-1 text-xs sm:text-sm text-neutral-400 ml-4 list-disc">
                            <li><strong className="text-neutral-200">Obligatorio:</strong> Nombre del atributo (ej: Color), y en cada opción al menos el <strong className="text-neutral-200">Valor</strong> (lo que ve el cliente).</li>
                            <li><strong className="text-neutral-200">Opcional:</strong> Precio adicional (si no lo pones, no se suma nada). Stock (si no pones, se usa el stock general del producto). Código de la opción (solo para tu control). Fotos de la opción (solo si quieres mostrar una imagen distinta por color/talla).</li>
                          </ul>
                        </div>

                        <div className="bg-neutral-900/50 border border-blue-500/20 rounded-lg p-3 sm:p-4">
                          <h4 className="font-semibold text-blue-300 mb-2">Ejemplo rápido</h4>
                          <p className="text-xs sm:text-sm text-neutral-400">
                            Producto &quot;Pulsera&quot; → Atributo <strong className="text-neutral-200">Color</strong> con opciones: <strong className="text-neutral-200">Rojo</strong> (valor: #FF0000), <strong className="text-neutral-200">Azul</strong> (valor: #0000FF). En la tienda el cliente verá &quot;Color&quot; y podrá elegir Rojo o Azul; si una opción tiene precio adicional, se sumará al precio base.
                          </p>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-xs sm:text-sm text-green-200">
                            <strong>Resumen:</strong> Solo necesitas el nombre del atributo (Color, Talla, etc.) y el valor de cada opción (lo que verá el cliente). El resto es opcional.
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

                      {/* Variantes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-neutral-500">Opciones</span>
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
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-1.5">
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Nombre"
                                className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:col-span-1 sm:text-xs"
                              />
                              <input
                                type="text"
                                value={variant.value}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="Valor"
                                className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:col-span-1 sm:text-xs"
                              />
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={variant.price || ''}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="+$"
                                className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:col-span-1 sm:text-xs"
                              />
                              <input
                                type="number"
                                inputMode="numeric"
                                value={variant.stock || ''}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    stock: parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="Stock"
                                className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:col-span-1 sm:text-xs"
                              />
                              <input
                                type="text"
                                value={variant.sku || ''}
                                onChange={(e) =>
                                  updateVariant(attrIndex, variantIndex, {
                                    sku: e.target.value,
                                  })
                                }
                                placeholder="Código"
                                className="min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:py-1.5 bg-neutral-800/50 border border-neutral-700 rounded-xl sm:rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:col-span-1 sm:text-xs"
                              />
                              <div className="flex gap-2 sm:gap-1 sm:col-span-2 sm:col-span-1">
                                <button
                                  type="button"
                                  onClick={() => duplicateVariant(attrIndex, variantIndex)}
                                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 p-2.5 sm:p-1.5 flex items-center justify-center hover:bg-primary-500/20 rounded-xl sm:rounded text-primary-400 transition-colors touch-manipulation"
                                  title="Duplicar"
                                >
                                  <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeVariant(attrIndex, variantIndex)}
                                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 p-2.5 sm:p-1.5 flex items-center justify-center hover:bg-red-500/20 rounded-xl sm:rounded text-red-400 transition-colors touch-manipulation"
                                  aria-label="Quitar opción"
                                >
                                  <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-neutral-700/50">
                              <label className="block text-xs text-neutral-500 mb-2">
                                Fotos de esta opción (opcional)
                              </label>
                              <div className="space-y-2">
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

                {/* Combinaciones (Color × Talla): stock y precio por combinación */}
                {formData.attributes.filter((a) => a.variants.length > 0).length >= 2 && (
                  <div className="mt-6 pt-6 border-t border-neutral-700 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">Combinaciones (ej. Color × Talla)</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Stock y precio adicional por cada combinación. En la tienda el cliente elige Color y Talla; se usa la combinación que coincida.
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
                          return (
                            <div
                              key={combo.id}
                              className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-700/50 flex flex-wrap items-center gap-2 sm:gap-3"
                            >
                              <span className="w-full sm:w-auto sm:min-w-[120px] text-sm font-medium text-neutral-200 truncate" title={label}>
                                {label}
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={combo.stock ?? ''}
                                onChange={(e) => updateCombination(comboIndex, { stock: parseInt(e.target.value, 10) || 0 })}
                                placeholder="Stock"
                                className="w-20 min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={combo.priceModifier ?? ''}
                                onChange={(e) => updateCombination(comboIndex, { priceModifier: parseFloat(e.target.value) || 0 })}
                                placeholder="+$"
                                className="w-20 min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                              <input
                                type="text"
                                value={combo.sku ?? ''}
                                onChange={(e) => updateCombination(comboIndex, { sku: e.target.value })}
                                placeholder="Código"
                                className="flex-1 min-w-0 min-h-[36px] px-2 py-1.5 bg-neutral-800/50 border border-neutral-700 rounded text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                              />
                              <button
                                type="button"
                                onClick={() => removeCombination(comboIndex)}
                                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
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
              )}

              {/* Botones de Acción (en wizard solo en paso 4; en edición siempre) */}
              {(!isWizard || wizardStep === 4) && (
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col-reverse sm:flex-row gap-4 sm:gap-4">
                  {isWizard && wizardStep === 4 ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWizardStep(3)}
                        className="w-full sm:flex-1 min-h-[48px] sm:min-h-0 text-base sm:text-sm order-2 sm:order-1"
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" />
                        Atrás
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/admin/products')}
                        className="w-full sm:flex-1 min-h-[48px] sm:min-h-0 text-base sm:text-sm"
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
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
              )}
                </motion.div>
              )}
            </form>
          </div>

        {/* Preview Lateral: lo más parecido a la tienda pública, con variantes */}
        <div className="lg:col-span-1 order-first lg:order-last">
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
                <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center">
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
                <div className="aspect-square rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
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

    </div>
  );
}
