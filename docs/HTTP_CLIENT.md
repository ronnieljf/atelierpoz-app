# Cliente HTTP

Cliente HTTP reutilizable que maneja automáticamente los tokens de autenticación.

## Características

- ✅ Verifica automáticamente si hay un token almacenado
- ✅ Envía el token en el header `Authorization: Bearer <token>` en cada petición
- ✅ Maneja errores de autenticación (401) y redirige al login
- ✅ Soporta todos los métodos HTTP (GET, POST, PUT, PATCH, DELETE)
- ✅ Manejo automático de query parameters
- ✅ Configuración mediante variables de entorno

## Uso Básico

```typescript
import { httpClient } from '@/lib/http/client';

// GET request
const response = await httpClient.get('/api/products');
if (response.success) {
  console.log(response.data);
}

// POST request
const response = await httpClient.post('/api/products', {
  name: 'Producto',
  price: 100
});

// PUT request
const response = await httpClient.put('/api/products/1', {
  name: 'Producto Actualizado'
});

// DELETE request
const response = await httpClient.delete('/api/products/1');
```

## Configuración

Configura la URL del backend en `.env`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Si no está configurada, las peticiones se harán a rutas relativas (útil para desarrollo local).

## Manejo de Tokens

El cliente automáticamente:

1. **Obtiene el token** desde `localStorage.getItem('auth_token')`
2. **Envía el token** en el header `Authorization: Bearer <token>`
3. **Elimina el token** si recibe un error 401 (no autorizado)
4. **Redirige al login** si el token es inválido

### Guardar Token

Cuando recibas un token del backend después del login:

```typescript
import { httpClient } from '@/lib/http/client';

// El token se guarda automáticamente en el login del auth-store
// Pero también puedes guardarlo manualmente:
httpClient.setToken('tu-token-aqui');
```

### Eliminar Token

```typescript
httpClient.removeToken();
```

## Peticiones sin Autenticación

Para peticiones que no requieren token (como login, registro):

```typescript
const response = await httpClient.post(
  '/api/auth/login',
  { email, password },
  { skipAuth: true }
);
```

## Query Parameters

```typescript
const response = await httpClient.get('/api/products', {
  params: {
    page: 1,
    limit: 10,
    search: 'joyeria'
  }
});
// Genera: /api/products?page=1&limit=10&search=joyeria
```

## Manejo de Respuestas

Todas las respuestas tienen esta estructura:

```typescript
interface ApiResponse<T> {
  data?: T;        // Datos de la respuesta
  error?: string;  // Mensaje de error si hay
  success?: boolean; // Indica si fue exitoso
  message?: string;  // Mensaje adicional
}
```

Ejemplo de uso:

```typescript
const response = await httpClient.get('/api/products');

if (response.success && response.data) {
  // Procesar datos
  console.log(response.data);
} else {
  // Manejar error
  console.error(response.error);
}
```

## Errores de Autenticación

Si el servidor responde con 401 (No autorizado):

- El token se elimina automáticamente
- El usuario es redirigido a `/admin/login`
- La petición retorna un error

## Ejemplo Completo

```typescript
import { httpClient } from '@/lib/http/client';

async function fetchProducts() {
  try {
    const response = await httpClient.get<Array<Product>>('/api/products', {
      params: {
        page: 1,
        limit: 20
      }
    });

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || 'Error al obtener productos');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function createProduct(product: NewProduct) {
  const response = await httpClient.post<Product>('/api/products', product);
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error(response.error || 'Error al crear producto');
}
```
