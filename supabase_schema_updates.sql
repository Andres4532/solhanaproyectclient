-- ============================================
-- SOLHANA - Actualizaciones del Esquema de Base de Datos
-- ============================================
-- Este script contiene SOLO las actualizaciones necesarias
-- basadas en el análisis de los ejemplos HTML y el código actual
-- ============================================

-- ============================================
-- 1. ACTUALIZAR TABLA diseno_pagina
-- ============================================
-- Necesitamos permitir múltiples banners en el carrusel
-- El UNIQUE(seccion) impide tener múltiples banners
-- Solución: Agregar un campo 'tipo' y cambiar la restricción UNIQUE

-- Primero, eliminar la restricción UNIQUE existente
ALTER TABLE diseno_pagina DROP CONSTRAINT IF EXISTS diseno_pagina_seccion_key;

-- Agregar campo 'tipo' para diferenciar banners, secciones, etc.
ALTER TABLE diseno_pagina 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'seccion';

-- Agregar campo 'url_enlace' para los botones de los banners
ALTER TABLE diseno_pagina 
ADD COLUMN IF NOT EXISTS url_enlace TEXT;

-- Crear nueva restricción UNIQUE que permita múltiples banners
-- pero mantenga único por sección+tipo
CREATE UNIQUE INDEX IF NOT EXISTS diseno_pagina_seccion_tipo_unique 
ON diseno_pagina(seccion, tipo) 
WHERE tipo = 'seccion';

-- Comentario
COMMENT ON COLUMN diseno_pagina.tipo IS 'Tipo de elemento: seccion, banner, etc.';
COMMENT ON COLUMN diseno_pagina.url_enlace IS 'URL de enlace para botones de banners';

-- ============================================
-- 2. ACTUALIZAR TABLA categorias
-- ============================================
-- Las categorías necesitan imágenes para mostrarse en la homepage
-- y banners de categoría para las páginas de categoría

-- Agregar campo de imagen de categoría
ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Agregar campos para banner de categoría (usado en CategoriaScreen)
ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS banner_imagen_url TEXT;

ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS banner_titulo VARCHAR(200);

ALTER TABLE categorias 
ADD COLUMN IF NOT EXISTS banner_descripcion TEXT;

-- Comentarios
COMMENT ON COLUMN categorias.imagen_url IS 'URL de la imagen de la categoría para mostrar en la homepage';
COMMENT ON COLUMN categorias.banner_imagen_url IS 'URL de la imagen del banner de la página de categoría';
COMMENT ON COLUMN categorias.banner_titulo IS 'Título del banner de la página de categoría';
COMMENT ON COLUMN categorias.banner_descripcion IS 'Descripción del banner de la página de categoría';

-- ============================================
-- 3. VERIFICAR Y ACTUALIZAR metodos_pago
-- ============================================
-- Confirmar que los métodos de pago incluyan "Efectivo" y "Transferencia QR"
-- Estos ya están en el seed data, pero verificamos que el CHECK permita estos valores

-- Actualizar el CHECK constraint si es necesario para incluir todos los métodos
-- Primero eliminamos el constraint si existe
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_metodo_pago_check;

-- Creamos uno nuevo más flexible que permita los métodos del ejemplo
ALTER TABLE pedidos 
ADD CONSTRAINT pedidos_metodo_pago_check 
CHECK (metodo_pago IS NULL OR metodo_pago IN ('Efectivo', 'Transferencia QR', 'Tarjeta', 'Otro'));

-- ============================================
-- 4. ACTUALIZAR TABLA productos
-- ============================================
-- Agregar campos adicionales que se usan en el frontend pero pueden faltar

-- Verificar si existe el campo slug (para URLs amigables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'slug'
    ) THEN
        ALTER TABLE productos ADD COLUMN slug VARCHAR(255);
        CREATE UNIQUE INDEX IF NOT EXISTS productos_slug_unique ON productos(slug) WHERE slug IS NOT NULL;
        COMMENT ON COLUMN productos.slug IS 'Slug para URLs amigables del producto';
    END IF;
END $$;

-- ============================================
-- 5. ACTUALIZAR TABLA pedidos
-- ============================================
-- Verificar que el campo envio_prioritario y costo_envio estén correctos
-- Estos ya existen, pero verificamos que el costo de envío prioritario sea configurable

-- El campo envio_prioritario ya existe
-- El costo_envio ya existe
-- No se necesitan cambios aquí

-- ============================================
-- 6. ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================

-- Índice para búsqueda de banners por tipo
CREATE INDEX IF NOT EXISTS idx_diseno_pagina_tipo ON diseno_pagina(tipo);

-- Índice para búsqueda de categorías con imágenes
CREATE INDEX IF NOT EXISTS idx_categorias_imagen ON categorias(imagen_url) WHERE imagen_url IS NOT NULL;

-- Índice para productos con slug
CREATE INDEX IF NOT EXISTS idx_productos_slug ON productos(slug) WHERE slug IS NOT NULL;

-- ============================================
-- 7. ACTUALIZAR VISTA productos_catalogo
-- ============================================
-- Asegurar que la vista incluya el slug si existe

-- La vista ya está bien definida, pero podemos agregar el slug si existe
-- Nota: Esto requiere recrear la vista, pero solo si el campo slug existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'productos' AND column_name = 'slug'
    ) THEN
        -- Recrear la vista con el slug
        DROP VIEW IF EXISTS productos_catalogo;
        CREATE OR REPLACE VIEW productos_catalogo AS
        SELECT 
            p.id,
            p.sku,
            p.nombre,
            p.slug,
            p.descripcion_corta,
            p.precio,
            p.descuento,
            p.precio_original,
            CASE 
                WHEN p.descuento > 0 THEN p.precio - (p.precio * p.descuento / 100)
                ELSE p.precio
            END as precio_final,
            p.stock,
            p.categoria_id,
            c.nombre as categoria_nombre,
            p.tipo_producto,
            p.es_nuevo,
            p.es_best_seller,
            p.es_oferta,
            p.etiqueta_personalizada,
            p.tiempo_envio,
            p.calificacion_promedio,
            p.total_resenas,
            (SELECT url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = TRUE LIMIT 1) as imagen_principal,
            CASE 
                WHEN p.stock = 0 THEN 'Sin Stock'
                WHEN p.stock < 10 THEN 'Bajo Stock'
                ELSE 'En Stock'
            END as estado_stock,
            p.estado,
            p.created_at
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.estado = 'Activo';
    END IF;
END $$;

-- ============================================
-- FIN DE ACTUALIZACIONES
-- ============================================
-- Resumen de cambios:
-- 1. diseno_pagina: Permitir múltiples banners, agregar tipo y url_enlace
-- 2. categorias: Agregar imagen_url, banner_imagen_url, banner_titulo, banner_descripcion
-- 3. pedidos: Actualizar CHECK constraint para métodos de pago
-- 4. productos: Agregar slug (opcional, solo si no existe)
-- 5. Índices adicionales para optimización
-- 6. Vista productos_catalogo: Incluir slug si existe
-- ============================================

