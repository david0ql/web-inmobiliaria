import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  /*
    El sitio publico habla con la misma API que el panel. En desarrollo Vite hace
    de proxy para no arrastrar una URL absoluta ni pelearse con CORS.

    `loadEnv` y no `process.env`: el fichero .env no se carga solo en el proceso
    que evalua esta configuracion, solo en el codigo del cliente. Sin esto,
    VITE_API_TARGET se ignora en silencio y el proxy sigue apuntando a
    localhost:3000 — que es justo el fallo que parece un 502 de la API.
  */
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:3000'

  // /media es tan imprescindible como /api: las fotos del inventario no viven en
  // un CDN, se sirven como estaticos desde uploads/ del backend y quedan FUERA
  // del prefijo /api/v1, asi que necesitan su propia entrada.
  const proxy = { target, changeOrigin: true }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // 5173 lo ocupa el panel; los dos suelen correr a la vez.
      port: 5174,
      proxy: { '/api': proxy, '/media': proxy },
    },
    // `preview` no hereda el proxy de `server`: hay que repetirlo para poder
    // medir el sitio compilado, que es el unico numero que significa algo.
    preview: {
      port: 4174,
      proxy: { '/api': proxy, '/media': proxy },
    },
  }
})
