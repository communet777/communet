import { useEffect, useRef } from 'react'

const TYPE_COLORS = {
  "Ökodorf": "#2d6a4f",
  "Kommune": "#e07820",
  "Kollektiv": "#3f51b5",
  "Spirituelle Gemeinschaft": "#8e24aa",
  "Wohnprojekt": "#00897b",
  "Sonstige": "#757575",
}

export default function Map({ communities, selected, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInstanceRef.current) return

    const L = require('leaflet')
    require('leaflet/dist/leaflet.css')

    const map = L.map(mapRef.current, {
      center: [50, 10],
      zoom: 4,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapInstanceRef.current = map
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    const map = mapInstanceRef.current

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    communities.forEach(k => {
      const color = TYPE_COLORS[k.typ] || '#757575'
      const isActive = k.status === 'aktiv'
      
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: ${color}; border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; cursor: pointer;
          opacity: ${isActive ? 1 : 0.55};
          transition: transform 0.15s;
        ">${k.icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([k.lat, k.lon], { icon })
        .addTo(map)
        .on('click', () => onSelect(k))

      markersRef.current[k.id] = marker
    })
  }, [communities])

  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return
    mapInstanceRef.current.flyTo([selected.lat, selected.lon], 8, { duration: 1 })
  }, [selected])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '500px' }} />
  )
}
