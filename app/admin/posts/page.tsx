'use client';

import { useState, useEffect } from 'react';
import { getAllPosts, deletePost, publishPostToInstagram } from '@/lib/services/posts';
import { getMetaIntegrationStatus } from '@/lib/services/meta';
import { type Post } from '@/types/post';
import { getDictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, Instagram, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import Image from 'next/image';
import { InstagramConnection } from '@/components/admin/InstagramConnection';

const dict = getDictionary('es');

export default function PostsListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
    getMetaIntegrationStatus().then((status) => setInstagramConnected(status.connected));
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      setMessage({ type: 'error', text: 'Error al cargar posts' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este post?')) return;

    try {
      const success = await deletePost(id);
      if (success) {
        setMessage({ type: 'success', text: 'Post eliminado exitosamente' });
        loadPosts();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar el post' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar el post' });
    }
  };

  const handlePublishToInstagram = async (postId: string) => {
    setPublishingId(postId);
    setMessage(null);
    try {
      const result = await publishPostToInstagram(postId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Post publicado en Instagram correctamente' });
        await loadPosts();
        getMetaIntegrationStatus().then((s) => setInstagramConnected(s.connected));
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al publicar en Instagram' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error al publicar en Instagram' });
    } finally {
      setPublishingId(null);
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-neutral-100 mb-1 sm:mb-2">
            Posts
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Link href="/admin/posts/create" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Crear Post
            </Button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-6 p-3 sm:p-4 rounded-xl border',
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6">
        <InstagramConnection />
      </div>

      {posts.length === 0 ? (
        <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-12 text-center">
          <Instagram className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-xl font-light text-neutral-200 mb-2">
            No hay posts
          </h3>
          <p className="text-neutral-400 mb-6">
            Crea tu primer post para Instagram
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/admin/posts/create">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Crear Post
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-2xl sm:rounded-3xl overflow-hidden hover:border-neutral-700 transition-colors"
            >
              {/* Preview Image */}
              <div className="aspect-square bg-neutral-800 relative">
                {post.images && post.images.length > 0 ? (
                  <Image
                    src={post.images[0].startsWith('data:') ? post.images[0] : post.images[0]}
                    alt={post.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                    unoptimized={post.images[0].startsWith('data:')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-neutral-600" />
                  </div>
                )}
                {post.images.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    +{post.images.length - 1}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 sm:p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm sm:text-base font-medium text-neutral-100 line-clamp-2 flex-1">
                    {post.title}
                  </h3>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <Instagram className="h-4 w-4 text-pink-500" />
                  </div>
                </div>

                <p className="text-xs text-neutral-400 mb-3 line-clamp-2">
                  {post.description || 'Sin descripción'}
                </p>

                {post.hashtags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-blue-400 line-clamp-1">
                      {post.hashtags.slice(0, 3).join(' ')}
                      {post.hashtags.length > 3 && '...'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                  <span className="text-xs text-neutral-500">
                    {post.status === 'published' ? (
                      <span className="text-green-500/90">Publicado en Instagram</span>
                    ) : (
                      <>{post.selectedProducts.length} productos</>
                    )}
                  </span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {post.status === 'draft' && instagramConnected && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublishToInstagram(post.id)}
                        disabled={!!publishingId}
                        className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0"
                      >
                        {publishingId === post.id ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Publicar en Instagram</span>
                          </>
                        )}
                      </Button>
                    )}
                    <Link href={`/admin/posts/${post.id}/edit`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      className="text-red-400 hover:text-red-300 hover:border-red-500/50 text-xs"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
