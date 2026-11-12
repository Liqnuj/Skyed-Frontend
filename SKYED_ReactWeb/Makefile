# Makefile - Skyed-Frontend (React + Vite)
#
# Atajos para no escribir "docker compose exec frontend ..." cada vez.
# Uso: make up, make logs, make typecheck...  (requiere 'make': WSL/Linux/macOS,
# o en Windows: winget install GnuWin32.Make)
# ¡OJO! Las líneas de cada comando van con TAB, no con espacios.

.PHONY: up stop down rebuild shell install typecheck build-check logs ps

# Inicia el servidor de Vite en segundo plano
up:
	docker compose up -d

# Detiene el contenedor liberando RAM
stop:
	docker compose stop

# Detiene y elimina el contenedor
down:
	docker compose down

# Reconstruye la imagen (útil si cambiaste el Dockerfile o el package.json).
# -V recrea node_modules del contenedor con las dependencias nuevas.
rebuild:
	docker compose down
	docker compose up -d --build -V

# Entra a la terminal bash del contenedor de Node.js
shell:
	docker compose exec frontend bash

# Instala dependencias nuevas o sincroniza tras un 'git pull'
install:
	docker compose exec frontend npm install

# Revisa los tipos de TypeScript (el proyecto no tiene script "lint" en package.json)
typecheck:
	docker compose exec frontend npx tsc -b --noEmit

# Prueba que el compilado de producción (build) no tenga errores antes de subir a Git
build-check:
	docker compose exec frontend npm run build

# Muestra los logs de Vite (HMR y errores de compilación) en tiempo real
logs:
	docker compose logs -f frontend

# Muestra el estado del contenedor
ps:
	docker compose ps
