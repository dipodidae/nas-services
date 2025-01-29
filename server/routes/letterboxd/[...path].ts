import type { H3Event } from 'h3'
import * as cheerio from 'cheerio'

interface LetterboxdDirector {
  name: string
}

interface LetterboxdFilm {
  result: boolean
  csrf: string
  id: number
  name: string
  originalName: string | null
  image125: string
  image150: string
  releaseYear: number
  runTime: number
  filmlistAction: string
  watchlistAction: string
  slug: string
  url: string
  directors: LetterboxdDirector[]
}

interface OmdbapiMovie {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
  Response: string
}

async function getContent(url: string): Promise<string> {
  try {
    const response = await $fetch<string>(url)
    return response
  }
  catch {
    return 'Error fetching content'
  }
}

function getUrl(event: H3Event): string {
  const path = getRouterParam(event, 'path')
  return `https://letterboxd.com/${path}`
}

function getMoviesFromContent(content: string) {
  const $ = cheerio.load(content)

  return $.extract({
    movies: [
      {
        selector: 'li.poster-container',
        value: {
          productionDataEndpoint: {
            selector: 'div.really-lazy-load',
            value: 'data-production-data-endpoint',
          },
        },
      },
    ],
  }).movies
}

async function mapLetterboxdProductionData(movies: ReturnType<typeof getMoviesFromContent>) {
  return Promise.all(movies.map(async (movie) => {
    return await $fetch<LetterboxdFilm>(`https://letterboxd.com/${movie.productionDataEndpoint}`, {
      responseType: 'json',
    })
  }))
}

async function mapOmdbData(movies: LetterboxdFilm[], apiKey: string) {
  return Promise.all(movies.map(async (movie) => {
    try {
      return await $fetch<OmdbapiMovie>(`https://www.omdbapi.com/?t=${movie.name}&y=${movie.releaseYear}&apikey=${apiKey}`, {
        responseType: 'json',
      })
    }
    catch (error) {
      return {
        error,
      }
    }
  }))
}

export default defineEventHandler(async (event) => {
  const omdbApiKey = useRuntimeConfig(event).omdbapi.apiKey

  const content = await getContent(getUrl(event))

  const movies = getMoviesFromContent(content)

  const mappedMovies = await mapLetterboxdProductionData(movies)

  const omdbMovies = await mapOmdbData(mappedMovies, omdbApiKey)

  return omdbMovies
})
