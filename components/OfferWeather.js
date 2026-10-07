import { useEffect, useState } from 'react'

const ICON = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️'
const TXT = c => c === 0 ? 'klar' : c <= 2 ? 'heiter' : c === 3 ? 'bewölkt' : c <= 48 ? 'neblig' : c <= 57 ? 'Nieselregen' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Schauer' : c <= 86 ? 'Schneeschauer' : 'Gewitter'

// Wettervorhersage für Tag (und Uhrzeit) des Angebots – Daten von open-meteo.com (ohne Konto/Schlüssel), nur bis ~16 Tage im Voraus.
export default function OfferWeather({ offer }) {
  const [w, setW] = useState(null)
  const day = offer.datum || offer.von
  useEffect(() => {
    if (!day) return
    const diff = (new Date(day + 'T12:00:00') - new Date()) / 86400000
    if (diff < -1 || diff > 15) { setW({ off: diff > 15 ? 'later' : 'past' }); return }
    let dead = false
    ;(async () => {
      try {
        let lat = offer.lat, lon = offer.lon
        if (lat == null || lon == null) {
          if (!offer.ort) return
          const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(offer.ort.split(',')[0])}&count=1&language=de`)).json()
          if (!g.results?.[0]) return
          lat = g.results[0].latitude; lon = g.results[0].longitude
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${day}&end_date=${day}`
        const d = await (await fetch(url)).json()
        if (dead || !d.daily) return
        let hour = null
        if (offer.datum && offer.uhrzeit && d.hourly) {
          const h = parseInt(offer.uhrzeit.slice(0, 2), 10)
          hour = { t: Math.round(d.hourly.temperature_2m[h]), p: d.hourly.precipitation_probability[h], c: d.hourly.weathercode[h], h }
        }
        setW({ day: { c: d.daily.weathercode[0], max: Math.round(d.daily.temperature_2m_max[0]), min: Math.round(d.daily.temperature_2m_min[0]), p: d.daily.precipitation_probability_max[0] }, hour })
      } catch {}
    })()
    return () => { dead = true }
  }, [day, offer.uhrzeit, offer.lat, offer.lon, offer.ort])

  if (!day || !w) return null
  const box = { background: 'var(--card)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, fontSize: 14 }
  if (w.off) return <div style={{ ...box, color: 'var(--muted)' }}>🌤️ {w.off === 'later' ? 'Wettervorhersage gibt es ab 16 Tage vor dem Termin.' : 'Termin liegt in der Vergangenheit.'}</div>
  const x = w.hour || null
  return (
    <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 34 }}>{ICON(x ? x.c : w.day.c)}</span>
      <div>
        {x && <div><strong>{x.t} °C</strong> um {String(x.h).padStart(2, '0')}:00 Uhr · {TXT(x.c)}{x.p != null ? ` · ${x.p} % Regenrisiko` : ''}</div>}
        <div style={{ color: x ? 'var(--muted)' : 'inherit', fontSize: x ? 13 : 14 }}>Tag: {w.day.min}–{w.day.max} °C · {TXT(w.day.c)}{w.day.p != null ? ` · bis ${w.day.p} % Regen` : ''}</div>
      </div>
    </div>
  )
}
