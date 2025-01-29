import type { H3Event } from 'h3'
import * as cheerio from 'cheerio'

interface RadarrData {
  id?: string
  release_year: string
  title: string
  imdb_id: string
  clean_title: string
  adult: boolean
}

interface MovieData {
  initialLetterboxdFetch?: {
    productionDataEndpoint: string
  }
  letterboxdFilm?: LetterboxdFilm
  omdbMovie?: OmdbapiMovie
  radarrData?: RadarrData
  error?: Error
}

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

function getMoviesFromContent(content: string): MovieData[] {
  const movies: MovieData[] = []

  cheerio.load(content).extract({
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
  }).movies.forEach((movie) => {
    movies.push({
      initialLetterboxdFetch: {
        productionDataEndpoint: movie.productionDataEndpoint ?? '',
      },
    })
  })

  return movies
}

async function addLetterboxDataToMovies(movies: MovieData[]): Promise<MovieData[]> {
  return Promise.all(movies.map(async (movie) => {
    const response = await $fetch<LetterboxdFilm>(`https://letterboxd.com${movie.initialLetterboxdFetch?.productionDataEndpoint}`, {
      responseType: 'json',
    })

    movie.letterboxdFilm = response

    return movie
  }))
}

async function addOmdbDataToMovies(movies: MovieData[], apiKey: string): Promise<MovieData[]> {
  return Promise.all(movies.map(async (movie) => {
    if (movie.error) {
      return movie
    }

    const response = await $fetch<OmdbapiMovie>(`http://www.omdbapi.com/?t=${movie.letterboxdFilm?.name}&y=${movie.letterboxdFilm?.releaseYear}&apikey=${apiKey}`, {
      responseType: 'json',
    })

    movie.omdbMovie = response

    return movie
  }))
}

function addRadarrDataToMovies(movies: MovieData[]): MovieData[] {
  return movies.map((movie): MovieData => {
    const radarrData: RadarrData = {
      title: movie.letterboxdFilm?.name ?? movie.omdbMovie?.Title ?? 'Unknown',
      release_year: String(movie.letterboxdFilm?.releaseYear) ?? String(movie.omdbMovie?.Year) ?? 'Unknown',
      imdb_id: movie.omdbMovie?.imdbID ?? 'Unknown',
      clean_title: movie.letterboxdFilm?.name?.replace(/[^a-z0-9]/gi, '') ?? 'Unknown',
      adult: false,
    }

    return {
      ...movie,
      radarrData,
    }
  })
}

export default defineEventHandler(async (event) => {
  const content = await getContent(getUrl(event))

  let movies = getMoviesFromContent(content)

  movies = await addLetterboxDataToMovies(movies)

  movies = await addOmdbDataToMovies(movies, useRuntimeConfig(event).omdbapi.apiKey)

  movies = addRadarrDataToMovies(movies)

  return movies.map((movie) => {
    return movie.radarrData
  })
})
