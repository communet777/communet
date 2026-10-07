import { useEffect } from 'react'

// Registriert den Service Worker (nur in der Produktion, damit die Entwicklung nicht gestört wird).
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}
