import { TwitterApi } from 'twitter-api-v2'
import dbStorage from '~~/server/utils/db-storage'

export default defineEventHandler(async (event) => {
  const twitterConfig = useRuntimeConfig(event).twitter

  await dbStorage.clear()

  const client = new TwitterApi({
    clientId: twitterConfig.oauth2.id,
    clientSecret: twitterConfig.oauth2.secret,
  })

  const { codeVerifier, state, url } = await client.generateOAuth2AuthLink('https://localhost3001.dpdd.duckdns.org/api/auth/twitter/callback', {
    scope: [
      'tweet.read',
      'tweet.write',
    ],
  })

  await dbStorage.setItem<string>('twitter:state', state)
  await dbStorage.setItem<string>('twitter:code-verifier', codeVerifier)

  await sendRedirect(event, url)
})
