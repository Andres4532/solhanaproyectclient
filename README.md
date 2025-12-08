# Solhana Proyecto Cliente

E-commerce con Panel de Administración construido con Next.js 15 y React 19.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

3. Configurar Supabase:
- Ejecutar `supabase_schema.sql` en el SQL Editor
- Ejecutar `supabase_triggers.sql` en el SQL Editor
- Crear buckets "productos" y "banners" en Storage

4. Ejecutar en desarrollo:
```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo con Turbopack
- `npm run dev:clean` - Limpia cache y inicia desarrollo
- `npm run build` - Construye aplicación para producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta ESLint
- `npm run clean` - Elimina carpeta .next

## Estructura del Proyecto

Ver la guía completa de migración para detalles sobre la estructura del proyecto.

