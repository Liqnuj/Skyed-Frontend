# SKYED — Frontend React Web

Esta carpeta es **solo el frontend web** de SKYED.

## Qué se hizo

Se tomó el proyecto React Native/Expo que compartiste como punto de partida y se eliminó la dependencia de Expo/React Native para convertirlo en:

- React 19
- TypeScript
- Vite
- React Router
- CSS web
- componentes reutilizables
- estado de autenticación local
- datos mock para que las páginas se puedan recorrer sin Laravel

También se conservaron los recursos gráficos del SKYED original (logos, fotografías de Deportivo y Social).

## Importante: Laravel NO está conectado todavía

Esta versión es intencionalmente frontend-only.

La arquitectura futura será:

Navegador -> React Web -> Axios -> Laravel API -> PostgreSQL

Por ahora:

Navegador -> React Web -> datos locales/mock

Esto permite terminar y probar la interfaz antes de mezclar el backend.

## Arrancar

Requisitos:

- Node.js 20+ recomendado
- npm

En una terminal:

```bash
cd frontend-react
npm install
npm run dev
```

Abre la dirección que muestre Vite, normalmente:

```text
http://localhost:5173
```

## Rutas principales

### Principal

- `/`
- `/login`
- `/registro`
- `/recuperar`
- `/perfil`

### SKYED Deportivo

- `/deportivo`
- `/deportivo/eventos`
- `/deportivo/eventos/:id`
- `/deportivo/inscripcion/:id`
- `/deportivo/checkout`
- `/deportivo/mi-entrada`
- `/deportivo/resultados`
- `/deportivo/notificaciones`
- `/deportivo/nosotros`
- `/deportivo/entrega-kit`

### SKYED Social

- `/social`
- `/social/eventos`
- `/social/lugares`
- `/social/nosotros`
- `/social/reservar`
- `/social/pqr`
- `/social/admin`

## Qué significa "mock"

No se está fingiendo una conexión con PostgreSQL.

Por ejemplo, una inscripción se guarda temporalmente en `localStorage` para que podamos probar el flujo visual:

```text
Formulario
  ↓
React
  ↓
localStorage
  ↓
pantalla de confirmación
```

Cuando llegue la fase Laravel, ese flujo se cambiará a:

```text
Formulario
  ↓
React
  ↓
Axios
  ↓
Laravel
  ↓
PostgreSQL
```

## Relación con el proyecto anterior

El proyecto React Native original tenía principalmente `LoginScreen` y `HomeScreen` para comprobar la comunicación con Laravel.

Aquí esos conceptos se transformaron a web:

- `View` -> `div/section`
- `Text` -> `h1/p/span`
- `TextInput` -> `input`
- `TouchableOpacity` -> `button/Link`
- `StyleSheet` -> CSS
- Expo -> Vite
- React Navigation -> React Router

No se copia PHP dentro de React.

## Próxima fase

Cuando el frontend esté aprobado y probado visualmente, se puede conectar esta misma carpeta con:

```text
backend-laravel/
```

y posteriormente con PostgreSQL.

No cambies todavía el código para conectarlo a Laravel.
