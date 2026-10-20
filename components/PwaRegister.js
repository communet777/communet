import { useEffect } from 'react'

// Registriert den Service Worker (nur in der Produktion, damit die Entwicklung nicht gestört wird).
// Außerdem: Die Home-Bildschirm-App läuft oft tagelang im Hintergrund weiter und lädt beim
// Seitenwechsel nie neu. Deshalb wird beim Zurückholen der App (und alle 10 Minuten) geprüft,
// ob eine neue Version online ist – wenn ja, lädt die App sich selbst neu.
async function checkForUpdate() {
  try {
    const current = window.__NEXT_DATA__ && window.__NEXT_DATA__.buildId
    if (!current) return
    const html = await fetch('/', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.text())
    const m = html.match(/"buildId":"([^"]+)"/)
    if (m && m[1] && m[1] !== current) window.location.reload()
  } catch (e) {}
}

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    const onVisible = () => { if (document.visibilityState === 'visible') checkForUpdate() }
    document.addEventListener('visibilitychange', onVisible)
    const t = setInterval(checkForUpdate, 10 * 60 * 1000)
    return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(t) }
  }, [])
  return null
}
