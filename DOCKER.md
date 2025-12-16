# Guía de Dockerización - SOLHANA

## 📦 Archivos Creados

1. **Dockerfile** - Define cómo construir la imagen de Docker
2. **.dockerignore** - Excluye archivos innecesarios del build
3. **docker-compose.yml** - Facilita el despliegue con Docker Compose

## 🚀 Uso Rápido

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Opción 2: Docker directamente

```bash
# Construir la imagen
docker build -t solhana-app .

# Ejecutar el contenedor
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=tu_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key \
  solhana-app
```

## ⚙️ Variables de Entorno

Necesitas configurar las variables de entorno de Supabase. Tienes dos opciones:

### Opción A: Archivo .env (para desarrollo local)

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### Opción B: Variables en docker-compose.yml

Edita `docker-compose.yml` y agrega las variables en la sección `environment`:

```yaml
environment:
  - NEXT_PUBLIC_SUPABASE_URL=tu_url
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
  - SUPABASE_SERVICE_ROLE_KEY=tu_service_key
```

## 🔧 Comandos Útiles

```bash
# Reconstruir la imagen
docker-compose build --no-cache

# Ver logs en tiempo real
docker-compose logs -f app

# Entrar al contenedor
docker exec -it solhana-app sh

# Ver el estado
docker-compose ps
```

## 📝 Notas Importantes

1. **Puerto**: La aplicación corre en el puerto 3000 por defecto
2. **Variables de entorno**: Asegúrate de configurar todas las variables necesarias
3. **Producción**: Para producción, considera usar un reverse proxy (nginx) delante de la aplicación
4. **Base de datos**: Supabase es externo, no necesitas dockerizar la BD

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
# Reconstruir sin caché
docker-compose build --no-cache
```

### Error: "Port already in use"
```bash
# Cambiar el puerto en docker-compose.yml
ports:
  - "3001:3000"  # Usa 3001 en lugar de 3000
```

### Ver logs de errores
```bash
docker-compose logs app
```

## 🌐 Despliegue en Producción

Para producción, considera:
- Usar un reverse proxy (nginx/traefik)
- Configurar SSL/TLS
- Usar un orquestador (Kubernetes, Docker Swarm)
- Variables de entorno seguras (secrets management)

