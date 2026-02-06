'use client';

import { useState, useEffect } from 'react';
import { getMetaIntegrationStatus, initiateMetaAuth, disconnectMeta, type MetaIntegrationStatus } from '@/lib/services/meta';
import { Button } from '@/components/ui/Button';
import { Instagram, CheckCircle2, XCircle, Loader2, Link2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export function InstagramConnection() {
  const [status, setStatus] = useState<MetaIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Verificar si hay mensajes en la URL (después del callback de OAuth)
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    
    if (success) {
      setMessage({ type: 'success', text: decodeURIComponent(success) });
      // Limpiar la URL
      window.history.replaceState({}, '', window.location.pathname);
      loadStatus();
    }
    
    if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      // Limpiar la URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const integrationStatus = await getMetaIntegrationStatus();
      setStatus(integrationStatus);
    } catch (error) {
      console.error('Error loading Instagram status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    
    try {
      const { authUrl } = await initiateMetaAuth();
      // Redirigir al usuario a Meta para autorizar
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Instagram connection:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al conectar con Instagram',
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de desconectar tu cuenta de Instagram?')) {
      return;
    }

    setDisconnecting(true);
    setMessage(null);

    try {
      const success = await disconnectMeta();
      if (success) {
        setMessage({ type: 'success', text: 'Cuenta de Instagram desconectada exitosamente' });
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: 'Error al desconectar la cuenta' });
      }
    } catch (error) {
      console.error('Error disconnecting Instagram:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al desconectar',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-neutral-400 animate-spin" />
          <span className="text-neutral-400">Verificando conexión...</span>
        </div>
      </div>
    );
  }

  const isConnected = status?.connected && status?.integration && !status.integration.isExpired;

  return (
    <div className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isConnected ? 'bg-green-500/20' : 'bg-neutral-800'
          )}>
            <Instagram className={cn(
              'h-5 w-5',
              isConnected ? 'text-green-400' : 'text-neutral-400'
            )} />
          </div>
          <div>
            <h3 className="text-base font-medium text-neutral-100">
              Conexión con Instagram
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isConnected ? 'Conectado y listo para publicar' : 'Conecta tu cuenta para publicar automáticamente'}
            </p>
          </div>
        </div>
        <AnimatePresence>
          {isConnected ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <XCircle className="h-5 w-5 text-neutral-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-4 p-3 rounded-lg border text-sm',
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {isConnected && status.integration ? (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Página de Facebook</span>
              <span className="text-sm text-neutral-200 font-medium">
                {status.integration.pageName || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Cuenta de Instagram</span>
              <span className="text-sm text-neutral-200 font-medium">
                @{status.integration.instagramUsername || 'N/A'}
              </span>
            </div>
            {status.integration.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Token expira</span>
                <span className="text-sm text-neutral-200">
                  {new Date(status.integration.expiresAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full"
          >
            {disconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Desconectando...
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar Instagram
              </>
            )}
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-neutral-400 mb-4">
            Conecta tu cuenta de Instagram Business para publicar posts automáticamente cuando los crees con estado &quot;Publicado&quot;.
          </p>
          <Button
            variant="primary"
            onClick={handleConnect}
            disabled={connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Conectar Instagram
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
