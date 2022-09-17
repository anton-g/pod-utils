import type { LoaderArgs } from '@remix-run/node'
import { json, fetch } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
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

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Pod utils</h1>
      <h2>Directory id's</h2>
      <Form>
        <label>
          iTunes
          <input type="text" name="i"></input>
        </label>
        <label>
          Spotify
          <input type="text" name="s"></input>
        </label>
        <button type="submit">go</button>
      </Form>
      <h3>iTunes</h3>
      <ul>
        {itunesEpisodes.map((ep) => (
          <li key={ep.id}>
            {ep.name} - <ClickToCopy value={ep.id} />
          </li>
        ))}
      </ul>
      <h3>Spotify</h3>
      <ul>
        {spotifyEpisodes.map((ep) => (
          <li key={ep.id}>
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

  return <span onClick={handleClick}>{value}</span>
}
