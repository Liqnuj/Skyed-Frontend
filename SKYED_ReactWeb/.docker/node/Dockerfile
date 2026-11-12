# .docker/node/Dockerfile
#
# Dockerfile para Desarrollo Local - Frontend React 19 + Vite 8
# -------------------------------------------------------------
# Utiliza Node.js 22 LTS sobre Alpine Linux para un entorno ligero y rápido.

FROM node:22-alpine

# --- 1. Parches de Seguridad y Dependencias Básicas ---
#
# Actualizamos los paquetes de Alpine para aplicar parches de seguridad
# e instalamos 'git' y 'bash' por si necesitamos entrar al contenedor a depurar.
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache git bash

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# --- 2. Configuración de Permisos ---
#
# La imagen oficial de Node ya incluye un usuario no-root llamado 'node' (UID 1000, GID 1000).
# Nos aseguramos de que la carpeta '/app' pertenezca a este usuario para evitar
# errores de permisos al instalar paquetes con npm o generar caché de Vite (.vite).
RUN chown -R node:node /app

# Cambiamos al usuario 'node' (equivalente a tu usuario local 1000 en WSL/Linux).
USER node

# --- 3. Instalación Inicial de Dependencias (Aprovechando Caché) ---
#
# Copiamos los archivos de definición de paquetes con permisos del usuario 'node'.
COPY --chown=node:node package.json package-lock.json* ./

# Instalamos las dependencias dentro de la imagen.
# 'npm ci' instala exactamente las versiones de package-lock.json (lo mismo para
# todo el equipo) y es más rápido que 'npm install'.
RUN npm ci --no-audit --no-fund

# --- 4. Puerto y Comando de Arranque ---
#
# Exponemos el puerto por defecto de Vite.
EXPOSE 5173

# Arrancamos Vite pasando el flag '--host' (0.0.0.0).
# ¡IMPORTANTE! Sin '--host', Vite solo escuchará dentro del contenedor
# y no podrás abrir <http://localhost:5173> desde el navegador de tu máquina.
CMD ["npm", "run", "dev", "--", "--host"]