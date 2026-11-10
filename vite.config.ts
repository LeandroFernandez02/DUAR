import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    // App instalable en el celular (PWA, 10/11). Ver src/app/components/shared/ActualizacionApp.tsx
    // y la guía pública /instalar.
    VitePWA({
      // La versión nueva NO se aplica sola: se avisa y la persona toca «Actualizar»
      // (así no se recarga la pantalla en medio de una carga en el terreno).
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['calivar/calivar-icono.svg', 'calivar/calivar-icono-180.png', 'calivar/calivar-icono-32.png'],
      manifest: {
        id: '/',
        name: 'CALÍVAR · DUAR',
        short_name: 'CALÍVAR',
        description: 'Sistema de búsqueda y rastrillaje del DUAR (Córdoba).',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1e2d',
        theme_color: '#0b1e2d',
        icons: [
          { src: '/calivar/calivar-icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/calivar/calivar-icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/calivar/calivar-icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Se guarda la app (pantallas, estilos, íconos) para que abra sin señal.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Los datos NUNCA se sirven guardados: /api va siempre al servidor (son en vivo y legales).
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // El frontend llama a /api y Vite lo redirige al backend Express.
  // Así no hay CORS ni URLs absolutas hardcodeadas en el código React.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
