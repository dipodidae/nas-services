import type { H3Event } from 'h3'
import * as cheerio from 'cheerio'

// Error interface for movie services
interface MovieServiceError {
  service: string
  message: string
}

// Base interface for movie services
interface MovieServiceResponse<T> {
  data?: T
  error?: MovieServiceError
}

// Interfaces for different movie data
interface InitialMovieData {
  productionDataEndpoint: string
}

interface RadarrMovieData {
  title: string
  id?: string
  release_year?: string
  imdb_id?: string
  clean_title?: string
  adult: boolean
  errors?: MovieServiceError[]
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

// Interfaces for movie service responses
interface InitialMovieResponse extends MovieServiceResponse<InitialMovieData> {}
interface LetterboxdMovieResponse extends MovieServiceResponse<LetterboxdMovieData> {}
interface OmdbMovieResponse extends MovieServiceResponse<OmdbMovieData> {}
interface TmdbMovieResponse extends MovieServiceResponse<TmdbMovieData> {}
interface RadarrMovieResponse extends MovieServiceResponse<RadarrMovieData> {}

// Interface for the complete movie data
interface MovieData {
  initialMovie: InitialMovieResponse
  letterboxdMovie: LetterboxdMovieResponse
  omdbMovie?: OmdbMovieResponse
  tmdbMovie?: TmdbMovieResponse
  radarrMovie?: RadarrMovieResponse
}

// Utility functions
async function fetchContent(url: string): Promise<string> {
  try {
    return await $fetch<string>(url)
  }
  catch {
    return 'Error fetching content'
  }
}

function extractUrl(event: H3Event): string {
  const path = getRouterParam(event, 'path')
  return `https://letterboxd.com/${path}`
}

function parseInitialMovies(content: string): InitialMovieResponse[] {
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

async function fetchLetterboxdMovie(initialMovie: InitialMovieResponse): Promise<LetterboxdMovieResponse> {
  try {
    const endpoint = initialMovie.data?.productionDataEndpoint ?? ''
    const response = await $fetch<LetterboxdMovieData>(`https://letterboxd.com${endpoint}`, {
      responseType: 'json',
    })

    if (!response.result) {
      throw new Error('No results found')
    }

    return { data: response }
  }
  catch (error) {
    return { error: createMovieServiceError('Letterboxd', error as Error) }
  }
}

function extractPossibleTitles(movie: LetterboxdMovieResponse): string[] {
  const titles: string[] = []

  if (!movie.data)
    return titles

  if (movie.data.name)
    titles.push(movie.data.name)
  if (movie.data.originalName)
    titles.push(movie.data.originalName)
  if (movie.data.name.includes(':'))
    titles.push(movie.data.name.split(':')[0])

  return titles
}

async function fetchOmdbMovie(title: string, year: number, apiKey: string): Promise<OmdbMovieData> {
  return $fetch<OmdbMovieData>(`http://www.omdbapi.com/?t=${title}&y=${year}&apikey=${apiKey}`, {
    responseType: 'json',
  })
}

async function fetchMovieData<T>(
  movie: LetterboxdMovieResponse,
  fetchFunction: (title: string) => Promise<T | undefined>,
): Promise<T | undefined> {
  const possibleTitles = extractPossibleTitles(movie)
  for (const title of possibleTitles) {
    const data = await fetchFunction(title)
    if (data)
      return data
  }
  return undefined
}

async function fetchOmdbMovieData(movie: LetterboxdMovieResponse, apiKey: string): Promise<OmdbMovieResponse> {
  try {
    const response = await fetchMovieData<OmdbMovieData>(movie, async (title) => {
      return await fetchOmdbMovie(title, Number(movie.data?.releaseYear ?? ''), apiKey)
    })

    if (!response || response.Response === 'False' || response.Type !== 'movie') {
      throw new Error('No results found or not a movie')
    }

    return { data: response }
  }
  catch (error) {
    return { error: createMovieServiceError('Omdb', error as Error) }
  }
}

function extractErrors(movie: MovieData): MovieServiceError[] {
  return Object.values(movie)
    .filter((value): value is MovieServiceResponse<any> => !!value?.error)
    .map(value => value.error!)
}

function createRadarrMovieData(movie: MovieData): RadarrMovieResponse {
  const unknown = 'Unknown'

  const data: RadarrMovieData = {
    title: movie.letterboxdMovie?.data?.name || unknown,
    adult: false,
  }

  if (movie.omdbMovie?.data) {
    data.release_year = movie.omdbMovie.data.Year
    data.imdb_id = movie.omdbMovie.data.imdbID
    data.clean_title = movie.omdbMovie.data.Title
  }

  if (movie.tmdbMovie?.data) {
    data.id = String(movie.tmdbMovie.data.id)
  }

  const errors = extractErrors(movie)

  if (errors.length)
    data.errors = errors

  return { data }
}

function createMovieServiceError(service: string, error: Error): MovieServiceError {
  return { service, message: error.message }
}

async function fetchTmdbMovieData(movie: LetterboxdMovieResponse): Promise<TmdbMovieResponse> {
  try {
    const response = await fetchMovieData<TmdbMovieData>(movie, async (title) => {
      const query = { query: title, year: movie.data?.releaseYear }
      const data = await $tmdb<{ page: number, results: TmdbMovieData[] }>('/search/movie', { query })
      return data.results[0]
    })

    if (!response) {
      throw new Error('No results found')
    }

    return { data: response }
  }
  catch (error) {
    return { error: createMovieServiceError('TMDb', error as Error) }
  }
}

async function fetchCompleteMovieData(initialMovie: InitialMovieResponse, omdbApiKey: string): Promise<MovieData> {
  const letterboxdMovie = await fetchLetterboxdMovie(initialMovie)
  const [omdbMovie, tmdbMovie] = await Promise.all([
    fetchOmdbMovieData(letterboxdMovie, omdbApiKey),
    fetchTmdbMovieData(letterboxdMovie),
  ])

  return {
    initialMovie,
    letterboxdMovie,
    omdbMovie,
    tmdbMovie,
    radarrMovie: createRadarrMovieData({
      initialMovie,
      letterboxdMovie,
      omdbMovie,
      tmdbMovie,
    }),
  }
}

export default defineEventHandler(async (event) => {
  const omdbApiKey = useRuntimeConfig(event).omdbapi.apiKey
  const content = await fetchContent(extractUrl(event))
  const initialMovies = parseInitialMovies(content)

  const movies = await Promise.all(
    initialMovies.map(async movie => await fetchCompleteMovieData(movie, omdbApiKey)),
  )

  return movies.map(movie => movie.radarrMovie?.data)
})
