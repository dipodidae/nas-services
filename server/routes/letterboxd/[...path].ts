import type { H3Event } from 'h3'
import * as cheerio from 'cheerio'

interface MovieServiceBase {
  data?: any
  error?: Error
}
interface InitialMovieData {
  productionDataEndpoint: string
}

interface RadarrMovieData {
  id?: string | Error
  release_year: string | Error
  title: string | Error
  imdb_id: string | Error
  clean_title: string | Error
  adult: boolean
}

interface LetterboxdDirector {
  name: string
}

interface LetterboxdMovieData {
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

interface OmdbMovieData {
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

interface TmdbMovieData {
  adult: boolean
  backdrop_path: string
  genre_ids: number[]
  id: number
  original_language: string
  original_title: string
  overview: string
  popularity: number
  poster_path: string
  release_date: string
  title: string
  video: boolean
  vote_average: number
  vote_count: number
}

interface InitialMovie extends MovieServiceBase {
  data?: InitialMovieData
}

interface LetterboxdMovie extends MovieServiceBase {
  data?: LetterboxdMovieData
}

interface OmdbMovie extends MovieServiceBase {
  data?: OmdbMovieData
}

interface TmdbMovie extends MovieServiceBase {
  data?: TmdbMovieData
}

interface RadarrMovie extends MovieServiceBase {
  data?: RadarrMovieData
}

interface Movie {
  initialMovie: InitialMovie
  letterboxdMovie: LetterboxdMovie
  omdbMovie?: OmdbMovie
  tmdbMovie?: TmdbMovie
  radarrMovie?: RadarrMovie
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

function getInitialMoviesFromContent(content: string): InitialMovie[] {
  return cheerio.load(content).extract({
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
  }).movies.map(movie => ({
    data: {
      productionDataEndpoint: movie.productionDataEndpoint ?? '',
    },
  }))
}

async function getLetterboxdMovie(movieInitial: InitialMovie): Promise<LetterboxdMovie> {
  try {
    const endpoint = movieInitial.data?.productionDataEndpoint ?? ''

    const response = await $fetch<LetterboxdMovieData>(`https://letterboxd.com${endpoint}`, {
      responseType: 'json',
    })

    return {
      data: response,
    }
  }
  catch (error) {
    return {
      error: error as Error,
    }
  }
}

async function getOmdbMovie(movie: LetterboxdMovie, omdbApiKey: string): Promise<OmdbMovie> {
  try {
    const response = await $fetch<OmdbMovieData>(`http://www.omdbapi.com/?t=${movie.data?.name}&y=${movie.data?.releaseYear}&apikey=${omdbApiKey}`, {
      responseType: 'json',
    })

    return {
      data: response,
    }
  }
  catch (error) {
    return {
      error: error as Error,
    }
  }
}

function getRadarrData(movie: Movie): RadarrMovie {
  const unknown = 'Unknown'

  return {
    data: {
      id: movie.tmdbMovie?.error || String(movie.tmdbMovie?.data?.id || unknown),
      title: movie.letterboxdMovie?.error || movie.letterboxdMovie?.data?.name || unknown,
      release_year: String(movie.letterboxdMovie.data?.releaseYear || unknown),
      imdb_id: movie.omdbMovie?.error || movie.omdbMovie?.data?.imdbID || unknown,
      clean_title: movie.omdbMovie?.error || movie.omdbMovie?.data?.Title || unknown,
      adult: false,
    },
  }
}

async function getTmdbData(letterboxdMovie: LetterboxdMovie): Promise<TmdbMovie> {
  try {
    const data = await $tmdb<{
      page: number
      results: TmdbMovie[]
    }>('/search/movie', {
      query: {
        query: letterboxdMovie.data?.name,
        year: letterboxdMovie.data?.releaseYear,
      },
    })

    return data.results[0]
  }
  catch (error) {
    return {
      error: error as Error,
    }
  }
}

async function getMovieData(initialMovie: InitialMovie, omdbApiKey: string): Promise<Movie> {
  const movie: Movie = {
    initialMovie,
    letterboxdMovie: await getLetterboxdMovie(initialMovie),
  }

  const [omdbMovie, tmdbMovie] = await Promise.all([
    getOmdbMovie(movie.letterboxdMovie, omdbApiKey),
    getTmdbData(movie.letterboxdMovie),
  ])

  movie.omdbMovie = omdbMovie
  movie.tmdbMovie = tmdbMovie
  movie.radarrMovie = getRadarrData(movie)

  return movie
}

export default defineEventHandler(async (event) => {
  const omdbApiKey = useRuntimeConfig(event).omdbapi.apiKey

  const content = await getContent(getUrl(event))

  const movies = await Promise.all(
    getInitialMoviesFromContent(content)
      .map(async movie => await getMovieData(movie, omdbApiKey)),
  )

  return movies.map((movie) => {
    return movie.radarrMovie?.data
  })
})
