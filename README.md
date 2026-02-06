# Atelier Poz - Tienda Online

Tienda online desarrollada con Next.js, con soporte multilenguaje (inglés/español), paleta de colores basada en vinotinto, y funcionalidad completa de e-commerce similar a Alibaba.

## Estructura del Proyecto

```
atelierpoz-app/
├── app/                    # App Router de Next.js
│   ├── [locale]/          # Rutas con soporte de idioma
│   │   ├── layout.tsx     # Layout principal con providers
│   │   ├── page.tsx      # Página principal (catálogo)
│   │   ├── products/      # Rutas de productos
│   │   │   └── [id]/     # Página de detalle de producto
│   │   └── cart/         # Página del carrito
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   ├── cart/             # Componentes del carrito
│   ├── layout/           # Componentes de layout (Header, Footer)
│   ├── products/         # Componentes de productos
│   └── ui/               # Componentes UI reutilizables
├── constants/            # Constantes de la aplicación
│   ├── colors.ts         # Paleta de colores
│   └── locales.ts       # Configuración de idiomas
├── lib/                  # Utilidades y servicios
│   ├── data/             # Datos de ejemplo (productos)
│   ├── hooks/            # Custom hooks
│   ├── i18n/            # Configuración de internacionalización
│   ├── services/        # Servicios (API, etc.)
│   ├── store/           # Stores (Cart, Theme)
│   └── utils/           # Utilidades generales
├── locales/             # Archivos de traducción
│   ├── en/              # Traducciones en inglés
│   └── es/              # Traducciones en español
├── types/               # Tipos TypeScript
│   └── product.ts       # Tipos de productos y carrito
└── middleware.ts        # Middleware para detección de idioma
```

## Características

### 🛒 E-commerce Completo
- **Catálogo de productos**: Página principal con grid de productos
- **Detalle de productos**: Página individual con imágenes, descripción y variantes
- **Sistema de variantes**: Soporte para múltiples variantes por producto (talla, color, material, etc.)
- **Carrito de compras**: Carrito funcional con persistencia en localStorage
- **Gestión de cantidad**: Selector de cantidad con validación de stock
- **Cálculo de precios**: Precios dinámicos según variantes seleccionadas

### 🌍 Multilenguaje
- Detección automática del idioma del usuario
- Soporte para inglés y español
- Si el idioma es español, muestra español
- Si es diferente a español, muestra inglés por defecto
- Traducciones completas para toda la tienda

### 🎨 Paleta de Colores
- Paleta basada en vinotinto (#722F37)
- Colores primarios, secundarios y neutros
- Soporte para modo claro y oscuro
- **Selector de tema**: El usuario puede elegir entre Light, Dark o System

### 📁 Estructura Escalable
- Organización clara de componentes, servicios y constantes
- Separación de responsabilidades
- Fácil de mantener y escalar
- Store management con Context API
- Tipos TypeScript completos

## Instalación

1. Instala las dependencias:
```bash
npm install
```

Esto instalará todas las dependencias necesarias, incluyendo:
- `lucide-react` - Iconos profesionales
- `clsx` y `tailwind-merge` - Utilidades para clases CSS

2. Configura las variables de entorno:
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y agrega tus variables
# GROK_API_KEY=tu_clave_api_aqui
```

3. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

## Uso

### Agregar nuevas traducciones

Edita los archivos en `locales/[locale]/common.json`:

```json
{
  "nuevaSeccion": {
    "titulo": "Título",
    "descripcion": "Descripción"
  }
}
```

### Usar traducciones en componentes

```tsx
import { getDictionary } from '@/lib/i18n/dictionary';
import { type Locale } from '@/constants/locales';

export default async function MyComponent({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return <h1>{dict.nuevaSeccion.titulo}</h1>;
}
```

### Usar colores de la paleta

```tsx
<div className="bg-primary-800 text-white">
  Contenido con color vinotinto
</div>
```

## Funcionalidades de la Tienda

### Productos
- **Catálogo**: Grid responsive con tarjetas de productos
- **Detalle**: Página completa con imágenes, variantes y descripción
- **Variantes**: Sistema flexible que soporta:
  - Colores (con selector visual)
  - Tallas (botones)
  - Materiales y opciones personalizadas
  - Precios adicionales por variante
  - Stock por variante

### Carrito de Compras
- Agregar productos con variantes seleccionadas
- Actualizar cantidades
- Eliminar items
- Cálculo automático de totales
- Persistencia en localStorage
- Contador de items en el header

### Tema
- Selector de tema (Light/Dark/System)
- Persistencia de preferencia
- Transiciones suaves

## Scripts

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## Variables de Entorno

El proyecto usa variables de entorno para configurar claves API y otras configuraciones sensibles.

### Archivo .env

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# API Keys
GROK_API_KEY=tu_clave_api_grok_aqui

# Base URL (opcional)
NEXT_PUBLIC_BASE_URL=https://atelierpoz.com
```

### Uso de Variables de Entorno

**En el servidor (Server Components, API Routes):**
```typescript
// Acceso directo
const apiKey = process.env.GROK_API_KEY;

// O usando el helper
import { env } from '@/lib/config/env';
const apiKey = env.grokApiKey;
```

**En el cliente (Client Components):**
```typescript
// Solo variables con prefijo NEXT_PUBLIC_ son accesibles
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

// Para variables privadas, usa API Routes
// Las variables sin NEXT_PUBLIC_ solo están disponibles en el servidor
```

### Seguridad

- **NUNCA** subas el archivo `.env` al repositorio (ya está en `.gitignore`)
- Usa `.env.example` como plantilla para documentar las variables necesarias
- Variables con prefijo `NEXT_PUBLIC_` son accesibles en el navegador (no uses para claves secretas)
- Variables sin prefijo solo están disponibles en el servidor (usa estas para claves API)

## Configuración de WhatsApp

Para habilitar los pedidos por WhatsApp:

1. Abre el archivo `constants/whatsapp.ts`
2. Reemplaza `WHATSAPP_PHONE` con tu número de WhatsApp
3. El número debe estar sin el símbolo `+`, espacios o guiones
4. Ejemplo: Si tu número es `+1 234 567 8900`, usa `"12345678900"`

```typescript
export const WHATSAPP_PHONE = '12345678900'; // Tu número aquí
```

### Funcionalidad de WhatsApp

- **Botón flotante**: Aparece en la esquina inferior derecha cuando hay productos en el carrito
- **Botón en el carrito**: Botón grande y visible en la página del carrito
- **Mensaje automático**: Genera un mensaje con todos los productos, variantes, cantidades y total
- **Fácil de usar**: Un solo clic abre WhatsApp con el mensaje prellenado

## Próximos Pasos

Para conectar con una API real:
1. Reemplaza `lib/data/products.ts` con llamadas a tu API
2. Actualiza `lib/services/api/client.ts` con tu endpoint
3. Implementa autenticación si es necesario
4. El sistema de pedidos por WhatsApp ya está implementado y funcionando
