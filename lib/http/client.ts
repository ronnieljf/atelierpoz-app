/**
 * Cliente HTTP con manejo automático de tokens
 * Verifica y envía el token de autenticación en cada petición
 */

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  skipAuth?: boolean; // Para peticiones que no requieren autenticación
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

class HttpClient {
  private baseURL: string;

  constructor() {
    // Obtener la URL del backend desde variables de entorno
    this.baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  }

  /**
   * Obtiene el token de autenticación desde localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      // Intentar obtener el token desde localStorage
      const authData = localStorage.getItem('admin_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        // Si el token está directamente en authData
        if (parsed.token) {
          return parsed.token;
        }
      }

      // Intentar obtener desde una clave específica de token
      const token = localStorage.getItem('auth_token');
      if (token) {
        return token;
      }

      // Intentar obtener desde sessionStorage
      const sessionToken = sessionStorage.getItem('auth_token');
      if (sessionToken) {
        return sessionToken;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  /**
   * Guarda el token en localStorage
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error guardando token:', error);
    }
  }

  /**
   * Elimina el token
   */
  removeToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error eliminando token:', error);
    }
  }

  /**
   * Construye la URL con query parameters
   */
  private buildURL(url: string, params?: Record<string, string | number | boolean>): string {
    let fullURL = url;

    // Si la URL no es absoluta, agregar baseURL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (this.baseURL) {
        fullURL = `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
      } else {
        fullURL = url.startsWith('/') ? url : `/${url}`;
      }
    }

    // Agregar query parameters
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullURL += `${fullURL.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    return fullURL;
  }

  /**
   * Construye los headers con el token de autenticación
   */
  private buildHeaders(options?: RequestInit, skipAuth = false): HeadersInit {
    const headers = new Headers(options?.headers);

    // Agregar Content-Type por defecto si no está presente
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Agregar token de autenticación si no se omite
    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /**
   * Maneja errores de respuesta
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: unknown;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch {
      data = null;
    }

    // Si la respuesta es exitosa
    if (response.ok) {
      const responseData = data as { data?: T; success?: boolean; message?: string } | null;
      return {
        data: (responseData?.data ?? data) as T,
        success: responseData?.success ?? true,
        message: responseData?.message,
      };
    }

    // Manejar errores de autenticación: redirigir al login solo si estamos en admin pero NO en la página de login
    // (así, cuando el login falla por credenciales inválidas no se recarga la página)
    if (response.status === 401) {
      this.removeToken();
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    // Retornar error
    // El data puede ser un objeto con error directamente, o estar dentro de data
    let errorMessage: string;
    if (typeof data === 'object' && data !== null) {
      // Intentar obtener el mensaje de error del objeto
      if ('error' in data && typeof data.error === 'string') {
        errorMessage = data.error;
      } else if ('message' in data && typeof data.message === 'string') {
        errorMessage = data.message;
      } else {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
    } else if (typeof data === 'string') {
      errorMessage = data;
    } else {
      errorMessage = `Error ${response.status}: ${response.statusText}`;
    }
    
    return {
      error: errorMessage,
      success: false,
      message: typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string' ? data.message : undefined,
    };
  }

  /**
   * Realiza una petición HTTP
   */
  private async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, skipAuth, ...fetchOptions } = options;

    try {
      const fullURL = this.buildURL(url, params);
      const headers = this.buildHeaders(fetchOptions, skipAuth);

      const response = await fetch(fullURL, {
        ...fetchOptions,
        headers,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('Error en petición HTTP:', error);
      return {
        error: error instanceof Error ? error.message : 'Error de conexión',
        success: false,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Exportar instancia singleton
export const httpClient = new HttpClient();

// Exportar tipos
export type { RequestOptions, ApiResponse };
