SKYED — Plataforma Web de Eventos Deportivos y Sociales

Descripción

Este repositorio contiene el desarrollo del frontend web de SKYED, una plataforma orientada a la consulta, inscripción y gestión de eventos deportivos, además de la consulta y solicitud de servicios para eventos sociales.

El proyecto corresponde a la adaptación del sistema que originalmente utilizaba React Native/Expo hacia una aplicación React Web, pensada principalmente para computadores y navegadores.

SKYED se divide en tres grandes áreas:

Página Principal: acceso general a la plataforma, autenticación y perfil de usuario.

SKYED Deportivo: consulta de eventos deportivos, detalle de eventos, inscripción, checkout, entradas, resultados, notificaciones y entrega de kits.

SKYED Social: consulta de eventos sociales, lugares, reservas, PQR y funcionalidades administrativas.

Actualmente el repositorio se encuentra enfocado en completar y validar el frontend con React Web utilizando información local/mock. Posteriormente, el proyecto será integrado con un backend desarrollado en Laravel, utilizando PostgreSQL como sistema gestor de base de datos.

La arquitectura objetivo del proyecto será:

React Web
    ↓
Laravel API
    ↓
PostgreSQL

Importante: en la versión actual Laravel y PostgreSQL aún no están conectados al frontend. Los datos utilizados para las pruebas del frontend son locales/mock.

Objetivo

El objetivo de SKYED es ofrecer una plataforma web desde la cual los usuarios puedan consultar y participar en eventos deportivos y encontrar soluciones para la organización de eventos sociales.

Entre las principales funcionalidades planteadas se encuentran:

Registro e inicio de sesión de usuarios.

Gestión básica del perfil.

Recuperación de cuenta.

Consulta de eventos deportivos.

Consulta detallada de cada evento.

Inscripción a eventos.

Flujo de checkout.

Consulta de entradas.

Consulta de resultados.

Consulta de notificaciones.

Información sobre entrega de kits.

Consulta de eventos sociales.

Consulta de lugares para eventos.

Solicitud de reservas.

Gestión de PQR.

Sección administrativa.

Herramientas básicas de accesibilidad.

Características principales

Módulo principal

El módulo principal permite acceder a los diferentes servicios de SKYED y contiene las funcionalidades generales de la aplicación:

Inicio.

Inicio de sesión.

Registro.

Recuperación de contraseña.

Perfil.

Manejo de sesión.

Términos y condiciones.

Módulo SKYED Deportivo

Está orientado a los usuarios interesados en participar en eventos deportivos.

Permite actualmente visualizar y recorrer los siguientes procesos:

Página principal deportiva.

Listado de eventos.

Detalle de un evento.

Inscripción.

Checkout.

Mi entrada.

Resultados.

Notificaciones.

Entrega de kits.

Información de SKYED Deportivo.

Módulo SKYED Social

Está orientado a personas que buscan organizar diferentes tipos de eventos.

Incluye:

Página principal social.

Eventos sociales.

Lugares.

Reservas.

PQR.

Información de SKYED Social.

Administración.

Entre los tipos de eventos contemplados por el frontend se encuentran, entre otros:

Bodas.

Quinceañeras.

Cumpleaños.

Baby showers.

Eventos corporativos.

Tecnologías utilizadas

Frontend

React — Biblioteca para la construcción de interfaces.

TypeScript — Tipado estático para JavaScript.

Vite — Herramienta de desarrollo y compilación.

React Router — Manejo de rutas y navegación.

Axios — Cliente HTTP preparado para la futura conexión con Laravel.

Lucide React — Biblioteca de iconos.

CSS — Estilos y diseño visual de la aplicación.

Backend previsto

El backend será integrado posteriormente utilizando:

Laravel — Framework PHP para la API y la lógica de negocio.

PostgreSQL — Sistema gestor de base de datos.

El proyecto SKYED utiliza PostgreSQL como base de datos objetivo. La integración futura debe mantenerse sobre PostgreSQL y no sustituirse por MySQL.

Requisitos

Para ejecutar correctamente la versión actual del proyecto se requiere tener instaladas las siguientes herramientas:

Visual Studio Code — Editor de código.

Node.js — Entorno de ejecución necesario para npm y Vite.

Git — Sistema de control de versiones.

GitHub Desktop — Herramienta gráfica para gestionar repositorios Git.

Google Chrome — Navegador recomendado para realizar pruebas.

Mozilla Firefox — Navegador alternativo para pruebas.

Postman — Recomendado para las futuras pruebas de la API.

Laravel — Será necesario posteriormente para la integración del backend.

Composer — Gestor de dependencias de PHP, requerido posteriormente por Laravel.

PostgreSQL — Base de datos prevista para la integración backend.

Versiones recomendadas

Para el frontend actual:

Node.js 20 o superior.

npm incluido con Node.js.

Navegador moderno con soporte para JavaScript/TypeScript compilado por Vite.

Para el backend futuro se deberá utilizar una versión de PHP, Laravel y PostgreSQL compatible con la versión que se defina al iniciar la integración.

Instalación

1. Clonar el repositorio

Desde una terminal o desde GitHub Desktop, clonar el repositorio:

git clone <URL_DEL_REPOSITORIO>

Entrar a la carpeta del proyecto:

cd Skyed_React/SKYED_ReactWeb

Reemplazar <URL_DEL_REPOSITORIO> por la URL real del repositorio de GitHub.

2. Instalar dependencias

Dentro de la carpeta SKYED_ReactWeb, ejecutar:

npm install

Este comando instala las dependencias definidas en package.json.

3. Configurar variables de entorno

Copiar el archivo:

.env.example

y crear:

.env

La configuración prevista para la API es:

VITE_API_URL=http://127.0.0.1:8000/api

En la etapa actual la API de Laravel aún no está conectada, por lo que esta variable se utiliza como preparación para la integración futura.

4. Ejecutar el proyecto

Para iniciar el servidor de desarrollo ejecutar:

npm run dev

Vite mostrará una dirección similar a:

http://localhost:5173

Abrir esa dirección desde el navegador.

5. Generar la versión de producción

Para verificar que el proyecto pueda compilarse correctamente:

npm run build

Si la compilación termina correctamente, Vite generará la carpeta:

dist/

6. Previsualizar la compilación

Después de generar el build:

npm run preview

Esto permite visualizar localmente la versión compilada para producción.

Estructura del proyecto

La estructura principal del frontend es:

SKYED_ReactWeb/
│
├── public/
│   └── assets/
│       ├── deportivo/
│       ├── principal/
│       ├── social/
│       └── native/
│
├── src/
│   ├── components/
│   │   ├── deportivo/
│   │   ├── principal/
│   │   ├── social/
│   │   └── shared/
│   │
│   ├── context/
│   │   ├── AccessibilityContext.tsx
│   │   └── AuthContext.tsx
│   │
│   ├── data/
│   │   ├── mock.ts
│   │   ├── socialData.ts
│   │   ├── sportEventsData.ts
│   │   └── sportHomeData.ts
│   │
│   ├── hooks/
│   │   ├── useAccessibilitySettings.ts
│   │   └── useRevealObserver.ts
│   │
│   ├── pages/
│   │   ├── deportivo/
│   │   ├── principal/
│   │   └── social/
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── styles/
│   │   ├── deportivo/
│   │   ├── principal/
│   │   ├── social/
│   │   ├── global.css
│   │   ├── legacy.css
│   │   └── legacy-content.css
│   │
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
│
├── .env.example
├── FRONTEND_MIGRATION_MAP.md
├── SOURCE_NOTES.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts

Rutas principales

Página principal

/

Autenticación

/login
/registro
/recuperar
/perfil

SKYED Deportivo

/deportivo
/deportivo/eventos
/deportivo/eventos/:id
/deportivo/inscripcion/:id
/deportivo/checkout
/deportivo/mi-entrada
/deportivo/resultados
/deportivo/notificaciones
/deportivo/nosotros
/deportivo/entrega-kit

SKYED Social

/social
/social/eventos
/social/lugares
/social/nosotros
/social/reservar
/social/pqr
/social/admin

Datos de prueba

Durante la etapa actual, el frontend utiliza datos locales ubicados principalmente en:

src/data/

Entre los archivos utilizados se encuentran:

mock.ts
socialData.ts
sportEventsData.ts
sportHomeData.ts

Estos datos sirven para probar el funcionamiento de las páginas sin depender todavía de un servidor backend.

Por ejemplo:

Usuario
   ↓
React Web
   ↓
Datos mock
   ↓
Interfaz

Cuando se conecte Laravel:

Usuario
   ↓
React Web
   ↓
Axios
   ↓
Laravel API
   ↓
PostgreSQL

Los datos mock deberán ser reemplazados progresivamente por datos provenientes de la API.

Autenticación

La gestión actual de autenticación se encuentra principalmente en:

src/context/AuthContext.tsx

La versión actual utiliza almacenamiento local para simular una sesión.

La clave utilizada actualmente es:

skyed_user

Esta lógica permite desarrollar y probar el frontend antes de implementar la autenticación definitiva en Laravel.

La versión final deberá utilizar una autenticación gestionada por el backend, junto con las respectivas validaciones de permisos.

Accesibilidad

El proyecto incluye funcionalidades de accesibilidad mediante:

src/context/AccessibilityContext.tsx
src/hooks/useAccessibilitySettings.ts
src/components/shared/AccessibilityWidget.tsx

Estas herramientas permiten centralizar configuraciones que facilitan el uso de la aplicación.

API

El archivo principal para la futura comunicación con el backend es:

src/services/api.ts

Actualmente la aplicación se encuentra preparada para trabajar con una URL base de API similar a:

http://127.0.0.1:8000/api

La conexión definitiva seguirá el siguiente esquema:

React
  ↓
Axios
  ↓
Laravel
  ↓
PostgreSQL

No se debe conectar React directamente con PostgreSQL.

Integración futura con Laravel y PostgreSQL

La siguiente fase del proyecto consiste en integrar el frontend terminado con un backend Laravel.

Arquitectura

┌─────────────────────────┐
│       React Web         │
│  Interfaz y navegación  │
└────────────┬────────────┘
             │
             │ HTTP / JSON
             ▼
┌─────────────────────────┐
│       Laravel API       │
│                         │
│ Rutas                   │
│ Controllers             │
│ Requests                │
│ Models / Eloquent       │
│ Autenticación           │
│ Reglas de negocio       │
└────────────┬────────────┘
             │
             │ SQL
             ▼
┌─────────────────────────┐
│       PostgreSQL        │
│       Base de datos     │
└─────────────────────────┘

Integraciones previstas

Posteriormente deberán conectarse:

Usuarios.

Autenticación.

Perfil.

Eventos deportivos.

Inscripciones.

Entradas.

Resultados.

Notificaciones.

Entrega de kits.

Eventos sociales.

Lugares.

Reservas.

PQR.

Administración.

Comandos disponibles

Dentro de SKYED_ReactWeb:

Ejecutar en desarrollo

npm run dev

Compilar

npm run build

Previsualizar producción

npm run preview

Solución de problemas

El navegador muestra una pantalla en blanco

Abrir las herramientas del navegador:

F12 → Console

Revisar si existen errores relacionados con:

imports;

componentes;

rutas;

TypeScript;

JavaScript;

imágenes.

También ejecutar:

npm run build

y revisar cualquier error mostrado por TypeScript o Vite.

Las dependencias no funcionan

Eliminar node_modules y volver a instalar:

Windows PowerShell

Remove-Item -Recurse -Force node_modules
npm install

Linux / macOS

rm -rf node_modules
npm install

Las imágenes no aparecen

Los recursos ubicados dentro de public/assets deben utilizarse desde la URL pública:

/assets/

Ejemplo:

/assets/deportivo/event2.jpg

No se debe escribir:

/public/assets/deportivo/event2.jpg

en una ruta utilizada por el navegador.

Buenas prácticas

Para mantener el proyecto organizado se recomienda:

Mantener los componentes reutilizables dentro de src/components.

Mantener los datos temporales dentro de src/data.

Centralizar la comunicación con la API dentro de src/services.

Mantener estilos separados por módulo.

Utilizar TypeScript para nuevas funcionalidades.

Ejecutar npm run build antes de integrar cambios importantes.

No almacenar contraseñas ni información sensible en localStorage.

No conectar React directamente a PostgreSQL.

Validar en Laravel todas las operaciones importantes.

Mantener las funcionalidades Deportivo y Social separadas por módulos.

Flujo de desarrollo recomendado

El desarrollo del proyecto se plantea en las siguientes etapas:

1. Finalizar React Web
        ↓
2. Probar todas las páginas
        ↓
3. Corregir errores del frontend
        ↓
4. Ejecutar npm run build
        ↓
5. Validar los flujos de usuario
        ↓
6. Configurar Laravel
        ↓
7. Configurar PostgreSQL
        ↓
8. Crear API
        ↓
9. Implementar autenticación
        ↓
10. Conectar Axios
        ↓
11. Sustituir datos mock
        ↓
12. Ejecutar pruebas de integración

Control de versiones

Se recomienda utilizar Git para administrar el código fuente.

Ejemplo para crear una rama:

git checkout -b frontend-deportivo

Guardar cambios:

git add .

Crear commit:

git commit -m "feat: mejora modulo de eventos deportivos"

Actualizar el repositorio:

git push origin frontend-deportivo

Antes de realizar una integración a la rama principal se recomienda ejecutar:

npm run build

Documentación adicional

Dentro del proyecto existen archivos de documentación complementaria:

FRONTEND_MIGRATION_MAP.md

Contiene información relacionada con la adaptación del proyecto original de React Native/Expo hacia React Web.

SOURCE_NOTES.md

Contiene notas y referencias utilizadas durante el desarrollo y adaptación del frontend.

Estado actual del proyecto

Funcionalidad

Estado

React Web

✅ Implementado

TypeScript

✅ Implementado

Vite

✅ Configurado

React Router

✅ Configurado

Página principal

✅ Implementada

Login

✅ Frontend

Registro

✅ Frontend

Recuperación

✅ Frontend

Perfil

✅ Frontend

SKYED Deportivo

✅ Implementado

SKYED Social

✅ Implementado

Accesibilidad

✅ Implementada

Datos mock

✅ Implementados

Axios

🟡 Preparado

Laravel

⏳ Pendiente

API Laravel

⏳ Pendiente

PostgreSQL

⏳ Pendiente de integración

Autenticación real

⏳ Pendiente

Pagos reales

⏳ Pendiente

Contribución

Para realizar cambios sobre el proyecto:

Crear una rama específica para la funcionalidad.

Realizar los cambios.

Verificar que no existan errores en consola.

Ejecutar:

npm run build

Realizar el commit.

Subir la rama al repositorio.

Revisar los cambios antes de integrarlos a la rama principal.

Autoría

Proyecto: SKYED
Tipo: Plataforma Web de Eventos Deportivos y Sociales
Frontend: React + TypeScript + Vite
Backend previsto: Laravel
Base de datos prevista: PostgreSQL

Licencia

La licencia del proyecto deberá definirse de acuerdo con las condiciones establecidas por los responsables del proyecto SKYED.

Resumen

SKYED es una plataforma web que integra servicios relacionados con eventos deportivos y eventos sociales.

La versión actual se concentra en el desarrollo del frontend React Web, permitiendo terminar y validar la interfaz antes de iniciar la integración con el backend.

La arquitectura definitiva será:

React Web
     ↓
Laravel API
     ↓
PostgreSQL

De esta manera:

React manejará la interfaz y experiencia del usuario.

Laravel manejará la lógica de negocio, autenticación, validaciones y API.

PostgreSQL almacenará la información del sistema.