import { useEffect, useState } from 'react'
import { useLang } from '../lib/LanguageContext'
import { useAuth } from '../lib/AuthContext'

const KEY = 'communet_install_hint_dismissed'

// Kleiner Hinweis zum Installieren als App. Erscheint nur für angemeldete Mitglieder auf dem Handy,
// nie in der installierten App selbst, und lässt sich dauerhaft wegklicken.
export default function InstallHint() {
  const { lang } = useLang()
  const { user } = useAuth()
  const [mode, setMode] = useState(null) // 'ios' | 'android' | null
  const [deferred, setDeferred] = useState(null)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(KEY) === '1' } catch (e) {}
    if (dismissed) return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) return
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    if (isSafari) { setMode('ios'); return }
    function onPrompt(e) { e.preventDefault(); setDeferred(e); setMode('android') }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function close() {
    try { localStorage.setItem(KEY, '1') } catch (e) {}
    setMode(null)
  }
  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    close()
  }

  if (!user || !mode) return null
  const en = lang === 'en'
  return (
    <div role="dialog" aria-label={en ? 'Install app' : 'App installieren'} style={{ position: 'fixed', left: 12, right: 76, bottom: 12, zIndex: 60, background: '#173F4A', color: '#F0E6D2', border: '1px solid rgba(233,173,85,.5)', borderRadius: 16, padding: '12px 14px', boxShadow: '0 6px 24px rgba(0,0,0,.28)', fontSize: 13, lineHeight: 1.45, maxWidth: 420 }}>
      <button onClick={close} aria-label={en ? 'Close' : 'Schließen'} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', color: '#F0E6D2', fontSize: 18, cursor: 'pointer' }}>×</button>
      <div style={{ fontWeight: 600, color: '#E9AD55', marginBottom: 2 }}>{en ? 'Use Communet as an app' : 'Communet als App nutzen'}</div>
      {mode === 'ios' ? (
        <div>{en ? 'Tap the Share button in Safari, then “Add to Home Screen”.' : 'Tippe in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“.'}</div>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>{en ? 'Add Communet to your home screen for quick access.' : 'Füge Communet deinem Startbildschirm hinzu, dann ist es mit einem Tipp erreichbar.'}</div>
          <button onClick={install} style={{ padding: '7px 18px', borderRadius: 999, border: 'none', background: '#E9AD55', color: '#173F4A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{en ? 'Install' : 'Installieren'}</button>
        </div>
      )}
    </div>
  )
}
