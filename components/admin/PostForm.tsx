'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type Post, type PostFormData } from '@/types/post';
import { type Product } from '@/types/product';
import { getDictionary } from '@/lib/i18n/dictionary';
import { getPostById, createPost, updatePost } from '@/lib/services/posts';
import { getAdminProducts } from '@/lib/services/products';
import { useAuth } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/Button';
import { X, Save, Instagram, Hash, Image as ImageIcon, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, Search, Heart, MessageCircle, Send, Bookmark, Store } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const dict = getDictionary('es');

interface PostFormProps {
  postId?: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Tienda',
  2: 'Productos',
  3: 'Imágenes',
  4: 'Contenido',
  5: 'Configuración',
  6: 'Vista Previa',
};

export function PostForm({ postId }: PostFormProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const isEditing = !!postId;
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    description: '',
    hashtags: '',
    images: [],
    selectedProducts: [],
    platform: 'instagram' as const,
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Imágenes seleccionadas manualmente
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda para productos
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [productPage, setProductPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);

  const PRODUCTS_PAGE_SIZE = 12;
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);

  useEffect(() => {
    if (isEditing && postId) {
      loadPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, postId]);

  useEffect(() => {
    setProductPage(1);
  }, [searchTerm]);

  // Obtener todas las imágenes disponibles de los productos seleccionados
  const availableImages = useMemo(() => {
    const selectedProductsData = products.filter(p => formData.selectedProducts.includes(p.id));
    const allImages: Array<{ url: string; productId: string; productName: string }> = [];
    
    selectedProductsData.forEach(product => {
      if (product.images && product.images.length > 0) {
        product.images.forEach(img => {
          allImages.push({
            url: img,
            productId: product.id,
            productName: product.name,
          });
        });
      }
    });

    return allImages;
  }, [formData.selectedProducts, products]);

  // Filtrar productos por término de búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return products;
    }
    const term = searchTerm.toLowerCase().trim();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Paginación de productos (para paso 2)
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * PRODUCTS_PAGE_SIZE;
    return filteredProducts.slice(start, start + PRODUCTS_PAGE_SIZE);
  }, [filteredProducts, productPage]);

  const loadProducts = async (storeId: string): Promise<void> => {
    setLoadingProducts(true);
    setSubmitMessage(null);
    try {
      const { products: list } = await getAdminProducts(storeId, { limit: 500, offset: 0 });
      setProducts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setSubmitMessage({ type: 'error', text: 'No se pudieron cargar los productos de la tienda.' });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPost = async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const post = await getPostById(postId);
      if (post) {
        if (post.storeId) {
          setSelectedStoreId(post.storeId);
        } else if (authState.stores.length > 0) {
          setSelectedStoreId(authState.stores[0].id);
        }
        setFormData({
          title: post.title,
          description: post.description,
          hashtags: post.hashtags.join(' '),
          images: post.images,
          selectedProducts: post.selectedProducts,
          platform: post.platform,
          scheduledAt: post.scheduledAt,
        });
        setSelectedImages(post.images);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      setSubmitMessage({ type: 'error', text: 'Error al cargar el post' });
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async (type: 'title' | 'description' | 'hashtags' | 'instagram_title' | 'instagram_description') => {
    if (formData.selectedProducts.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Primero selecciona al menos un producto' });
      return;
    }

    const selectedProductsData = products.filter(p => formData.selectedProducts.includes(p.id));
    
    const productsContext = selectedProductsData
      .map(p => {
        const category = p.category || 'Producto';
        return `${category}: ${p.name} - ${p.currency} ${p.basePrice.toFixed(2)}${p.description ? ` - ${p.description.substring(0, 150)}` : ''}`;
      })
      .join('\n');

    const isTitle = type === 'title' || type === 'instagram_title';
    const isDesc = type === 'description' || type === 'instagram_description';

    let prompt = '';
    if (type === 'hashtags') {
      prompt = `Genera hashtags relevantes y populares para un post de Instagram sobre estos productos:\n\n${productsContext}\n\nLos hashtags deben ser:\n- Relevantes al tipo de productos\n- Populares en Instagram\n- Entre 10-15 hashtags\n- Separados por espacios\n- Sin el símbolo # (solo el texto)\n\nResponde SOLO con los hashtags separados por espacios, sin explicaciones adicionales.`;
    } else if (isTitle) {
      prompt = `Productos para el post:\n\n${productsContext}\n\nGenera un título corto e impactante para el post de Instagram. Máximo 60 caracteres. Adapta el estilo al tipo de productos.`;
    } else {
      prompt = `Productos para el post:\n\n${productsContext}\n\nGenera la descripción (caption) del post de Instagram: persuasiva, destacando beneficios y creando deseo de compra. Adapta el tono al tipo de productos.`;
    }

    if (isTitle) {
      setGeneratingTitle(true);
    } else if (isDesc) {
      setGeneratingDescription(true);
    } else {
      setGeneratingHashtags(true);
    }

    setSubmitMessage(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    try {
      const response = await fetch(`${backendUrl}/api/grok/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.details || 'Error al generar con IA';
        console.error('Error de API:', errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (type === 'title' || type === 'instagram_title') {
        setFormData(prev => ({ ...prev, title: data.content }));
      } else if (type === 'description' || type === 'instagram_description') {
        setFormData(prev => ({ ...prev, description: data.content }));
      } else if (type === 'hashtags') {
        const hashtags = data.content
          .split(' ')
          .filter((tag: string) => tag.trim())
          .map((tag: string) => {
            const trimmed = tag.trim();
            return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
          })
          .join(' ');
        setFormData(prev => ({ ...prev, hashtags }));
      }
    } catch (error) {
      console.error('Error generando con IA:', error);
      let errorText = error instanceof Error ? error.message : 'Error al generar con IA';
      
      if (errorText.includes('API key') || errorText.includes('incorrecta')) {
        errorText = 'La API key de Groq es incorrecta. Por favor, verifica tu clave en https://console.groq.com';
      }
      
      setSubmitMessage({
        type: 'error',
        text: errorText,
      });
    } finally {
      if (type === 'title' || type === 'instagram_title') {
        setGeneratingTitle(false);
      } else if (type === 'description' || type === 'instagram_description') {
        setGeneratingDescription(false);
      } else {
        setGeneratingHashtags(false);
      }
    }
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => {
      if (prev.selectedProducts.includes(productId)) {
        return {
          ...prev,
          selectedProducts: prev.selectedProducts.filter((id) => id !== productId),
        };
      } else {
        if (prev.selectedProducts.length >= 10) {
          setSubmitMessage({ type: 'error', text: 'Máximo 10 productos permitidos' });
          return prev;
        }
        return {
          ...prev,
          selectedProducts: [...prev.selectedProducts, productId],
        };
      }
    });
  };

  const toggleImage = (imageUrl: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(img => img !== imageUrl);
      } else {
        if (prev.length >= 10) {
          setSubmitMessage({ type: 'error', text: 'Máximo 10 imágenes permitidas' });
          return prev;
        }
        return [...prev, imageUrl];
      }
    });
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return selectedStoreId != null;
      case 2:
        return formData.selectedProducts.length > 0;
      case 3:
        return selectedImages.length > 0 && selectedImages.length <= 10;
      case 4:
        return formData.title.trim().length > 0;
      case 5:
        return true; // Siempre true porque platform es siempre 'instagram'
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canGoNext()) {
      setSubmitMessage({ type: 'error', text: 'Por favor completa los campos requeridos' });
      return;
    }

    // Al salir del paso 1 (Tienda), cargar productos y esperar antes de pasar al paso 2
    if (currentStep === 1 && selectedStoreId) {
      setSubmitMessage(null);
      await loadProducts(selectedStoreId);
      setCurrentStep(2);
      return;
    }

    if (currentStep === 3) {
      // Al pasar del paso 3 (imágenes), actualizar las imágenes en formData
      setFormData(prev => ({ ...prev, images: selectedImages }));
    }

    if (currentStep < 6) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
      setSubmitMessage(null);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
      setSubmitMessage(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      if (!formData.title || formData.selectedProducts.length === 0) {
        throw new Error('Título y al menos un producto son requeridos');
      }

      if (selectedImages.length === 0) {
        throw new Error('Debes seleccionar al menos una imagen');
      }

      const hashtagsArray = formData.hashtags
        .split(' ')
        .filter(tag => tag.trim().startsWith('#') || tag.trim() !== '')
        .map(tag => tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`);

      const postData: Omit<Post, 'id' | 'createdAt'> = {
        title: formData.title,
        description: formData.description,
        hashtags: hashtagsArray,
        images: selectedImages,
        selectedProducts: formData.selectedProducts,
        platform: formData.platform,
        scheduledAt: formData.scheduledAt,
        status: 'draft',
      };

      if (isEditing && postId) {
        const updated = await updatePost(postId, postData);
        if (!updated) {
          throw new Error('Error al actualizar el post');
        }
      } else {
        await createPost(postData, selectedStoreId ?? undefined);
      }

      // Mostrar mensaje de éxito brevemente antes de redirigir
      setSubmitMessage({ 
        type: 'success', 
        text: isEditing ? 'Post actualizado exitosamente' : 'Post creado exitosamente' 
      });

      // Redirigir después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        router.push('/admin/posts');
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al guardar el post',
      });
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
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-neutral-100 mb-2">
          {isEditing ? 'Editar Post' : 'Crear Nuevo Post'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Sigue los pasos para crear tu post de redes sociales
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          {([1, 2, 3, 4, 5, 6] as const).map((step) => {
            const stepNum = step as WizardStep;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            const isAccessible = currentStep >= stepNum;

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => isAccessible && setCurrentStep(stepNum)}
                    disabled={!isAccessible}
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all mb-2',
                      isCompleted
                        ? 'bg-primary-500 text-white'
                        : isActive
                        ? 'bg-primary-500 text-white ring-4 ring-primary-500/20'
                        : 'bg-neutral-800 text-neutral-500 border-2 border-neutral-700',
                      isAccessible && 'hover:scale-105 cursor-pointer',
                      !isAccessible && 'cursor-not-allowed'
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : step}
                  </button>
                  <span className={cn(
                    'text-[10px] sm:text-xs text-center hidden sm:block',
                    isActive ? 'text-primary-400 font-medium' : 'text-neutral-500'
                  )}>
                    {STEP_LABELS[stepNum]}
                  </span>
                </div>
                {step < 6 && (
                  <div className={cn(
                    'h-0.5 flex-1 mx-1 sm:mx-2 transition-all',
                    isCompleted ? 'bg-primary-500' : 'bg-neutral-800'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-xl sm:rounded-2xl lg:rounded-3xl p-3 sm:p-6 lg:p-8 shadow-2xl min-h-[500px] relative">
        {/* Loading Overlay */}
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/90 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl z-50 flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="h-12 w-12 text-primary-500 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-neutral-100 mb-1">
                {isEditing ? 'Actualizando post...' : 'Creando post...'}
              </p>
              <p className="text-sm text-neutral-400">
                Por favor espera un momento
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'mb-4 sm:mb-6 p-3 rounded-xl border text-sm',
                submitMessage.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              )}
            >
              {submitMessage.text}
            </motion.div>
          )}

          {/* Step 1: Seleccionar Tienda */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  1. Selecciona la tienda
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                  Elige la tienda para la que crearás el post. Los productos e imágenes serán de esta tienda.
                </p>
                <div className="space-y-2 border border-neutral-700 rounded-lg sm:rounded-xl p-3 bg-neutral-800/30">
                  {authState.stores.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-6">
                      No tienes tiendas disponibles. Crea una tienda primero desde el menú Tiendas.
                    </p>
                  ) : (
                    authState.stores
                      .filter((s: { state?: string }) => s.state === 'active' || !s.state)
                      .map((store: { id: string; name: string; logo?: string | null }) => (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => {
                            setSelectedStoreId(store.id);
                            setFormData(prev => ({ ...prev, selectedProducts: [] }));
                            setSelectedImages([]);
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                            selectedStoreId === store.id
                              ? 'bg-primary-500/20 border-primary-500/50'
                              : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                          )}
                        >
                          {store.logo ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-700 flex-shrink-0">
                              <Image
                                src={store.logo}
                                alt={store.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                              <Store className="h-6 w-6 text-neutral-500" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-neutral-100">{store.name}</span>
                          {selectedStoreId === store.id && (
                            <div className="ml-auto w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Seleccionar Productos */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  2. Selecciona los Productos
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                  Elige los productos que quieres incluir en tu post ({formData.selectedProducts.length}/10)
                </p>
                
                {/* Buscador */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar productos por nombre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {searchTerm && (
                  <p className="text-xs text-neutral-400 mb-3">
                    {filteredProducts.length === 0
                      ? 'No se encontraron productos'
                      : `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''}`
                    }
                  </p>
                )}

                <div className="border border-neutral-700 rounded-xl p-4 sm:p-5 bg-neutral-800/30">
                  {loadingProducts ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
                      <p className="text-sm text-neutral-400">Cargando productos...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <p className="text-sm text-neutral-400 text-center py-12">
                      No hay productos en esta tienda. Agrega productos desde <strong>Catálogo → Productos</strong> y vuelve a crear el post.
                    </p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-12">
                      No se encontraron productos que coincidan con &quot;{searchTerm}&quot;
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5">
                        {paginatedProducts.map((product) => {
                          const isSelected = formData.selectedProducts.includes(product.id);
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleProduct(product.id)}
                              disabled={!isSelected && formData.selectedProducts.length >= 10}
                              className={cn(
                                'group relative flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left',
                                isSelected
                                  ? 'bg-primary-500/15 border-primary-500 ring-2 ring-primary-500/40'
                                  : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/80',
                                !isSelected && formData.selectedProducts.length >= 10 && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <div className="aspect-square w-full bg-neutral-700/80 relative">
                                {product.images && product.images.length > 0 ? (
                                  <Image
                                    src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    unoptimized={product.images[0].startsWith('data:')}
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-neutral-600" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                                    <Check className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex-1 flex flex-col min-h-0">
                                <p className="text-sm font-medium text-neutral-100 line-clamp-2 leading-snug">
                                  {product.name}
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                  {product.currency} {product.basePrice.toFixed(2)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {totalProductPages > 1 && (
                        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-neutral-700">
                          <button
                            type="button"
                            onClick={() => setProductPage(p => Math.max(1, p - 1))}
                            disabled={productPage <= 1}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                          </button>
                          <span className="text-sm text-neutral-400">
                            Página {productPage} de {totalProductPages}
                            {filteredProducts.length > 0 && (
                              <span className="text-neutral-500 font-normal">
                                {' '}({filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                            disabled={productPage >= totalProductPages}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                          >
                            Siguiente
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Seleccionar Imágenes */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  3. Selecciona las Imágenes
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                  Elige las imágenes de los productos seleccionados ({selectedImages.length}/10)
                </p>
                {availableImages.length === 0 ? (
                  <div className="text-center py-12 border border-neutral-700 rounded-lg bg-neutral-800/30">
                    <ImageIcon className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400">
                      Los productos seleccionados no tienen imágenes disponibles
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      Vuelve al paso anterior y selecciona productos con imágenes
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableImages.map((imgData, index) => {
                      const isSelected = selectedImages.includes(imgData.url);
                      return (
                        <button
                          key={`${imgData.productId}-${index}`}
                          type="button"
                          onClick={() => toggleImage(imgData.url)}
                          disabled={!isSelected && selectedImages.length >= 10}
                          className={cn(
                            'relative aspect-square rounded-lg overflow-hidden border-2 transition-all group',
                            isSelected
                              ? 'border-primary-500 ring-2 ring-primary-500/50'
                              : 'border-neutral-700 hover:border-neutral-600',
                            !isSelected && selectedImages.length >= 10 && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Image
                            src={imgData.url.startsWith('data:') ? imgData.url : imgData.url}
                            alt={imgData.productName}
                            fill
                            className="object-cover"
                            unoptimized={imgData.url.startsWith('data:')}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                                <Check className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                            <p className="text-[10px] text-white truncate">{imgData.productName}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Título y Descripción */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  4. Título y Descripción
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                  Crea el contenido de tu post
                </p>
              </div>

              {/* Título */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                  <label className="block text-sm font-medium text-neutral-400">
                    Título *
                  </label>
                  <button
                    type="button"
                    onClick={() => generateWithAI('instagram_title')}
                    disabled={generatingTitle || formData.selectedProducts.length === 0}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {generatingTitle ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>Generar con IA</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título del post..."
                  required
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg sm:rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:text-base"
                />
              </div>

              {/* Descripción */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                  <label className="block text-sm font-medium text-neutral-400">
                    Descripción
                  </label>
                  <button
                    type="button"
                    onClick={() => generateWithAI('instagram_description')}
                    disabled={generatingDescription || formData.selectedProducts.length === 0}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {generatingDescription ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>Generar con IA</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Escribe la descripción del post..."
                  rows={6}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg sm:rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none text-sm sm:text-base leading-relaxed"
                />
              </div>
            </motion.div>
          )}

          {/* Step 5: Hashtags y Plataforma */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  5. Hashtags y Plataforma
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                  Completa la configuración final
                </p>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                  <label className="block text-sm font-medium text-neutral-400">
                    Hashtags
                  </label>
                  <button
                    type="button"
                    onClick={() => generateWithAI('hashtags')}
                    disabled={generatingHashtags || formData.selectedProducts.length === 0}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {generatingHashtags ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>Generar con IA</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    value={formData.hashtags}
                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                    placeholder="#hashtag1 #hashtag2 #hashtag3"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-lg sm:rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm sm:text-base"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Separa los hashtags con espacios. Se agregará # automáticamente si falta.
                </p>
              </div>

              {/* Plataforma - Solo Instagram */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-3">
                  Plataforma
                </label>
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg">
                  <Instagram className="h-6 w-6 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-100">Instagram</p>
                    <p className="text-xs text-neutral-400">Los posts se crearán exclusivamente para Instagram</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 6: Vista Previa */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-neutral-100 mb-2">
                  6. Vista Previa
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mb-6">
                  Revisa tu post antes de publicarlo
                </p>
              </div>

              {/* Preview */}
              {!formData.platform && (
                <div className="text-center py-12 border border-neutral-700 rounded-lg bg-neutral-800/30">
                  <p className="text-sm text-neutral-400">
                    Selecciona una plataforma en el paso anterior para ver la vista previa
                  </p>
                </div>
              )}

              {/* Vista previa Instagram */}
              {formData.platform && (
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-black">atelierpoz</p>
                      </div>
                      {selectedImages.length > 0 ? (
                        <div className="aspect-square bg-neutral-100">
                          <Image
                            src={selectedImages[0]}
                            alt="Preview"
                            width={400}
                            height={400}
                            className="w-full h-full object-cover"
                            unoptimized={selectedImages[0].startsWith('data:')}
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-neutral-100 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-neutral-400" />
                        </div>
                      )}
                      <div className="px-3 py-2 space-y-2">
                        <div className="flex items-center gap-4">
                          <Heart className="h-5 w-5 text-black" strokeWidth={2} fill="none" />
                          <MessageCircle className="h-5 w-5 text-black" strokeWidth={2} />
                          <Send className="h-5 w-5 text-black" strokeWidth={2} />
                          <Bookmark className="h-5 w-5 text-black ml-auto" strokeWidth={2} fill="none" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-black mb-1">atelierpoz</p>
                          <p className="text-xs text-black whitespace-pre-wrap break-words">
                            {formData.title ? `${formData.title}\n\n` : ''}
                            {formData.description || 'Descripción del post...'}
                          </p>
                          {formData.hashtags && (
                            <p className="text-xs text-blue-600 mt-1 break-words">
                              {formData.hashtags.split(' ').filter(t => t).map(tag => 
                                tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`
                              ).join(' ')}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500">Hace unos momentos</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-neutral-800">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => router.push('/admin/posts') : handlePrevious}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{currentStep === 1 ? 'Cancelar' : 'Anterior'}</span>
          </Button>

          {currentStep < 6 ? (
            <Button
              type="button"
              onClick={() => void handleNext()}
              disabled={!canGoNext() || isSubmitting || (currentStep === 1 && loadingProducts)}
              className="flex items-center gap-2"
            >
              {currentStep === 1 && loadingProducts ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando productos...</span>
                </>
              ) : (
                <>
                  <span>Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canGoNext() || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isEditing ? 'Actualizar' : 'Crear'} Post</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
