import { httpClient } from '@/lib/http/client';

/**
 * Servicio para gestionar integración con Meta/Instagram
 */

export interface MetaIntegrationStatus {
  connected: boolean;
  integration: {
    pageName: string | null;
    instagramUsername: string | null;
    expiresAt: string | null;
    isExpired: boolean;
  } | null;
}

/**
 * Iniciar flujo de autorización OAuth de Meta
 */
export async function initiateMetaAuth(): Promise<{ authUrl: string; state: string }> {
  try {
    const response = await httpClient.get<{ authUrl: string; state: string }>('/api/meta/auth/initiate');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Error al iniciar autorización');
  } catch (error) {
    console.error('Error initiating Meta auth:', error);
    throw error;
  }
}

/**
 * Obtener estado de la integración de Meta
 */
export async function getMetaIntegrationStatus(): Promise<MetaIntegrationStatus> {
  try {
    const response = await httpClient.get<{ connected: boolean; integration: MetaIntegrationStatus['integration'] }>('/api/meta/status');
    
    if (response.success && response.data) {
      return {
        connected: response.data.connected,
        integration: response.data.integration,
      };
    }
    
    return {
      connected: false,
      integration: null,
    };
  } catch (error) {
    console.error('Error getting Meta integration status:', error);
    return {
      connected: false,
      integration: null,
    };
  }
}

/**
 * Desconectar integración de Meta
 */
export async function disconnectMeta(): Promise<boolean> {
  try {
    const response = await httpClient.delete('/api/meta/disconnect');
    return response.success || false;
  } catch (error) {
    console.error('Error disconnecting Meta:', error);
    return false;
  }
}
