# Estructura del Proyecto

Esta documentación explica la organización del proyecto y cómo usar cada parte.

## 📁 Estructura de Carpetas

### `/app`
Contiene las rutas de Next.js usando App Router. Todas las rutas están bajo `[locale]` para soportar múltiples idiomas.

- `[locale]/layout.tsx` - Layout principal que envuelve todas las páginas con el idioma correspondiente
- `[locale]/page.tsx` - Página principal
- `layout.tsx` - Root layout (solo para redirecciones)
- `globals.css` - Estilos globales con la paleta de colores

### `/components`
Componentes React reutilizables organizados por tipo:

- `layout/` - Componentes de layout (Header, Footer)
- `ui/` - Componentes UI reutilizables (Button, LanguageSwitcher)

### `/constants`
Constantes de la aplicación:

- `colors.ts` - Paleta de colores basada en vinotinto
- `locales.ts` - Configuración de idiomas y función de detección

### `/lib`
Utilidades y servicios:

- `i18n/` - Sistema de internacionalización
  - `config.ts` - Configuración de i18n
  - `dictionary.ts` - Carga de diccionarios
  - `middleware.ts` - Lógica del middleware
  - `types.ts` - Tipos TypeScript
- `services/` - Servicios externos
  - `api/` - Cliente API y configuración
- `utils/` - Utilidades generales
  - `cn.ts` - Helper para combinar clases CSS
- `hooks/` - Custom hooks de React
  - `useLocale.ts` - Hook para obtener el locale actual
  - `useDictionary.ts` - Hook para usar diccionarios

### `/locales`
Archivos de traducción JSON organizados por idioma:

- `en/common.json` - Traducciones en inglés
- `es/common.json` - Traducciones en español

## 🎨 Paleta de Colores

La paleta está basada en vinotinto (#722F37) y se puede usar en Tailwind CSS:

```tsx
// Colores primarios (vinotinto)
<div className="bg-primary-800 text-white">Contenido</div>

// Colores secundarios
<div className="bg-secondary-600">Contenido</div>

// Colores neutros
<div className="bg-neutral-100 text-neutral-900">Contenido</div>
```

Los colores están disponibles en todas las variantes (50-950) para mayor flexibilidad.

## 🌍 Sistema de Internacionalización

### Detección Automática

El middleware detecta automáticamente el idioma del usuario basándose en el header `Accept-Language`:

- Si el idioma es español → muestra español
- Si es diferente a español → muestra inglés

### Usar Traducciones en Server Components

```tsx
import { getDictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';

export default async function MyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return <h1>{dict.welcome}</h1>;
}
```

### Usar Traducciones en Client Components

Para client components, necesitas pasar el diccionario como prop desde un Server Component:

```tsx
// Server Component
import { getDictionary } from '@/lib/i18n/dictionary';
import MyClientComponent from './MyClientComponent';

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  
  return <MyClientComponent dict={dict} />;
}

// Client Component
'use client';
import { type Dictionary } from '@/lib/i18n/dictionary';

export default function MyClientComponent({ dict }: { dict: Dictionary }) {
  return <p>{dict.welcome}</p>;
}
```

### Agregar Nuevas Traducciones

1. Edita `locales/en/common.json` y `locales/es/common.json`
2. Agrega las nuevas claves en ambos archivos
3. TypeScript te ayudará con autocompletado

## 🔌 Servicios API

El cliente API está configurado en `lib/services/api/`:

```tsx
import { apiClient } from '@/lib/services/api/client';

// GET request
const data = await apiClient.get('/endpoint', { param: 'value' });

// POST request
const result = await apiClient.post('/endpoint', { data: 'value' });
```

## 📝 Convenciones

- **Componentes**: PascalCase (ej: `Button.tsx`)
- **Utilidades**: camelCase (ej: `cn.ts`)
- **Constantes**: camelCase (ej: `colors.ts`)
- **Tipos**: PascalCase (ej: `ApiResponse`)
- **Hooks**: camelCase con prefijo `use` (ej: `useLocale.ts`)
