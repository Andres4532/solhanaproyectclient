-- ============================================
-- TRIGGERS ADICIONALES PARA AUTENTICACIÓN
-- ============================================

-- Eliminar el trigger y la función existentes si ya existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Función para crear cliente automáticamente cuando se registra un usuario
-- Esta función se ejecuta automáticamente cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_nombre TEXT;
    v_email TEXT;
    v_cliente_existe BOOLEAN := FALSE;
BEGIN
    -- Obtener el nombre del usuario
    v_nombre := COALESCE(
        NEW.raw_user_meta_data->>'nombre',
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
        'Usuario'
    );
    
    -- Obtener el email (no puede ser NULL si el usuario tiene email)
    v_email := NEW.email;
    
    -- Verificar si el cliente ya existe por user_id
    SELECT EXISTS(SELECT 1 FROM public.clientes WHERE user_id = NEW.id) INTO v_cliente_existe;
    
    IF v_cliente_existe THEN
        -- Ya existe por user_id, actualizar
        UPDATE public.clientes
        SET 
            email = COALESCE(v_email, email),
            nombre = COALESCE(v_nombre, nombre),
            updated_at = NOW()
        WHERE user_id = NEW.id;
    ELSE
        -- Verificar si existe por email (sin user_id)
        SELECT EXISTS(SELECT 1 FROM public.clientes WHERE email = v_email AND (user_id IS NULL OR user_id != NEW.id)) INTO v_cliente_existe;
        
        IF v_cliente_existe THEN
            -- Existe por email pero sin user_id o con otro user_id, actualizar
            -- Solo actualizar el primer registro encontrado (debería ser único por email)
            UPDATE public.clientes
            SET 
                user_id = NEW.id,
                nombre = COALESCE(v_nombre, nombre),
                updated_at = NOW()
            WHERE email = v_email AND (user_id IS NULL OR user_id != NEW.id)
            AND id = (SELECT id FROM public.clientes WHERE email = v_email AND (user_id IS NULL OR user_id != NEW.id) LIMIT 1);
        ELSE
            -- No existe, insertar nuevo
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
                    v_nombre,
                    v_email,
                    'Nuevo',
                    NOW()
                );
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto único (email o user_id), intentar actualizar
                    -- Actualizar el registro que causó el conflicto
                    UPDATE public.clientes
                    SET 
                        user_id = NEW.id,
                        nombre = COALESCE(v_nombre, nombre),
                        email = COALESCE(v_email, email),
                        updated_at = NOW()
                    WHERE user_id = NEW.id OR email = v_email;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error pero no fallar el registro del usuario
        -- Esto permite que el usuario se registre incluso si hay un error al crear el cliente
        RAISE WARNING 'Error al crear cliente para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
-- Este trigger se ejecuta automáticamente después de INSERT en auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Comentario
COMMENT ON FUNCTION public.handle_new_user() IS 'Crea automáticamente un registro en la tabla clientes cuando se registra un nuevo usuario en auth.users';

