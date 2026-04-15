import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// Use Node adapter locally to avoid @cloudflare/vite-plugin CJS interop bug (require_dist)
// Set ASTRO_ADAPTER=cloudflare to force Cloudflare adapter (e.g. in CI)
const useCloudflare = process.env.ASTRO_ADAPTER === 'cloudflare'

export default defineConfig({
  site: 'https://123programmitv.it',
  output: 'static',
  adapter: useCloudflare
    ? cloudflare({ prerenderEnvironment: 'node', imageService: 'compile', platformProxy: { enabled: false }, sessions: false })
    : node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/programma/'),
      serialize(item) {
        if (item.url === 'https://123programmitv.it/') {
          return { ...item, priority: 1.0, changefreq: 'hourly' }
        }
        if (/\/(rai-1|canale-5|italia-1|la7|rete-4|rai-2|rai-3)$/.test(item.url)) {
          return { ...item, priority: 0.9, changefreq: 'daily' }
        }
        if (/\/(film-stasera|serie-stasera|sport-stasera|domani)$/.test(item.url)) {
          return { ...item, priority: 0.85, changefreq: 'daily' }
        }
        return { ...item, priority: 0.7, changefreq: 'daily' }
      },
    }),
  ],
})
