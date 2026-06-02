import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'

const clientDbAliasPlugin = () => ({
  name: 'client-db-alias',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined, options: { ssr?: boolean }) {
    const isDbClient = source === '@/lib/db/client' || 
                       source.endsWith('/src/lib/db/client.ts') || 
                       source.endsWith('/src/lib/db/client')
    if (isDbClient && !options?.ssr) {
      return '/Users/matt/src/Cartogram/distance-over-time/src/lib/db/client.client.ts'
    }
    return null
  }
})

const config = defineConfig({
  plugins: [
    clientDbAliasPlugin(),
    devtools(),
    nitro({
      srcDir: 'server',
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // Use existing public/manifest.json
      outDir: '.output/public',
      workbox: {
        globDirectory: '.output/public',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.strava\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'strava-api-cache',
              expiration: {
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
    }),
  ],
})

export default config
