import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'

const clientDbMock = fileURLToPath(new URL('./src/lib/db/client.client.ts', import.meta.url))

// Swap `@/lib/db/client` for the browser-safe mock on non-SSR builds.
// Node-only packages (pg, @prisma/adapter-pg) must never reach the browser —
// the runtime pg classes extend EventEmitter from Node's `events` module,
// which Vite stubs in the browser, producing "Class extends value undefined".
const clientDbAliasPlugin = () => ({
  name: 'client-db-alias',
  enforce: 'pre' as const,
  resolveId(source: string, _importer: string | undefined, options: { ssr?: boolean }) {
    if (options.ssr) return null
    if (source === '@/lib/db/client' || source.endsWith('/lib/db/client')) {
      return clientDbMock
    }
    return null
  },
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
  optimizeDeps: {
    // Belt-and-braces: keep Node-only packages out of the client prebundle
    // entirely, so a misrouted import surfaces as a clear resolution error
    // instead of a cryptic "Class extends undefined" at runtime.
    exclude: ['pg', '@prisma/adapter-pg', '@prisma/client'],
  },
  ssr: {
    noExternal: ['@tabler/icons-react'],
  },
})

export default config
