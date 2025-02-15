import { TwitterApi, TwitterApiV2Settings } from 'twitter-api-v2'
import dbStorage from '~~/server/utils/db-storage'

TwitterApiV2Settings.debug = true

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

async function tweet(message: string) {
  const client = await getTwitterClient()

  return await client.v2.tweet(message)
}

async function getTwitterClient() {
  const accessToken = await dbStorage.getItem<string>('twitter:access-token')

  return new TwitterApi(accessToken!)
}

export default defineEventHandler(async (event) => {
  const request = await readBody<RadarrBody>(event)

  try {
    if (request.eventType === 'Download')
      await tweet(`🎬 Grabbed: ${request.remoteMovie?.title} (${request.remoteMovie?.year})`)

    if (request.eventType === 'Test')
      await tweet('🎬 Test notification')

    if (request.eventType === 'Rename')
      await tweet(`🎬 Renamed: ${request.movie?.title}`)

    if (request.eventType === 'Grab')
      await tweet(`🎬 Grabbed: ${request.remoteMovie?.title} (${request.remoteMovie?.year})`)
  }
  catch (e) {
    console.error(e)
    return 'nok'
  }
})
