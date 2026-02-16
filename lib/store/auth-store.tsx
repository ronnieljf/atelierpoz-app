'use client';

import { createContext, useContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface Store {
  id: string;
  store_id?: string | null;
  name: string;
  state: string;
  logo?: string | null;
  location?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  iva?: number;
  is_creator: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
  joined_at: string;
  feature_send_reminder_receivables_whatsapp?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
  stores: Store[];
  /** True cuando loadAuth ha terminado (éxito o fallo). Usado para mostrar loading en admin hasta verificar. */
  authHydrated: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { id: string; email: string; name: string | null; role: string } }
  | { type: 'LOGOUT' }
  | { type: 'LOAD_AUTH'; payload: { id: string; email: string; name: string | null; role: string } | null }
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'AUTH_HYDRATED' };

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
  loadStores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN': {
      const newState = {
        ...state,
        isAuthenticated: true,
        user: {
          id: action.payload.id,
          email: action.payload.email,
          name: action.payload.name,
          role: action.payload.role,
        },
        stores: [],
      };
      
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_auth', JSON.stringify({ ...newState, authHydrated: undefined }));
      }
      
      return newState;
    }
    
    case 'LOGOUT': {
      const newState = {
        ...state,
        isAuthenticated: false,
        user: null,
        stores: [],
      };
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      }
      
      return newState;
    }
    
    case 'LOAD_AUTH': {
      if (action.payload) {
        return {
          ...state,
          isAuthenticated: true,
          user: {
            id: action.payload.id,
            email: action.payload.email,
            name: action.payload.name,
            role: action.payload.role,
          },
          stores: [],
        };
      }
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        stores: [],
      };
    }
    
    case 'SET_STORES': {
      return {
        ...state,
        stores: action.payload,
      };
    }

    case 'AUTH_HYDRATED': {
      return { ...state, authHydrated: true };
    }
    
    default:
      return state;
  }
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  stores: [],
  authHydrated: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const hasLoadedRef = useRef(false);
  
  /**
   * Cargar tiendas del usuario autenticado
   */
  const loadUserStores = useCallback(async (): Promise<void> => {
    try {
      const { httpClient } = await import('@/lib/http/client');
      
      const response = await httpClient.get<{
        success: boolean;
        stores: Store[];
        count: number;
      }>('/api/stores');

      if (response.success && response.data?.stores) {
        dispatch({
          type: 'SET_STORES',
          payload: response.data.stores,
        });
      }
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      // No fallar silenciosamente, pero no bloquear el flujo
    }
  }, []);
  
  // Tiempo máximo para validar token (evita quedarse en "Verificando" con mala conexión)
  const AUTH_ME_TIMEOUT_MS = 8000;

  // Cargar autenticación y validar token con el backend
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadAuth = async () => {
      // Verificar si hay token en la URL (para login automático desde WhatsApp)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
          try {
            const { httpClient } = await import('@/lib/http/client');
            // Guardar el token temporalmente para validarlo
            httpClient.setToken(urlToken);
            
            // Validar el token con el backend
            const response = await httpClient.get<{
              success: boolean;
              user: { id: string; email: string; name: string | null; role: string };
            }>('/api/auth/me');

            if (response.success && response.data?.user) {
              // Token válido: hacer login automático
              dispatch({ 
                type: 'LOGIN', 
                payload: { 
                  id: response.data.user.id,
                  email: response.data.user.email,
                  name: response.data.user.name || null,
                  role: response.data.user.role || 'user',
                } 
              });
              
              // Cargar tiendas del usuario
              await loadUserStores();
              
              // Limpiar el token de la URL sin recargar la página
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              
              dispatch({ type: 'AUTH_HYDRATED' });
              return;
            } else {
              // Token inválido: limpiar y continuar con flujo normal
              httpClient.removeToken();
              urlParams.delete('token');
              const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
              window.history.replaceState({}, '', newUrl);
            }
          } catch (error) {
            console.error('Error validando token de URL:', error);
            // Limpiar token de URL y continuar con flujo normal
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.delete('token');
            const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '');
            window.history.replaceState({}, '', newUrl);
            try {
              const { httpClient } = await import('@/lib/http/client');
              httpClient.removeToken();
            } catch {
              // ignorar
            }
          }
        }
      }

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
        : null;

      if (!token) {
        // Sin token: marcar como hidratado de inmediato para mostrar login sin esperar
        const savedAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null;
        if (savedAuth) {
          try {
            const parsedAuth = JSON.parse(savedAuth);
            if (parsedAuth?.isAuthenticated && parsedAuth?.user) {
              dispatch({ type: 'LOAD_AUTH', payload: parsedAuth.user });
            }
          } catch {
            // ignorar parseo fallido
          }
        }
        dispatch({ type: 'AUTH_HYDRATED' });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AUTH_ME_TIMEOUT_MS);

      let authSucceeded = false;
      try {
        const { httpClient } = await import('@/lib/http/client');
        const response = await httpClient.get<{
          success: boolean;
          user: { id: string; email: string; name: string | null; role: string };
        }>('/api/auth/me', { signal: controller.signal });

        if (response.success && response.data?.user) {
          clearTimeout(timeoutId);
          authSucceeded = true;
          dispatch({ type: 'LOAD_AUTH', payload: response.data.user });
          await loadUserStores();
          dispatch({ type: 'AUTH_HYDRATED' });
          return;
        } else {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            localStorage.removeItem('admin_auth');
          }
          httpClient.removeToken();
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Timeout por mala conexión: limpiar y dejar que el usuario entre por login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            localStorage.removeItem('admin_auth');
          }
          try {
            const { httpClient } = await import('@/lib/http/client');
            httpClient.removeToken();
          } catch {
            // ignorar
          }
        } else {
          console.error('Error validando token:', error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            localStorage.removeItem('admin_auth');
          }
          try {
            const { httpClient } = await import('@/lib/http/client');
            httpClient.removeToken();
          } catch {
            // ignorar
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (!authSucceeded) dispatch({ type: 'AUTH_HYDRATED' });
      }
    };

    void loadAuth();
  }, [loadUserStores]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { httpClient } = await import('@/lib/http/client');
      
      // Usar el cliente HTTP para el login (skipAuth porque el login no requiere token)
      const response = await httpClient.post<{
        success: boolean;
        user: { id: string; email: string; name: string | null; role: string };
        token?: string;
      }>('/api/auth/login', { email, password }, { skipAuth: true });

      if (response.success && response.data?.user) {
        // Guardar el token si viene en la respuesta
        if (response.data.token) {
          httpClient.setToken(response.data.token);
        }

        dispatch({ 
          type: 'LOGIN', 
          payload: { 
            id: response.data.user.id,
            email: response.data.user.email,
            name: response.data.user.name || null,
            role: response.data.user.role || 'admin',
          } 
        });
        
        // Cargar tiendas del usuario después del login exitoso
        await loadUserStores();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };
  
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const isAuthenticated = useCallback(() => state.isAuthenticated, [state.isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        isAuthenticated,
        loadStores: loadUserStores,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
