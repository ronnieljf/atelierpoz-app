# Configuración de Drizzle ORM con D1

Esta guía explica cómo usar Drizzle ORM con Cloudflare D1 y SQLite local.

## Instalación

Las dependencias ya están instaladas en `package.json`:

```bash
npm install
```

## Estructura

### Schema (`db/schema.ts`)
- Define todas las tablas usando Drizzle ORM
- Incluye tipos TypeScript inferidos (`User`, `Store`, etc.)
- Índices y foreign keys configurados

### Cliente Drizzle (`lib/db/drizzle.ts`)
- `getDrizzle()`: Obtiene instancia de Drizzle conectada a D1
- Funciona automáticamente en desarrollo (SQLite) y producción (D1)

### Cliente Local (`lib/db/drizzle-local.ts`)
- Implementa interfaz D1Database usando `better-sqlite3`
- Se conecta al SQLite local de wrangler

## Uso

### En las APIs

```typescript
import { getDrizzle } from '@/lib/db/drizzle';
import { users } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';

const db = getDrizzle();
if (db) {
  // Buscar usuario
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@atelierpoz.com'))
    .limit(1)
    .then(rows => rows[0] || null);

  // Insertar usuario
  await db.insert(users).values({
    id: generateUUID(),
    email: 'user@example.com',
    passwordHash: hash,
    salt: salt,
    name: 'Usuario',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Actualizar usuario
  await db
    .update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, userId));
}
```

## Comandos Drizzle Kit

### Generar migraciones
```bash
npm run db:generate
```

### Aplicar migraciones
```bash
npm run db:migrate
```

### Push schema (desarrollo)
```bash
npm run db:push
```

### Abrir Drizzle Studio (UI para ver datos)
```bash
npm run db:studio
```

## Configuración de Next.js con Cloudflare

El archivo `next.config.ts` ya está configurado con `@cloudflare/next-on-pages`:

```typescript
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}
```

Esto permite que Next.js funcione correctamente con Cloudflare Pages en desarrollo.

## Desarrollo Local

1. **Crear las tablas** (primera vez):
```bash
wrangler d1 execute atelierpoz-db --local --file=./db/schema.sql
```

O usar Drizzle Kit:
```bash
npm run db:push
```

2. **Ejecutar seeder**:
```bash
npm run seed
```

3. **Iniciar servidor**:
```bash
npm run dev
```

## Producción (Cloudflare Pages)

1. **Build**:
```bash
npm run build
```

2. **Deploy**:
```bash
npx @cloudflare/next-on-pages
```

El sistema detectará automáticamente D1 en producción.

## Ventajas de Drizzle ORM

- ✅ Type-safe: TypeScript infiere tipos automáticamente
- ✅ Migraciones: Drizzle Kit genera migraciones SQL
- ✅ Misma API: Funciona igual en desarrollo y producción
- ✅ Relaciones: Foreign keys y relaciones bien definidas
- ✅ Queries complejas: Soporte para joins, subqueries, etc.

## Troubleshooting

### Error: "Cannot find module 'better-sqlite3'"
```bash
npm install better-sqlite3
```

### Error: "D1 database not available"
- En desarrollo: Asegúrate de tener `better-sqlite3` instalado
- En producción: Verifica que D1 esté configurado en Cloudflare

### Error: "Table does not exist"
Ejecuta el schema primero:
```bash
wrangler d1 execute atelierpoz-db --local --file=./db/schema.sql
```
