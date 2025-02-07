declare module 'nuxt/schema' {
  interface RuntimeConfig {
    omdbapi: {
      apiKey: string
    }
    twitter: {
      oauth2: {
        id: string
        secret: string
      }
    }
  }
}

export {}
