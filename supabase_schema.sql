-- ============================================
-- SOLHANA - Esquema de Base de Datos Supabase
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla de Categorías
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50), -- Nombre del icono (coffee, cake, snowflake, etc.)
    orden INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    descripcion_corta TEXT, -- Para mostrar en listados
    precio DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(5, 2) DEFAULT 0,
    precio_original DECIMAL(10, 2), -- Precio antes del descuento
    stock INTEGER DEFAULT 0,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    tipo_producto VARCHAR(100), -- Ej: Running, Casual, Skate, Training
    estado VARCHAR(20) DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Activo', 'Inactivo')),
    tiene_variantes BOOLEAN DEFAULT FALSE,
    -- Etiquetas para el frontend
    es_nuevo BOOLEAN DEFAULT FALSE,
    es_best_seller BOOLEAN DEFAULT FALSE,
    es_oferta BOOLEAN DEFAULT FALSE,
    etiqueta_personalizada VARCHAR(50), -- Para etiquetas como "-30%"
    -- Información de envío
    tiempo_envio VARCHAR(50) DEFAULT '24 horas', -- Ej: "Se envía en 24 horas"
    -- Calificaciones
    calificacion_promedio DECIMAL(3, 2) DEFAULT 0,
    total_resenas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Imágenes de Productos
CREATE TABLE producto_imagenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    es_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Variantes de Productos (Atributos)
CREATE TABLE producto_variantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    atributos JSONB NOT NULL, -- {"Color": "Negro", "Talla": "M"}
    precio DECIMAL(10, 2),
    sku VARCHAR(50) UNIQUE,
    stock INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    imagen_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Especificaciones de Productos
CREATE TABLE producto_especificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    valor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    email VARCHAR(255) UNIQUE,
    telefono VARCHAR(50),
    whatsapp VARCHAR(50), -- Número de WhatsApp
    tipo VARCHAR(20) DEFAULT 'Nuevo' CHECK (tipo IN ('Nuevo', 'Recurrente', 'VIP')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_pedidos INTEGER DEFAULT 0,
    total_gastado DECIMAL(10, 2) DEFAULT 0,
    -- Para integración con Supabase Auth
    user_id UUID UNIQUE, -- ID del usuario de Supabase Auth (único para evitar duplicados)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Direcciones de Clientes
CREATE TABLE cliente_direcciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('envio', 'facturacion')),
    calle TEXT NOT NULL,
    ciudad VARCHAR(100),
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Bolivia',
    referencias TEXT, -- Referencias adicionales de la dirección
    es_principal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    -- Información del cliente (para pedidos sin cuenta)
    nombre_cliente VARCHAR(200),
    apellido_cliente VARCHAR(200),
    telefono_cliente VARCHAR(50),
    email_cliente VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Procesando', 'Enviado', 'Completado', 'Cancelado')),
    subtotal DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10, 2) DEFAULT 0,
    costo_envio DECIMAL(10, 2) DEFAULT 0,
    envio_prioritario BOOLEAN DEFAULT FALSE,
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50) CHECK (metodo_pago IN ('Efectivo', 'Transferencia QR', 'Tarjeta', 'Otro')),
    metodo_envio VARCHAR(100),
    direccion_envio_id UUID REFERENCES cliente_direcciones(id) ON DELETE SET NULL,
    direccion_facturacion_id UUID REFERENCES cliente_direcciones(id) ON DELETE SET NULL,
    -- Dirección directa (para pedidos sin cuenta)
    direccion_completa TEXT,
    ciudad_envio VARCHAR(100),
    referencias_envio TEXT,
    -- Estado de WhatsApp
    whatsapp_enviado BOOLEAN DEFAULT FALSE,
    fecha_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Items de Pedido
CREATE TABLE pedido_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
    variante_id UUID REFERENCES producto_variantes(id) ON DELETE SET NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    sku VARCHAR(50),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    cantidad INTEGER NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Historial de Pedidos
CREATE TABLE pedido_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    estado VARCHAR(50) NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completado BOOLEAN DEFAULT FALSE
);

-- Tabla de Usuarios Administradores
CREATE TABLE usuarios_admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(200),
    rol VARCHAR(50) DEFAULT 'admin' CHECK (rol IN ('admin', 'editor', 'viewer')),
    activo BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Configuración del Diseño de Página
CREATE TABLE diseno_pagina (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seccion VARCHAR(100) NOT NULL, -- 'banner_principal', 'novedades', 'categorias', etc.
    configuracion JSONB NOT NULL, -- Configuración flexible en JSON
    visible BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seccion)
);

-- Tabla de Reportes (para almacenar métricas calculadas)
CREATE TABLE reportes_metricas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    ventas_totales DECIMAL(10, 2) DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    tasa_conversion DECIMAL(5, 2) DEFAULT 0,
    valor_promedio_pedido DECIMAL(10, 2) DEFAULT 0,
    visitantes_unicos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fecha)
);

-- ============================================
-- TABLAS PARA FUNCIONALIDADES DEL CLIENTE
-- ============================================

-- Tabla de Carrito de Compras
CREATE TABLE carrito (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- Para usuarios anónimos
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    variante_id UUID REFERENCES producto_variantes(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL, -- Precio al momento de agregar
    -- Atributos seleccionados
    color VARCHAR(50),
    talla VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Un cliente/sesión no puede tener el mismo producto+variante dos veces
    UNIQUE(cliente_id, producto_id, variante_id, session_id)
);

-- Tabla de Reseñas de Productos
CREATE TABLE producto_resenas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    -- Para reseñas anónimas
    nombre_cliente VARCHAR(200),
    email_cliente VARCHAR(255),
    calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    titulo VARCHAR(200),
    comentario TEXT,
    verificada BOOLEAN DEFAULT FALSE, -- Si el cliente compró el producto
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Wishlist/Favoritos
CREATE TABLE wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- Para usuarios anónimos
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cliente_id, producto_id, session_id)
);

-- Tabla de Newsletter/Suscripciones
CREATE TABLE newsletter_suscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(200),
    activo BOOLEAN DEFAULT TRUE,
    fecha_suscripcion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_baja TIMESTAMP WITH TIME ZONE,
    token_confirmacion VARCHAR(255),
    confirmado BOOLEAN DEFAULT FALSE
);

-- Tabla de Sesiones de Usuario (para carrito anónimo)
CREATE TABLE sesiones_usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de Métodos de Pago
CREATE TABLE metodos_pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL, -- 'efectivo', 'transferencia_qr', 'tarjeta'
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Métodos de Envío
CREATE TABLE metodos_envio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL, -- 'estandar', 'prioritario', 'express'
    descripcion TEXT,
    costo DECIMAL(10, 2) DEFAULT 0,
    costo_gratis_desde DECIMAL(10, 2), -- Envío gratis desde este monto
    tiempo_estimado VARCHAR(100), -- Ej: "3-5 días hábiles"
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Productos Relacionados/Recomendados
CREATE TABLE productos_relacionados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    producto_relacionado_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'relacionado', -- 'relacionado', 'tambien_gusta', 'frecuentemente_juntos'
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto_id, producto_relacionado_id)
);

-- Tabla de Búsquedas (para analytics)
CREATE TABLE busquedas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    termino_busqueda VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    resultados_encontrados INTEGER DEFAULT 0,
    categoria_filtrada UUID REFERENCES categorias(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Configuración de la Tienda Pública
CREATE TABLE tienda_configuracion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Ciudades para Envío
CREATE TABLE ciudades_envio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Bolivia',
    activo BOOLEAN DEFAULT TRUE,
    costo_envio_adicional DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para productos
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_sku ON productos(sku);
CREATE INDEX idx_productos_estado ON productos(estado);
CREATE INDEX idx_productos_nombre_trgm ON productos USING gin(nombre gin_trgm_ops);

-- Índices para pedidos
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_pedido);
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);

-- Índices para clientes
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_tipo ON clientes(tipo);
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);

-- Índices para pedido_items
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX idx_pedido_items_producto ON pedido_items(producto_id);

-- Índices para variantes
CREATE INDEX idx_variantes_producto ON producto_variantes(producto_id);
CREATE INDEX idx_variantes_sku ON producto_variantes(sku);

-- Índices para funcionalidades del cliente
CREATE INDEX idx_carrito_cliente ON carrito(cliente_id);
CREATE INDEX idx_carrito_session ON carrito(session_id);
CREATE INDEX idx_carrito_producto ON carrito(producto_id);

CREATE INDEX idx_resenas_producto ON producto_resenas(producto_id);
CREATE INDEX idx_resenas_cliente ON producto_resenas(cliente_id);
CREATE INDEX idx_resenas_estado ON producto_resenas(estado);

CREATE INDEX idx_wishlist_cliente ON wishlist(cliente_id);
CREATE INDEX idx_wishlist_session ON wishlist(session_id);
CREATE INDEX idx_wishlist_producto ON wishlist(producto_id);

CREATE INDEX idx_productos_relacionados_producto ON productos_relacionados(producto_id);
CREATE INDEX idx_productos_relacionados_relacionado ON productos_relacionados(producto_relacionado_id);

CREATE INDEX idx_busquedas_termino ON busquedas(termino_busqueda);
CREATE INDEX idx_busquedas_fecha ON busquedas(created_at);

CREATE INDEX idx_productos_etiquetas ON productos(es_nuevo, es_best_seller, es_oferta);
CREATE INDEX idx_productos_tipo ON productos(tipo_producto);
CREATE INDEX idx_productos_calificacion ON productos(calificacion_promedio DESC);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producto_variantes_updated_at BEFORE UPDATE ON producto_variantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diseno_pagina_updated_at BEFORE UPDATE ON diseno_pagina
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrito_updated_at BEFORE UPDATE ON carrito
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resenas_updated_at BEFORE UPDATE ON producto_resenas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar estadísticas del cliente
CREATE OR REPLACE FUNCTION update_cliente_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clientes
    SET 
        total_pedidos = (
            SELECT COUNT(*) 
            FROM pedidos 
            WHERE cliente_id = NEW.cliente_id 
            AND estado != 'Cancelado'
        ),
        total_gastado = (
            SELECT COALESCE(SUM(total), 0)
            FROM pedidos 
            WHERE cliente_id = NEW.cliente_id 
            AND estado IN ('Completado', 'Enviado')
        ),
        tipo = CASE
            WHEN (SELECT COUNT(*) FROM pedidos WHERE cliente_id = NEW.cliente_id AND estado != 'Cancelado') >= 10 
                 AND (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE cliente_id = NEW.cliente_id AND estado IN ('Completado', 'Enviado')) >= 500 
            THEN 'VIP'
            WHEN (SELECT COUNT(*) FROM pedidos WHERE cliente_id = NEW.cliente_id AND estado != 'Cancelado') >= 3 
            THEN 'Recurrente'
            ELSE 'Nuevo'
        END
    WHERE id = NEW.cliente_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cliente_stats_trigger 
    AFTER INSERT OR UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_cliente_stats();

-- Función para generar número de pedido automático
CREATE OR REPLACE FUNCTION generate_pedido_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_pedido IS NULL OR NEW.numero_pedido = '' THEN
        NEW.numero_pedido := '#' || LPAD(
            (SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM 2) AS INTEGER)), 0) + 1 
             FROM pedidos 
             WHERE numero_pedido ~ '^#[0-9]+$')::TEXT,
            5,
            '0'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_pedido_number_trigger
    BEFORE INSERT ON pedidos
    FOR EACH ROW EXECUTE FUNCTION generate_pedido_number();

-- Función para crear historial automático al cambiar estado de pedido
CREATE OR REPLACE FUNCTION create_pedido_historial()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO pedido_historial (pedido_id, estado, descripcion, completado)
        VALUES (
            NEW.id,
            NEW.estado,
            CASE NEW.estado
                WHEN 'Pendiente' THEN 'El pedido ha sido creado.'
                WHEN 'Procesando' THEN 'El pedido está siendo procesado.'
                WHEN 'Enviado' THEN 'El pedido ha sido enviado.'
                WHEN 'Completado' THEN 'El pedido ha sido completado.'
                WHEN 'Cancelado' THEN 'El pedido ha sido cancelado.'
                ELSE 'Estado del pedido actualizado.'
            END,
            NEW.estado IN ('Completado', 'Cancelado')
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_pedido_historial_trigger
    AFTER UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION create_pedido_historial();

-- Función para actualizar calificación promedio del producto
CREATE OR REPLACE FUNCTION update_producto_calificacion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET 
        calificacion_promedio = (
            SELECT COALESCE(AVG(calificacion), 0)
            FROM producto_resenas
            WHERE producto_id = NEW.producto_id
            AND estado = 'Aprobada'
        ),
        total_resenas = (
            SELECT COUNT(*)
            FROM producto_resenas
            WHERE producto_id = NEW.producto_id
            AND estado = 'Aprobada'
        )
    WHERE id = NEW.producto_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_producto_calificacion_trigger
    AFTER INSERT OR UPDATE ON producto_resenas
    FOR EACH ROW 
    WHEN (NEW.estado = 'Aprobada')
    EXECUTE FUNCTION update_producto_calificacion();

-- Función para crear cliente automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.clientes (
        user_id,
        nombre,
        email,
        tipo,
        fecha_registro
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nombre',
            SPLIT_PART(NEW.email, '@', 1),
            'Usuario'
        ),
        NEW.email,
        'Nuevo',
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING; -- Evitar duplicados si ya existe
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION limpiar_sesiones_expiradas()
RETURNS void AS $$
BEGIN
    DELETE FROM sesiones_usuario
    WHERE expires_at < NOW();
    
    DELETE FROM carrito
    WHERE session_id IN (
        SELECT session_id FROM sesiones_usuario WHERE expires_at < NOW()
    );
END;
$$ language 'plpgsql';

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de productos con información completa
CREATE OR REPLACE VIEW productos_completos AS
SELECT 
    p.id,
    p.sku,
    p.nombre,
    p.descripcion,
    p.precio,
    p.descuento,
    p.stock,
    p.categoria_id,
    c.nombre as categoria_nombre,
    p.tipo_producto,
    p.estado,
    p.tiene_variantes,
    CASE 
        WHEN p.stock = 0 THEN 'Sin Stock'
        WHEN p.stock < 10 THEN 'Bajo Stock'
        ELSE 'En Stock'
    END as estado_stock,
    (SELECT url FROM producto_imagenes WHERE producto_id = p.id AND es_principal = TRUE LIMIT 1) as imagen_principal,
    p.created_at,
    p.updated_at
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id;

-- Vista de pedidos con información del cliente
CREATE OR REPLACE VIEW pedidos_completos AS
SELECT 
    p.id,
    p.numero_pedido,
    p.cliente_id,
    c.nombre as cliente_nombre,
    c.email as cliente_email,
    c.telefono as cliente_telefono,
    p.estado,
    p.subtotal,
    p.descuento,
    p.total,
    p.metodo_pago,
    p.metodo_envio,
    p.fecha_pedido,
    p.fecha_entrega,
    (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id) as total_items,
    p.created_at,
    p.updated_at
FROM pedidos p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- Vista de productos más vendidos
CREATE OR REPLACE VIEW productos_mas_vendidos AS
SELECT 
    p.id,
    p.sku,
    p.nombre,
    SUM(pi.cantidad) as unidades_vendidas,
    SUM(pi.subtotal) as ingresos_totales,
    COUNT(DISTINCT pi.pedido_id) as total_pedidos
FROM productos p
INNER JOIN pedido_items pi ON p.id = pi.producto_id
INNER JOIN pedidos ped ON pi.pedido_id = ped.id
WHERE ped.estado IN ('Completado', 'Enviado')
GROUP BY p.id, p.sku, p.nombre
ORDER BY unidades_vendidas DESC;

-- Vista de productos para catálogo público
CREATE OR REPLACE VIEW productos_catalogo AS
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

-- Vista de carrito con información completa
CREATE OR REPLACE VIEW carrito_completo AS
SELECT 
    c.id,
    c.cliente_id,
    c.session_id,
    c.producto_id,
    c.variante_id,
    p.nombre as producto_nombre,
    p.sku as producto_sku,
    pv.atributos as variante_atributos,
    c.cantidad,
    c.precio_unitario,
    (c.cantidad * c.precio_unitario) as subtotal,
    (SELECT url FROM producto_imagenes WHERE producto_id = c.producto_id AND es_principal = TRUE LIMIT 1) as imagen,
    c.color,
    c.talla,
    c.created_at,
    c.updated_at
FROM carrito c
INNER JOIN productos p ON c.producto_id = p.id
LEFT JOIN producto_variantes pv ON c.variante_id = pv.id;

-- ============================================
-- DATOS INICIALES (SEED DATA)
-- ============================================

-- Insertar categorías de ejemplo
INSERT INTO categorias (nombre, descripcion, icono, orden, estado) VALUES
('Zapatillas', 'Zapatillas deportivas y casuales.', 'shoe', 1, 'Activo'),
('Botas', 'Botas de diferentes estilos.', 'boot', 2, 'Activo'),
('Sandalias', 'Sandalias para el verano.', 'sandal', 3, 'Activo'),
('Zapatos Formales', 'Zapatos formales y de vestir.', 'formal', 4, 'Activo'),
('Ropa', 'Prendas de vestir.', 'clothing', 5, 'Activo'),
('Accesorios', 'Relojes, gafas y complementos.', 'accessories', 6, 'Activo'),
('Electrónica', 'Dispositivos y gadgets.', 'electronics', 7, 'Activo'),
('Libros', 'Libros y publicaciones.', 'books', 8, 'Activo');

-- Insertar métodos de pago
INSERT INTO metodos_pago (nombre, codigo, descripcion, activo, icono, orden) VALUES
('Efectivo', 'efectivo', 'Pago en efectivo al recibir', TRUE, 'cash', 1),
('Transferencia QR', 'transferencia_qr', 'Pago mediante transferencia con código QR', TRUE, 'qr', 2),
('Tarjeta de Crédito', 'tarjeta', 'Pago con tarjeta de crédito o débito', TRUE, 'card', 3);

-- Insertar métodos de envío
INSERT INTO metodos_envio (nombre, codigo, descripcion, costo, costo_gratis_desde, tiempo_estimado, activo, orden) VALUES
('Envío Estándar', 'estandar', 'Envío estándar a todo el país', 0, 50.00, '3-5 días hábiles', TRUE, 1),
('Envío Prioritario', 'prioritario', 'Envío prioritario con entrega rápida', 7.00, NULL, '1-2 días hábiles', TRUE, 2),
('Envío Express', 'express', 'Envío express para urgencias', 15.00, NULL, '24 horas', TRUE, 3);

-- Insertar ciudades de ejemplo (Bolivia)
INSERT INTO ciudades_envio (nombre, codigo_postal, pais, activo, costo_envio_adicional) VALUES
('La Paz', NULL, 'Bolivia', TRUE, 0),
('Santa Cruz', NULL, 'Bolivia', TRUE, 0),
('Cochabamba', NULL, 'Bolivia', TRUE, 0),
('El Alto', NULL, 'Bolivia', TRUE, 0),
('Oruro', NULL, 'Bolivia', TRUE, 0),
('Sucre', NULL, 'Bolivia', TRUE, 0),
('Potosí', NULL, 'Bolivia', TRUE, 0),
('Tarija', NULL, 'Bolivia', TRUE, 0);

-- Insertar configuración inicial del diseño
INSERT INTO diseno_pagina (seccion, configuracion, visible, orden) VALUES
('banner_principal', '{"titulo": "Descubre Nuestra Nueva Colección", "subtitulo": "Explora las últimas tendencias y encuentra tus piezas favoritas.", "textoBoton": "Explorar Ahora", "imagen": null}', TRUE, 1),
('novedades', '{"titulo": "Novedades", "mostrar": true}', TRUE, 2),
('categorias', '{"titulo": "Comprar por Categoría", "mostrar": true}', TRUE, 3);

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_especificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_direcciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseno_pagina ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_metricas ENABLE ROW LEVEL SECURITY;
-- Tablas del cliente
ALTER TABLE carrito ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_resenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_relacionados ENABLE ROW LEVEL SECURITY;
ALTER TABLE busquedas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudades_envio ENABLE ROW LEVEL SECURITY;

-- Políticas: Los administradores pueden hacer todo
-- (Ajustar según tu sistema de autenticación de Supabase)
CREATE POLICY "Admin full access" ON categorias FOR ALL USING (true);
CREATE POLICY "Admin full access" ON productos FOR ALL USING (true);
CREATE POLICY "Admin full access" ON producto_imagenes FOR ALL USING (true);
CREATE POLICY "Admin full access" ON producto_variantes FOR ALL USING (true);
CREATE POLICY "Admin full access" ON producto_especificaciones FOR ALL USING (true);
CREATE POLICY "Admin full access" ON clientes FOR ALL USING (true);
CREATE POLICY "Admin full access" ON cliente_direcciones FOR ALL USING (true);
CREATE POLICY "Admin full access" ON pedidos FOR ALL USING (true);
CREATE POLICY "Admin full access" ON pedido_items FOR ALL USING (true);
CREATE POLICY "Admin full access" ON pedido_historial FOR ALL USING (true);
CREATE POLICY "Admin full access" ON usuarios_admin FOR ALL USING (true);
CREATE POLICY "Admin full access" ON diseno_pagina FOR ALL USING (true);
CREATE POLICY "Admin full access" ON reportes_metricas FOR ALL USING (true);

-- Políticas para tablas del cliente
-- Carrito: Los usuarios pueden ver y modificar su propio carrito
CREATE POLICY "Users can manage own cart" ON carrito FOR ALL USING (
    cliente_id IS NULL OR 
    cliente_id = (SELECT id FROM clientes WHERE user_id = auth.uid() LIMIT 1) OR
    session_id = current_setting('app.session_id', true)
);

-- Reseñas: Público puede leer, usuarios pueden crear sus propias reseñas
CREATE POLICY "Public can read reviews" ON producto_resenas FOR SELECT USING (estado = 'Aprobada');
CREATE POLICY "Users can create reviews" ON producto_resenas FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own reviews" ON producto_resenas FOR UPDATE USING (
    cliente_id = (SELECT id FROM clientes WHERE user_id = auth.uid() LIMIT 1)
);

-- Wishlist: Usuarios pueden gestionar su propia wishlist
CREATE POLICY "Users can manage own wishlist" ON wishlist FOR ALL USING (
    cliente_id IS NULL OR 
    cliente_id = (SELECT id FROM clientes WHERE user_id = auth.uid() LIMIT 1) OR
    session_id = current_setting('app.session_id', true)
);

-- Newsletter: Cualquiera puede suscribirse
CREATE POLICY "Public can subscribe" ON newsletter_suscripciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can unsubscribe" ON newsletter_suscripciones FOR UPDATE USING (true);

-- Productos: Público puede leer productos activos
CREATE POLICY "Public can read active products" ON productos FOR SELECT USING (estado = 'Activo');
CREATE POLICY "Admin full access products" ON productos FOR ALL USING (true);

-- Categorías: Público puede leer categorías activas
CREATE POLICY "Public can read active categories" ON categorias FOR SELECT USING (estado = 'Activo');
CREATE POLICY "Admin full access categories" ON categorias FOR ALL USING (true);

-- Métodos de pago y envío: Público puede leer los activos
CREATE POLICY "Public can read active payment methods" ON metodos_pago FOR SELECT USING (activo = TRUE);
CREATE POLICY "Public can read active shipping methods" ON metodos_envio FOR SELECT USING (activo = TRUE);

-- Ciudades: Público puede leer ciudades activas
CREATE POLICY "Public can read active cities" ON ciudades_envio FOR SELECT USING (activo = TRUE);

-- Búsquedas: Cualquiera puede crear búsquedas
CREATE POLICY "Public can create searches" ON busquedas FOR INSERT WITH CHECK (true);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE categorias IS 'Categorías de productos del catálogo';
COMMENT ON TABLE productos IS 'Productos principales del inventario';
COMMENT ON TABLE producto_variantes IS 'Variantes de productos (colores, tallas, etc.)';
COMMENT ON TABLE pedidos IS 'Pedidos realizados por los clientes';
COMMENT ON TABLE clientes IS 'Información de los clientes';
COMMENT ON TABLE diseno_pagina IS 'Configuración del diseño de la página de inicio';

