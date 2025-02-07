import { TwitterApi } from 'twitter-api-v2'

export default defineEventHandler(async (event) => {
  const twitterConfig = useRuntimeConfig(event).twitter
  const storage = useStorage()

  await storage.removeItem('twitterAccessToken')
  await storage.removeItem('twitterRefreshToken')
  await storage.removeItem('twitterState')
  await storage.removeItem('twitterCodeVerifier')
})
