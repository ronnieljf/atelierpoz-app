# Variables de Entorno en Next.js

## Convención de Nombres

En Next.js, las variables de entorno siguen estas reglas:

### 1. Variables Privadas (Solo Servidor)

**Sin prefijo** - Solo accesibles en el servidor (Server Components, API Routes, Server Actions)

```env
# .env
GROK_API_KEY=tu_clave_secreta
DATABASE_URL=postgresql://...
SECRET_KEY=mi_secreto
```

**Uso:**
```typescript
// ✅ Funciona en Server Components
const apiKey = process.env.GROK_API_KEY;

// ❌ NO funciona en Client Components
// const apiKey = process.env.GROK_API_KEY; // undefined
```

### 2. Variables Públicas (Cliente y Servidor)

**Con prefijo `NEXT_PUBLIC_`** - Accesibles en cliente y servidor

```env
# .env
NEXT_PUBLIC_BASE_URL=https://atelierpoz.com
NEXT_PUBLIC_API_URL=https://api.ejemplo.com
NEXT_PUBLIC_ANALYTICS_ID=abc123
```

**Uso:**
```typescript
// ✅ Funciona en Server Components
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

// ✅ Funciona en Client Components
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
```

## Reglas Importantes

### ⚠️ Seguridad

1. **NUNCA uses `NEXT_PUBLIC_` para claves API secretas**
   ```env
   # ❌ MAL - Se expone en el navegador
   NEXT_PUBLIC_GROK_API_KEY=secret_key
   
   # ✅ BIEN - Solo en servidor
   GROK_API_KEY=secret_key
   ```

2. **Las variables con `NEXT_PUBLIC_` se inyectan en el bundle del cliente**
   - Cualquiera puede verlas en el código fuente del navegador
   - Solo usa para valores públicos (URLs, IDs públicos, etc.)

### 📝 Convenciones de Nombres

- **MAYÚSCULAS**: Todas las variables deben estar en mayúsculas
- **SNAKE_CASE**: Usa guiones bajos para separar palabras
- **Descriptivo**: Nombres claros que indiquen su propósito

```env
# ✅ Correcto
GROK_API_KEY=...
NEXT_PUBLIC_BASE_URL=...
DATABASE_CONNECTION_STRING=...

# ❌ Incorrecto
grokApiKey=...           # Minúsculas
grok-api-key=...         # Guiones
nextPublicBaseUrl=...    # camelCase
```

## Archivos de Entorno

Next.js carga automáticamente estos archivos (en orden de prioridad):

1. `.env.local` - Variables locales (ignorado por git)
2. `.env.development` - Solo en desarrollo
3. `.env.production` - Solo en producción
4. `.env` - Variables generales

**Ejemplo:**
```env
# .env (general)
GROK_API_KEY=default_key

# .env.local (sobrescribe .env)
GROK_API_KEY=mi_clave_real_local
```

## Ejemplos de Uso

### En Server Components

```typescript
// app/api/example/route.ts
import { env } from '@/lib/config/env';

export async function GET() {
  // ✅ Acceso directo
  const apiKey = process.env.GROK_API_KEY;
  
  // ✅ O usando el helper
  const apiKey2 = env.grokApiKey;
  
  return Response.json({ key: apiKey });
}
```

### En Client Components

```typescript
'use client';

// ✅ Variables públicas
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

// ❌ NO funciona - undefined
// const apiKey = process.env.GROK_API_KEY;

// Para usar variables privadas, crea una API Route
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};
```

### En API Routes

```typescript
// app/api/grok/route.ts
import { env } from '@/lib/config/env';

export async function POST(request: Request) {
  const apiKey = env.grokApiKey;
  
  if (!apiKey) {
    return Response.json(
      { error: 'GROK_API_KEY no configurada' },
      { status: 500 }
    );
  }
  
  // Usar la API key aquí
  const response = await fetch('https://api.grok.com/...', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  return Response.json(await response.json());
}
```

## Resumen

| Tipo | Prefijo | Accesible en | Uso |
|------|---------|--------------|-----|
| Privada | Sin prefijo | Solo servidor | Claves API, secrets, DB |
| Pública | `NEXT_PUBLIC_` | Cliente y servidor | URLs públicas, IDs públicos |

**Regla de oro**: Si es secreto → sin prefijo. Si es público → `NEXT_PUBLIC_`
