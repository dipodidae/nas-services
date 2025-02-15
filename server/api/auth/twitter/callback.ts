import { TwitterApi } from 'twitter-api-v2'
import dbStorage from '~~/server/utils/db-storage'

export default defineEventHandler(async (event) => {
  const query = getQuery<{
    state?: string
    code?: string
  }>(event)

  const sessionState = await dbStorage.getItem<string>('twitter:state')
  const sessionCodeVerifier = await dbStorage.getItem<string>('twitter:code-verifier')

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

  const {
    accessToken,
    refreshToken,
  } = await client.loginWithOAuth2({
    code: query.code ?? '',
    codeVerifier: sessionCodeVerifier ?? '',
    redirectUri: 'https://localhost3001.dpdd.duckdns.org/api/auth/twitter/callback',
  })

  await dbStorage.setItem('twitter:access-token', accessToken)

  await dbStorage.setItem('twitter:refresh-token', refreshToken ?? '')

  await sendRedirect(event, '/')
})
