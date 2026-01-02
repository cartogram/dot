import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  srcDir: 'server',
  experimental: {
    openAPI: true,
  },
})
