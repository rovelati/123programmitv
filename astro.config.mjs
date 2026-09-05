import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'

// Use Node adapter locally to avoid @cloudflare/vite-plugin CJS interop bug (require_dist)
// Set ASTRO_ADAPTER=cloudflare to force Cloudflare adapter (e.g. in CI)
const useCloudflare = process.env.ASTRO_ADAPTER === 'cloudflare'

export default defineConfig({
  site: 'https://www.intvstasera.it',
  trailingSlash: 'always',
  output: 'static',
  adapter: useCloudflare
    ? cloudflare({ prerenderEnvironment: 'node', imageService: 'compile', platformProxy: { enabled: false }, sessions: false })
    : node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [],
})
