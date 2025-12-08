# Observaciones - Home Conectado a Base de Datos (Estructura Actualizada)

## 📊 Estructura Actualizada de `diseno_pagina`

### Campos de la Tabla:
- `id`: UUID único
- `seccion`: Identificador de la sección ('banner_1', 'banner_2', 'novedades', 'categorias', etc.)
- `tipo`: 'banner' | 'seccion'
- `configuracion`: JSONB con configuración específica
- `url_enlace`: URL para botones de banners (nuevo campo)
- `visible`: Boolean para mostrar/ocultar
- `orden`: Orden de visualización
- `created_at`, `updated_at`: Timestamps

## 🎨 Estructura de Banners (tipo = 'banner')

Cada banner es un registro separado en la tabla:

```sql
{
  "id": "uuid-del-banner",
  "seccion": "banner_1",  -- banner_1, banner_2, banner_3, etc.
  "tipo": "banner",
  "configuracion": {
    "imagen": "https://ztbiqgfypxgptvconxon.supabase.co/storage/v1/object/public/productos/banners/imagen.jpg",
    "titulo": "Descubre Nuestra Nueva Colección",
    "subtitulo": "Explora las últimas tendencias y encuentra tus piezas favoritas.",
    "textoBoton": "Explorar Ahora"
  },
  "url_enlace": "/tienda",  -- URL de destino del botón
  "visible": true,
  "orden": 0,  -- Orden en el carrusel
  "created_at": "2024-...",
  "updated_at": "2024-..."
}
```

**Notas:**
- Cada banner es un registro independiente
- El campo `orden` determina el orden en el carrusel
- Las imágenes se guardan en Supabase Storage: `productos/banners/`
- La URL completa se guarda en `configuracion.imagen`
- El campo `url_enlace` es la URL de destino del botón

## 📋 Estructura de Secciones (tipo = 'seccion')

Cada sección es un registro separado:

```sql
{
  "id": "uuid-de-la-seccion",
  "seccion": "novedades",  -- o "categorias"
  "tipo": "seccion",
  "configuracion": {
    "titulo": "Novedades",
    "mostrar": true
  },
  "visible": true,
  "orden": 1,
  "created_at": "2024-...",
  "updated_at": "2024-..."
}
```

## 🔧 Funciones Actualizadas

### `getBannersFromConfig()`
- Ahora obtiene todos los registros con `tipo = 'banner'`
- Ordena por `orden` ascendente
- Mapea la estructura a un formato consistente
- Usa `url_enlace` como URL del botón (con fallback a `configuracion.urlBoton`)

### `getDisenoPaginaBySeccion(seccion, tipo?)`
- Ahora acepta parámetro opcional `tipo`
- Permite filtrar por tipo específico
- Útil para obtener secciones específicas

## 🖼️ Imágenes de Categorías

Las categorías ahora tienen:
- `imagen_url`: Para mostrar en la homepage
- `banner_imagen_url`: Para la página de categoría
- `banner_titulo`: Título del banner de categoría
- `banner_descripcion`: Descripción del banner

El Home usa `imagen_url` de cada categoría para mostrar en el grid.

## 📝 Cómo el Administrador Edita el Home

### Desde el Software de Administración:

1. **Agregar/Editar Banners:**
   ```sql
   INSERT INTO diseno_pagina (seccion, tipo, configuracion, url_enlace, visible, orden)
   VALUES (
     'banner_1',
     'banner',
     '{"imagen": "https://...", "titulo": "...", "subtitulo": "...", "textoBoton": "..."}'::jsonb,
     '/tienda',
     true,
     0
   );
   ```

2. **Editar Secciones:**
   ```sql
   UPDATE diseno_pagina
   SET configuracion = '{"titulo": "Mi Título", "mostrar": true}'::jsonb
   WHERE seccion = 'novedades' AND tipo = 'seccion';
   ```

3. **Reordenar Banners:**
   ```sql
   UPDATE diseno_pagina
   SET orden = 1
   WHERE id = 'uuid-del-banner';
   ```

4. **Ocultar/Mostrar Elementos:**
   ```sql
   UPDATE diseno_pagina
   SET visible = false
   WHERE seccion = 'novedades' AND tipo = 'seccion';
   ```

## ⚠️ Observaciones Importantes

### 1. **Múltiples Banners**
- Cada banner es un registro independiente
- Se pueden tener tantos banners como se necesite
- El orden se controla con el campo `orden`
- Si `visible = false`, el banner no se muestra

### 2. **URLs de Imágenes**
- Las imágenes se suben a: `productos/banners/` en Supabase Storage
- La URL completa se guarda en `configuracion.imagen`
- Formato: `https://[proyecto].supabase.co/storage/v1/object/public/productos/banners/[archivo]`
- Las URLs son públicas y accesibles

### 3. **URLs de Enlaces**
- El campo `url_enlace` tiene prioridad sobre `configuracion.urlBoton`
- Si no existe `url_enlace`, se usa `configuracion.urlBoton`
- Si ninguno existe, se usa `/tienda` como default

### 4. **Secciones Configurables**
- `novedades`: Controla la sección de productos destacados
- `categorias`: Controla la sección de categorías
- Cada sección puede tener su propio título y configuración
- Si `configuracion.mostrar = false`, la sección no se muestra

### 5. **Categorías con Imágenes**
- Las categorías ahora tienen `imagen_url` para el home
- Si una categoría no tiene `imagen_url`, se usa una imagen de ejemplo
- El administrador puede subir imágenes personalizadas para cada categoría

### 6. **Manejo de Errores**
- Si no hay banners → El carrusel no se muestra (no rompe la página)
- Si no hay productos → La sección no se muestra
- Si no hay categorías → La sección no se muestra
- Errores se registran en consola para debugging

## 🔄 Flujo de Datos Actualizado

```
Supabase (diseno_pagina WHERE tipo='banner')
    ↓
getBannersFromConfig()
    ↓
BannerCarousel Component
    ↓
Renderizado en Home

Supabase (productos_catalogo WHERE estado='Activo')
    ↓
getProductosDestacados()
    ↓
HomeContent Component
    ↓
Grid de Productos

Supabase (categorias WHERE estado='Activo')
    ↓
getCategoriasParaHome()
    ↓
HomeContent Component
    ↓
Grid de Categorías (con imagen_url)
```

## ✅ Cambios Implementados

1. ✅ Actualizado tipo `DisenoPagina` con `tipo` y `url_enlace`
2. ✅ Actualizado tipo `Categoria` con campos de imagen
3. ✅ Actualizada función `getBannersFromConfig()` para nueva estructura
4. ✅ Actualizada función `getDisenoPaginaBySeccion()` con parámetro tipo
5. ✅ Actualizado `HomeContent` para usar nuevas funciones
6. ✅ Actualizado uso de `imagen_url` en categorías

## 🎯 Próximos Pasos

1. **Probar con datos reales** desde Supabase
2. **Verificar que los banners se cargan correctamente**
3. **Verificar que las categorías muestran sus imágenes**
4. **Crear panel de admin** para editar diseño (opcional)

