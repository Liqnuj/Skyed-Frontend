# Mapa de migración

## Antes

React Native / Expo:

```text
App.tsx
  -> LoginScreen
  -> HomeScreen
  -> Axios
  -> Laravel
```

## Ahora

React Web:

```text
src/main.tsx
  -> React Router
  -> páginas
  -> componentes
  -> contexto de autenticación
  -> datos mock
```

## Principios

1. React no habla directamente con PostgreSQL.
2. No se copian archivos PHP al frontend.
3. La lógica de negocio real quedará en Laravel.
4. Las rutas del frontend no dependen de nombres de archivos `.html`.
5. Las imágenes del proyecto original viven en `public/assets`.
6. La capa `src/services` queda preparada para sustituir mocks por Axios/Laravel.
