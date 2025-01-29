declare module 'nuxt/schema' {
  interface RuntimeConfig {
    omdbapi: {
      apiKey: string
    }
  }
  interface PublicRuntimeConfig {
    domain: string
  }
}

export {}
