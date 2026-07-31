import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MiniMap({ lat, lon, name }) {
  const [open, setOpen] = useState(false)

  if (!lat || !lon) return null

  return (
    <>
      {/* Mini-Karte — klickbar, nicht interaktiv */}
      <div
        onClick={() => setOpen(true)}
        style={{ height: 160, borderRadius: 10, overflow: 'hidden', marginTop: 8, cursor: 'pointer', position: 'relative' }}
        title="Karte vergrößern"
      >
        <MapContainer
          key="mini"
          center={[lat, lon]}
          zoom={10}
          style={{ height: '100%', width: '100%', pointerEvents: 'none' }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lon]}>
            <Popup>{name}</Popup>
          </Marker>
        </MapContainer>
        <div style={{
          position: 'absolute', bottom: 8, right: 8, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 11, padding: '3px 8px', borderRadius: 6, pointerEvents: 'none'
        }}>
          🔍 Vergrößern
        </div>
      </div>

      {/* Modal mit großer interaktiver Karte */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(700px,95vw)', height: 'min(500px,80vh)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10000,
                background: '#fff', border: 'none', borderRadius: 8,
                width: 32, height: 32, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }}
            >
              ×
            </button>
            <MapContainer
              key="modal"
              center={[lat, lon]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              dragging={true}
              zoomControl={true}
              doubleClickZoom={true}
              touchZoom={true}
              keyboard={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
              />
              <Marker position={[lat, lon]}>
                <Popup>{name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </>
  )
}
