# Observaciones sobre el Home y Edición por Administrador

## 📊 Análisis del Schema de Base de Datos

### Tabla `diseno_pagina`
Esta tabla permite al administrador configurar completamente el contenido del Home:

```sql
CREATE TABLE diseno_pagina (
    id UUID PRIMARY KEY,
    seccion VARCHAR(100) NOT NULL,  -- 'banner_principal', 'novedades', 'categorias'
    configuracion JSONB NOT NULL,   -- Configuración flexible en JSON
    visible BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    ...
);
```

### Secciones Configurables

#### 1. **banner_principal** (Sección: 'banner_principal')
El administrador puede configurar los banners del carrusel principal.

**Estructura JSON esperada:**
```json
{
  "banners": [
    {
      "id": "banner-1",
      "titulo": "Descubre Nuestra Nueva Colección",
      "subtitulo": "Explora las últimas tendencias...",
      "textoBoton": "Explorar Ahora",
      "urlBoton": "/tienda",
      "imagen": "https://url-de-imagen.jpg"
    },
    {
      "id": "banner-2",
      "titulo": "Estilo para Hombres",
      "subtitulo": "Encuentra los mejores atuendos...",
      "textoBoton": "Ver Colección",
      "urlBoton": "/tienda/hombres",
      "imagen": "https://url-de-imagen.jpg"
    }
  ]
}
```

**O formato simple (un solo banner):**
```json
{
  "titulo": "Título del Banner",
  "subtitulo": "Subtítulo del banner",
  "textoBoton": "Texto del Botón",
  "urlBoton": "/ruta",
  "imagen": "https://url-imagen.jpg"
}
```

#### 2. **novedades** (Sección: 'novedades')
Configura la sección de productos destacados/novedades.

**Estructura JSON:**
```json
{
  "titulo": "Explorar",
  "mostrar": true,
  "cantidad": 5
}
```

#### 3. **categorias** (Sección: 'categorias')
Configura la sección de categorías.

**Estructura JSON:**
```json
{
  "titulo": "Comprar por Categoría",
  "mostrar": true,
  "cantidad": 2
}
```

## 🔧 Funciones Creadas en `lib/supabase-queries.ts`

### Para Banners:
- `getBannersFromConfig()` - Obtiene todos los banners desde la configuración
- `getDisenoPaginaBySeccion(seccion)` - Obtiene configuración de una sección específica

### Para Productos:
- `getProductosDestacados(limit)` - Obtiene productos destacados (últimos creados)
- `getProductosNuevos(limit)` - Obtiene productos marcados como "nuevos"
- `getProductosBestSeller(limit)` - Obtiene productos "best seller"
- `getProductosOfertas(limit)` - Obtiene productos en oferta

### Para Categorías:
- `getCategoriasParaHome(limit)` - Obtiene categorías activas para mostrar en home

## 📝 Cómo el Administrador Puede Editar el Home

### Opción 1: Desde el Panel de Administración (app/admin/diseno)

El administrador puede:
1. **Editar Banners:**
   - Agregar/eliminar banners
   - Cambiar títulos, subtítulos, textos de botones
   - Subir imágenes para cada banner
   - Cambiar URLs de destino

2. **Configurar Secciones:**
   - Mostrar/ocultar secciones (novedades, categorías)
   - Cambiar títulos de secciones
   - Configurar cantidad de productos a mostrar

3. **Gestionar Orden:**
   - Cambiar el orden de las secciones mediante el campo `orden`

### Opción 2: Directamente en Supabase

El administrador puede editar directamente en Supabase:

```sql
-- Actualizar configuración de banners
UPDATE diseno_pagina 
SET configuracion = '{
  "banners": [
    {
      "titulo": "Nuevo Banner",
      "subtitulo": "Nuevo subtítulo",
      "textoBoton": "Comprar",
      "urlBoton": "/tienda",
      "imagen": "https://nueva-imagen.jpg"
    }
  ]
}'::jsonb
WHERE seccion = 'banner_principal';

-- Ocultar sección de novedades
UPDATE diseno_pagina 
SET visible = false 
WHERE seccion = 'novedades';

-- Cambiar título de sección
UPDATE diseno_pagina 
SET configuracion = jsonb_set(
  configuracion, 
  '{titulo}', 
  '"Mi Nuevo Título"'::jsonb
)
WHERE seccion = 'novedades';
```

## ⚠️ Observaciones Importantes

### 1. **Estructura de Banners**
- El sistema soporta **múltiples banners** en un array
- También soporta **un solo banner** en formato simple
- Si no hay banners configurados, el carrusel no se muestra
- Las imágenes deben ser URLs válidas (de Supabase Storage o externas)

### 2. **Productos Destacados**
- Actualmente usa `getProductosDestacados()` que obtiene los últimos productos creados
- El administrador puede controlar qué productos aparecen marcándolos como:
  - `es_nuevo = true` → Para usar `getProductosNuevos()`
  - `es_best_seller = true` → Para usar `getProductosBestSeller()`
  - `es_oferta = true` → Para usar `getProductosOfertas()`

### 3. **Categorías**
- Solo se muestran categorías con `estado = 'Activo'`
- Se ordenan por el campo `orden`
- Actualmente se muestran las primeras 2 categorías
- Las imágenes de categorías son temporales (el admin puede agregar campo `imagen_url` a la tabla categorías)

### 4. **Manejo de Errores**
- Si falla la carga de banners, el carrusel no se muestra (no rompe la página)
- Si falla la carga de productos, se muestra un mensaje de error
- Si no hay productos, la sección simplemente no se muestra

### 5. **Performance**
- Los datos se cargan en el cliente (`useEffect`)
- Se podría optimizar usando Server Components para mejor SEO
- Considerar agregar caché o revalidación

### 6. **Configuración de Imágenes**
- Las imágenes de banners pueden venir de:
  - Supabase Storage (bucket "banners")
  - URLs externas (debe estar en `next.config.ts`)
- Las imágenes de productos vienen de `producto_imagenes` (vista `productos_catalogo`)

## 🎯 Recomendaciones para el Panel de Administración

### Página de Diseño (app/admin/diseno/page.tsx)

Debería incluir:

1. **Editor de Banners:**
   - Lista de banners actuales
   - Formulario para agregar/editar banners
   - Upload de imágenes
   - Preview del banner
   - Drag & drop para reordenar

2. **Configuración de Secciones:**
   - Toggle para mostrar/ocultar secciones
   - Input para cambiar títulos
   - Selector de cantidad de productos

3. **Preview en Tiempo Real:**
   - Vista previa de cómo se verá el home

## 📋 Checklist de Implementación

- [x] Funciones de queries para banners
- [x] Funciones de queries para productos destacados
- [x] Funciones de queries para categorías
- [x] Componente HomeContent conectado a BD
- [x] BannerCarousel dinámico
- [x] Manejo de estados de carga y error
- [ ] Panel de administración para editar diseño (pendiente)
- [ ] Upload de imágenes para banners
- [ ] Validación de configuración JSON
- [ ] Preview de cambios antes de guardar

## 🔄 Flujo de Datos

```
Supabase (diseno_pagina)
    ↓
getBannersFromConfig()
    ↓
BannerCarousel Component
    ↓
Renderizado en Home

Supabase (productos_catalogo)
    ↓
getProductosDestacados()
    ↓
HomeContent Component
    ↓
Grid de Productos

Supabase (categorias)
    ↓
getCategoriasParaHome()
    ↓
HomeContent Component
    ↓
Grid de Categorías
```

## 💡 Mejoras Futuras

1. **Agregar campo `imagen_url` a categorías** para que el admin pueda subir imágenes personalizadas
2. **Sistema de plantillas** para banners predefinidos
3. **Analytics** de qué banners tienen más clics
4. **A/B Testing** de diferentes configuraciones
5. **Scheduled banners** (banners que aparecen en fechas específicas)
6. **Multi-idioma** en la configuración

