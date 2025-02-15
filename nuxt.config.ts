import process from 'node:process'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-api-party',
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    omdbapi: {
      apiKey: '',
    },
    twitter: {
      oauth2: {
        id: '',
        secret: '',
      },
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: true,
    typedPages: true,
  },

  compatibilityDate: '2024-11-01',

  nitro: {
    storage: {
      db: {
        driver: 'fs',
        base: './data/db',
      },
    },
  },

  vite: {
    server: {
      allowedHosts: [
        'localhost.dpdd.duckdns.org',
        'localhost3001.dpdd.duckdns.org',
      ],
    },
  },

  apiParty: {
    endpoints: {
      tmdb: {
        url: 'https://api.themoviedb.org/3',
        headers: {
          Authorization: `Bearer ${process.env.NUXT_TMDB_API_TOKEN!}`,
        },
      },
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
})
