/// <reference types="google.maps" />
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps'

import { jobTitle, useBoard } from '../board'
import type { Board, Job } from '../board'
import { addDays, dateRange, longDate, mondayOf, overlaps, parseIsoDate, shortDate, weekday } from '../dates'
import { useDrawers } from '../drawers'
import { Empty } from '../ui'
import { PlannerHead, WeekNav } from './PlannerHead'

type LatLng = { lat: number; lng: number }

type Stop = {
  job: Job
  day: string
  location: LatLng | null
}

const DAY_COLOURS = ['#3366e6', '#16915a', '#d97706', '#9333ea', '#d6413a', '#0e7490', '#64748b']
const UK_CENTRE: LatLng = { lat: 53.0, lng: -1.8 }
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) ?? 'DEMO_MAP_ID'

async function lookupPostcodes(postcodes: string[]): Promise<Record<string, LatLng>> {
  if (!postcodes.length) return {}
  const res = await fetch('https://api.postcodes.io/postcodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postcodes }),
  })
  if (!res.ok) throw new Error('Could not look up postcodes')
  const { result } = (await res.json()) as {
    result: { query: string; result: { latitude: number; longitude: number } | null }[]
  }
  return Object.fromEntries(
    result
      .filter((r) => r.result)
      .map((r) => [r.query, { lat: r.result!.latitude, lng: r.result!.longitude }]),
  )
}

const dayColour = (iso: string) => DAY_COLOURS[(parseIsoDate(iso).getDay() + 6) % 7]

export function MapView() {
  const board = useBoard()
  const [start, setStart] = useState(() => mondayOf(board.today))
  const [personId, setPersonId] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const postcodes = [...new Set(board.customers.map((c) => c.postcode).filter((p): p is string => !!p))].sort()
  const located = useQuery({
    queryKey: ['postcodes', postcodes],
    queryFn: () => lookupPostcodes(postcodes.slice(0, 100)),
    staleTime: Infinity,
  })

  const end = addDays(start, 6)
  const stops: Stop[] = board.jobs
    .filter((j) => overlaps(j.startDate, j.endDate, start, end))
    .filter((j) => !personId || j.crewIds.includes(personId))
    .map((job) => {
      const postcode = board.customer(job.customerId)?.postcode
      return {
        job,
        day: job.startDate < start ? start : job.startDate,
        location: (postcode && located.data?.[postcode]) || null,
      }
    })
    .sort((a, b) => a.day.localeCompare(b.day))
  const onMap = stops.filter((s) => s.location)

  return (
    <>
      <PlannerHead
        mode="map"
        title="Map"
        eyebrow={`${shortDate(start)} – ${longDate(end)} · ${onMap.length} of ${stops.length} jobs on the map`}
        actions={
          <>
            <select
              className="select"
              aria-label="Whose jobs"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              <option value="">Everyone</option>
              {board.team
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            <WeekNav start={start} today={board.today} onChange={setStart} />
          </>
        }
      />

      <div className="map-layout">
        <div className="card map-box">
          {MAPS_KEY ? (
            <APIProvider apiKey={MAPS_KEY}>
              <LoadFailure />
              <Map
                mapId={MAP_ID}
                defaultCenter={UK_CENTRE}
                defaultZoom={6}
                gestureHandling="greedy"
                disableDefaultUI
                zoomControl
                onClick={() => setSelected(null)}
              >
                <FitToStops stops={onMap} />
                {onMap.map((s) => (
                  <AdvancedMarker
                    key={s.job.id}
                    position={s.location}
                    title={board.customerName(s.job.customerId)}
                    onClick={() => setSelected(s.job.id)}
                  >
                    <Pin
                      background={dayColour(s.day)}
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      glyphText={String(parseIsoDate(s.day).getDate())}
                    />
                  </AdvancedMarker>
                ))}
                {onMap
                  .filter((s) => s.job.id === selected)
                  .map((s) => (
                    <InfoWindow
                      key={s.job.id}
                      position={s.location}
                      pixelOffset={[0, -40]}
                      onCloseClick={() => setSelected(null)}
                    >
                      <StopDetails stop={s} board={board} />
                    </InfoWindow>
                  ))}
              </Map>
            </APIProvider>
          ) : (
            <Empty title="The map needs a Google Maps key">
              Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env (a key with the Maps JavaScript API
              enabled), then restart the dev server. Until then the week's jobs are listed alongside.
            </Empty>
          )}
        </div>

        <div className="card map-list">
          {stops.length === 0 && (
            <div className="muted" style={{ padding: 16 }}>
              Nothing booked this week.
            </div>
          )}
          {stops.map((s, i) => (
            <div key={s.job.id}>
              {s.day !== stops[i - 1]?.day && (
                <h3>
                  {weekday(s.day)} {parseIsoDate(s.day).getDate()}
                </h3>
              )}
              <StopRow stop={s} board={board} active={s.job.id === selected} onSelect={() => setSelected(s.job.id)} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function LoadFailure() {
  const status = useApiLoadingStatus()
  if (status !== APILoadingStatus.FAILED && status !== APILoadingStatus.AUTH_FAILURE) return null
  return (
    <Empty title="Google Maps didn't load">
      Check the internet connection, and that VITE_GOOGLE_MAPS_API_KEY is valid with the Maps
      JavaScript API enabled.
    </Empty>
  )
}

function FitToStops({ stops }: { stops: Stop[] }) {
  const map = useMap()
  const signature = stops.map((s) => s.job.id).join()
  useEffect(() => {
    if (!map || stops.length === 0) return
    if (stops.length === 1) {
      map.setCenter(stops[0].location!)
      map.setZoom(11)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    stops.forEach((s) => bounds.extend(s.location!))
    map.fitBounds(bounds, 48)
  }, [map, signature])
  return null
}

function StopRow({
  stop,
  board,
  active,
  onSelect,
}: {
  stop: Stop
  board: Board
  active: boolean
  onSelect: () => void
}) {
  const drawers = useDrawers()
  const { job } = stop
  return (
    <button
      type="button"
      className={`map-stop ${active ? 'active' : ''}`}
      onClick={() => (stop.location && MAPS_KEY ? onSelect() : drawers.openJob(job.id))}
    >
      <span className="map-dot" style={{ background: dayColour(stop.day) }}>
        {parseIsoDate(stop.day).getDate()}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="t">{board.customerName(job.customerId)}</div>
        <div className="s">
          {jobTitle(job)} · {job.crewIds.map(board.memberName).join(', ') || 'No crew'}
          {job.hotel && ' · Hotel'}
        </div>
        {!stop.location && (
          <div className="flag">
            {board.customer(job.customerId)?.postcode ? 'Postcode not found on the map' : 'No postcode on the customer'}
          </div>
        )}
      </div>
    </button>
  )
}

function StopDetails({ stop, board }: { stop: Stop; board: Board }) {
  const drawers = useDrawers()
  const { job, location } = stop
  return (
    <div className="map-info">
      <b>{board.customerName(job.customerId)}</b>
      <div>
        {jobTitle(job)} · {dateRange(job)}
      </div>
      <div className="muted">{job.crewIds.map(board.memberName).join(', ') || 'No crew yet'}</div>
      <div className="map-info-actions">
        <button type="button" className="btn" onClick={() => drawers.openJob(job.id)}>
          Open job
        </button>
        <a
          className="btn"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${location!.lat},${location!.lng}`}
        >
          Google Maps
        </a>
      </div>
    </div>
  )
}
