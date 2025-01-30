import type { H3Event } from 'h3'
import * as cheerio from 'cheerio'

interface InitialMovie {
  productionDataEndpoint: string
}

interface RadarrMovie {
  id?: string
  release_year: string
  title: string
  imdb_id: string
  clean_title: string
  adult: boolean
}

interface Movie {
  initialMovie: InitialMovie
  letterboxdMovie: LetterboxdMovie
  omdbMovie?: OmdbMovie
  radarrMovie?: RadarrMovie
  tmdbMovie?: TmdbMovie
  error?: Error
}

interface LetterboxdDirector {
  name: string
}

interface LetterboxdMovie {
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

interface OmdbMovie {
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

interface TmdbMovie {
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

function getMoviesFromContent(content: string): InitialMovie[] {
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
    productionDataEndpoint: movie.productionDataEndpoint ?? '',
  }))
}

async function getLetterboxdData(movieInitial: InitialMovie): Promise<LetterboxdMovie> {
  const response = await $fetch<LetterboxdMovie>(`https://letterboxd.com${movieInitial.productionDataEndpoint}`, {
    responseType: 'json',
  })

  return response
}

async function getOmdbData(movie: LetterboxdMovie, omdbApiKey: string): Promise<OmdbMovie> {
  const response = await $fetch<OmdbMovie>(`http://www.omdbapi.com/?t=${movie.name}&y=${movie.releaseYear}&apikey=${omdbApiKey}`, {
    responseType: 'json',
  })

  return response
}

function getRadarrData(movie: Movie): RadarrMovie {
  const unknown = 'Unknown'

  return {
    id: String(movie.tmdbMovie?.id ?? unknown),
    title: movie.letterboxdMovie?.name
      ?? movie.omdbMovie?.Title
      ?? unknown,
    release_year: String(movie.letterboxdMovie?.releaseYear)
      ?? String(movie.omdbMovie?.Year)
      ?? unknown,
    imdb_id: movie.omdbMovie?.imdbID
      ?? unknown,
    clean_title: movie.letterboxdMovie?.name?.replace(/[^a-z0-9]/gi, '')
      ?? unknown,
    adult: false,
  }
}

async function getTmdbData(letterboxdMovie: LetterboxdMovie): Promise<TmdbMovie> {
  const data = await $tmdb<{
    page: number
    results: TmdbMovie[]
  }>('/search/movie', {
    query: {
      query: letterboxdMovie.name,
      year: letterboxdMovie.releaseYear,
    },
  })

  return data.results[0]
}

async function getMovieData(initialMovie: InitialMovie, omdbApiKey: string): Promise<Movie> {
  const movie: Movie = {
    initialMovie,
    letterboxdMovie: await getLetterboxdData(initialMovie),
  }

  const [omdbMovie, tmdbMovie] = await Promise.all([
    getOmdbData(movie.letterboxdMovie, omdbApiKey),
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
    getMoviesFromContent(content)
      .map(async movie => await getMovieData(movie, omdbApiKey)),
  )

  return movies.map((movie) => {
    return movie.radarrMovie
  })
})
