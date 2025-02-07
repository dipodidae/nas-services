import { TwitterApi } from 'twitter-api-v2'

export default defineEventHandler(async (event) => {
  const query = getQuery<{
    state?: string
    code?: string
  }>(event)

  const storage = useStorage()

  const sessionState = storage.getItem('twitterState')
  const sessionCodeVerifier = await storage.getItem<string>('twitterCodeVerifier')

  const errors = []

  if (!query.state)
    errors.push('No state parameter')

  if (!query.code)
    errors.push('No code parameter')

  if (!sessionCodeVerifier)
    errors.push('No code verifier found in session')

  if (!sessionState)
    errors.push('No state found in session')

  if (errors.length > 0) {
    return createError({
      statusCode: 400,
      statusMessage: errors.join(', '),
    })
  }

  const twitterConfig = useRuntimeConfig(event).twitter

  const client = new TwitterApi({
    clientId: twitterConfig.oauth2.id,
    clientSecret: twitterConfig.oauth2.secret,
  })

  try {
    const {
      client: loggedInClient,
      accessToken,
      refreshToken,
    } = await client.loginWithOAuth2({
      code: query.code ?? '',
      codeVerifier: sessionCodeVerifier ?? '',
      redirectUri: 'https://localhost3001.dpdd.duckdns.org/api/auth/twitter/callback',
    })
    loggedInClient.v2.tweet('Hello, world!')
    await storage.setItem('twitterAccessToken', accessToken)
    await storage.setItem('twitterRefreshToken', refreshToken ?? '')
  }
  catch (e) {
    if (!(e instanceof Error)) {
      return createError({
        statusCode: 500,
        statusMessage: 'Unknown error',
      })
    }

    return createError({
      statusCode: 500,
      statusMessage: e.message,
    })
  }
})
