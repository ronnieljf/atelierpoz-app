/**
 * Servicio para subir archivos al backend
 */


export interface UploadedFile {
  url: string;
  key: string;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  count: number;
}

/**
 * Subir uno o varios archivos
 * @param {File[]} files - Archivos a subir
 * @param {string} folder - Carpeta donde guardar (opcional: 'products', 'posts', etc.)
 * @returns {Promise<UploadedFile[]>} Array de URLs de los archivos subidos
 */
export async function uploadFiles(files: File[], folder: string = ''): Promise<UploadedFile[]> {
  try {
    const formData = new FormData();
    
    // Agregar todos los archivos al FormData
    files.forEach((file) => {
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
