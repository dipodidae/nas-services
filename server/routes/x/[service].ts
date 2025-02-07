import type { H3Event } from 'h3'
import { TwitterApi } from 'twitter-api-v2'

interface RadarrRemoteMovie {
  title: string
  year: number
  imdbId: string
  rating?: number
}

interface RadarrRelease {
  quality: string
  size: number
  sizeReadable?: string
}

interface RadarrMovie {
  title: string
}

type RadarrEventType = 'Grab' | 'Download' | 'Rename' | 'Test'

interface RadarrBody {
  eventType: RadarrEventType
  movie?: RadarrMovie
  remoteMovie?: RadarrRemoteMovie
  release?: RadarrRelease
}

async function tweet(event: H3Event, message: string) {
  const client = getTwitterClient(event)
  return client.v2.tweet(message)
}

function getTwitterClient(event: H3Event) {
  const twitterConfig = useRuntimeConfig(event).twitter

  return new TwitterApi(twitterConfig.bearerToken)
}

export default defineEventHandler(async (event) => {
  const request = await readBody<RadarrBody>(event)

  try {
    if (request.eventType === 'Download')
      await tweet(event, `🎬 Grabbed: ${request.remoteMovie?.title} (${request.remoteMovie?.year})`)
  }
  catch (e) {
    console.error(e)
    return 'NOK'
  }

  return 'OK'
})
