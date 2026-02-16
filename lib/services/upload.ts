/**
 * Servicio para subir archivos al backend
 */

import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

export interface UploadedFile {
  url: string;
  key: string;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  count: number;
}

const HEIC_MIMES = ['image/heic', 'image/heif'];
const HEIC_EXT = /\.heic$/i;

/** Mismo criterio que el backend (Sharp): solo comprimir si supera este tamaño */
const MAX_IMAGE_SIZE_BYTES = 600 * 1024; // 600 KB
const MAX_WIDTH_OR_HEIGHT = 1200;
const COMPRESSION_QUALITY = 0.82;

function isHeic(file: File): boolean {
  return HEIC_MIMES.includes(file.type) || HEIC_EXT.test(file.name);
}

function isCompressibleImage(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/svg+xml';
}

/**
 * Convierte un archivo HEIC/HEIF (iPhone) a JPEG en el navegador antes de subir.
 */
async function convertHeicToJpegIfNeeded(file: File): Promise<File> {
  if (!isHeic(file)) return file;

  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob || !(blob instanceof Blob)) throw new Error('Conversión HEIC falló');
    const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (err) {
    console.error('Error convirtiendo HEIC a JPEG:', err);
    throw new Error('No se pudo convertir la imagen. Prueba con otra foto o formato JPEG.');
  }
}

/**
 * Comprime la imagen en el navegador si supera el límite (equivalente a Sharp en backend).
 * Así el backend no necesita Sharp: recibe archivos ya optimizados.
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!isCompressibleImage(file) || file.size <= MAX_IMAGE_SIZE_BYTES) {
    return file;
  }
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_IMAGE_SIZE_BYTES / (1024 * 1024),
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      initialQuality: COMPRESSION_QUALITY,
      fileType: 'image/jpeg',
      useWebWorker: false,
    });
    return compressed;
  } catch (err) {
    console.warn('Compresión de imagen falló, se sube original:', err);
    return file;
  }
}

/**
 * Subir uno o varios archivos
 * @param {File[]} files - Archivos a subir
 * @param {string} folder - Carpeta donde guardar (opcional: 'products', 'posts', etc.)
 * @returns {Promise<UploadedFile[]>} Array de URLs de los archivos subidos
 */
export async function uploadFiles(files: File[], folder: string = ''): Promise<UploadedFile[]> {
  try {
    const afterHeic = await Promise.all(files.map(convertHeicToJpegIfNeeded));
    const afterCompress = await Promise.all(afterHeic.map(compressImageIfNeeded));
    const formData = new FormData();

    afterCompress.forEach((file) => {
      formData.append('files', file);
    });

    // Construir URL con query params
    let url = '/api/upload';
    if (folder) {
      url += `?folder=${encodeURIComponent(folder)}`;
    }

    // Hacer la petición
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${url}`, {
      method: 'POST',
      headers: {
        // No establecer Content-Type, el navegador lo hará automáticamente con el boundary
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const data: UploadResponse = await response.json();

    if (data.success && data.files) {
      return data.files;
    }

    throw new Error('Error al subir archivos');
  } catch (error) {
    console.error('Error subiendo archivos:', error);
    throw error;
  }
}

/**
 * Obtener token de autenticación
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return token;
    }

    const authData = localStorage.getItem('admin_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.token) {
        return parsed.token;
      }
    }

    return null;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
}

/**
 * Convertir base64 a File
 * @param {string} base64 - String base64
 * @param {string} filename - Nombre del archivo
 * @returns {File} Objeto File
 */
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
