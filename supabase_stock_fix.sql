-- ============================================
-- FIX: Actualizar vista productos_catalogo para considerar stock de variantes
-- ============================================

-- Primero eliminar la vista existente (si tiene dependencias, se eliminarán automáticamente)
DROP VIEW IF EXISTS productos_catalogo CASCADE;

-- Recrear la vista productos_catalogo para que calcule el stock total
-- sumando el stock de las variantes cuando tiene_variantes = TRUE
CREATE VIEW productos_catalogo AS
WITH stock_calculado AS (
    SELECT 
        p.id,
        -- Calcular stock total: si tiene variantes, sumar stock de variantes activas, sino usar stock del producto
        CASE 
            WHEN p.tiene_variantes = TRUE THEN
                COALESCE(
                    (SELECT SUM(stock) 
                     FROM producto_variantes 
                     WHERE producto_id = p.id 
                     AND activo = TRUE), 
                    0
                )
            ELSE p.stock
        END as stock_total
    FROM productos p
)
SELECT 
    p.id,
    p.sku,
    p.nombre,
    p.descripcion_corta,
    p.precio,
    p.descuento,
    p.precio_original,
    CASE 
        WHEN p.descuento > 0 THEN p.precio - (p.precio * p.descuento / 100)
        ELSE p.precio
    END as precio_final,
    sc.stock_total as stock,
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
    -- Calcular estado_stock basado en el stock total calculado
    CASE 
        WHEN sc.stock_total = 0 THEN 'Sin Stock'
        WHEN sc.stock_total < 10 THEN 'Bajo Stock'
        ELSE 'En Stock'
    END as estado_stock,
    p.estado,
    p.created_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN stock_calculado sc ON p.id = sc.id
WHERE p.estado = 'Activo';

