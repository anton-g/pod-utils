import type { LoaderArgs } from '@remix-run/node'
import { json, fetch } from '@remix-run/node'
import { Form, useLoaderData, useSearchParams } from '@remix-run/react'
import SpotifyWebApi from 'spotify-web-api-node'

// itunes: 1506059489
// spotify: 48pKe510caxiFkvxtoXJge

type Episode = {
  name: string
  date: string
  id: string
}

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url)
  const itunesId = url.searchParams.get('i')
  const spotifyId = url.searchParams.get('s')

  let spotifyRequest = undefined
  let itunesRequest = undefined

  if (spotifyId) {
    spotifyRequest = getFromSpotify(spotifyId)
  }

  if (itunesId) {
    itunesRequest = getFromItunes(itunesId)
  }

  const [itunesResult, spotifyResult] = await Promise.all([
    itunesRequest,
    spotifyRequest,
  ])

  const itunesEpisodes: Episode[] =
    itunesResult?.results
      .filter((x: any) => x.wrapperType === 'podcastEpisode')
      .map((x: any) => ({
        name: x.trackName,
        date: x.releaseDate,
        id: x.trackId,
      })) || []

  const spotifyEpisodes: Episode[] =
    spotifyResult?.body.items.map((x) => ({
      name: x.name,
      date: x.release_date,
      id: x.id,
    })) || []

  return json({ itunesEpisodes, spotifyEpisodes })
}

export default function Index() {
  const { itunesEpisodes, spotifyEpisodes } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const itunesId = searchParams.get('i') || undefined
  const spotifyId = searchParams.get('s') || undefined

  return (
    <div>
      <h1 className="text-4xl">Pod utils</h1>
      <h2 className="text-2xl">Directory id's</h2>
      <Form className="my-3 flex flex-col gap-2 max-w-sm">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col">
            iTunes
            <input
              type="text"
              name="i"
              defaultValue={itunesId}
              className="border-2 rounded p-1"
            />
          </label>
          <label className="flex flex-col">
            Spotify
            <input
              type="text"
              name="s"
              defaultValue={spotifyId}
              className="border-2 rounded p-1"
            />
          </label>
        </div>
        <button type="submit" className="rounded bg-lime-300 hover:bg-lime-400">
          fetch
        </button>
      </Form>
      <h3 className="text-xl mt-4">iTunes</h3>
      <ul>
        {itunesEpisodes.map((ep) => (
          <li key={ep.id} className="leading-relaxed">
            {ep.name} - <ClickToCopy value={ep.id} />
          </li>
        ))}
      </ul>
      <h3 className="text-xl mt-4">Spotify</h3>
      <ul>
        {spotifyEpisodes.map((ep) => (
          <li key={ep.id} className="leading-relaxed">
            {ep.name} - <ClickToCopy value={ep.id} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const getFromSpotify = async (id: string) => {
  const data = await spotifyApi.clientCredentialsGrant()
  spotifyApi.setAccessToken(data.body['access_token'])
  return spotifyApi.getShowEpisodes(id, {
    market: 'SE',
    limit: 10,
  })
}

const getFromItunes = async (id: string) => {
  return fetch(
    `https://itunes.apple.com/lookup?id=${id}&country=SE&media=podcast&entity=podcastEpisode&limit=10`
  ).then((r) => r.json())
}

const ClickToCopy = ({ value }: { value: string }) => {
  const handleClick = () => {
    navigator.clipboard.writeText(value)
  }

  return (
    <button
      onClick={handleClick}
      className="underline hover:bg-lime-300 transition"
    >
      {value}
    </button>
  )
}
