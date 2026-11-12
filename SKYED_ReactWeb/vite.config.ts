import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dentro de Docker (docker-compose.yml define CHOKIDAR_USEPOLLING=true) los cambios
// de archivos de Windows no llegan como eventos: se revisan por sondeo para que la
// recarga en caliente (HMR) funcione. Fuera de Docker no cambia nada.
const enDocker = process.env.CHOKIDAR_USEPOLLING === 'true';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // En Docker se arranca con "--host" (0.0.0.0) para poder abrirlo desde tu PC.
    host: 'localhost',
    watch: enDocker ? { usePolling: true, interval: 300 } : undefined,
  },
});
