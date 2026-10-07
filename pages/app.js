import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Nav from '../components/Nav'
import { useAuth } from '../lib/AuthContext'
import { useLang } from '../lib/LanguageContext'
import styles from '../styles/App.module.css'

// Seite für angemeldete Mitglieder: Communet als App auf dem Startbildschirm installieren (PWA).
// Es ist keine Store-App; die Installation läuft direkt über den Browser.
export default function AppPage() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  const router = useRouter()
  const en = lang === 'en'
  const [platform, setPlatform] = useState('other') // 'ios' | 'ios-other' | 'android' | 'other'
  const [standalone, setStandalone] = useState(false)
  const [deferred, setDeferred] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login?next=/app')
  }, [user, loading])

  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    if (isIOS) setPlatform(/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios')
    else if (/Android/.test(ua)) setPlatform('android')
    function onPrompt(e) { e.preventDefault(); setDeferred(e) }
    function onInstalled() { setDone(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  if (loading || !user) return <div className={styles.loading}>…</div>

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{en ? 'Communet as an app' : 'Communet als App'}</h1>
          <p className={styles.sub}>
            {en
              ? 'Add Communet to your home screen and open it with one tap, without a browser bar. No app store needed.'
              : 'Lege Communet auf deinen Startbildschirm und öffne es mit einem Tipp, ohne Browserleiste. Du brauchst dafür keinen App Store.'}
          </p>
        </div>

        {(standalone || done) && (
          <div className={`${styles.card} ${styles.ok}`}>
            <h2 className={styles.cardTitle}>{en ? 'You are already using the app' : 'Du nutzt die App bereits'}</h2>
            <p className={styles.note} style={{ marginTop: 0 }}>
              {en ? 'Communet is installed on this device.' : 'Communet ist auf diesem Gerät installiert.'}
            </p>
          </div>
        )}

        {!standalone && !done && platform === 'ios' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>iPhone / iPad</h2>
            <ol className={styles.steps}>
              <li>{en ? 'Tap the Share button (square with arrow) at the bottom of Safari.' : 'Tippe unten in Safari auf „Teilen“ (Quadrat mit Pfeil).'}</li>
              <li>{en ? 'Scroll down and tap “Add to Home Screen”.' : 'Scrolle nach unten und tippe auf „Zum Home-Bildschirm“.'}</li>
              <li>{en ? 'Confirm with “Add”. Open Communet from your home screen.' : 'Bestätige mit „Hinzufügen“. Öffne Communet danach über dein Home-Bildschirm-Symbol.'}</li>
            </ol>
          </div>
        )}

        {!standalone && !done && platform === 'ios-other' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>iPhone / iPad</h2>
            <p className={styles.note} style={{ marginTop: 0 }}>
              {en
                ? 'Open communet.net in Safari and sign in there. Then tap Share and “Add to Home Screen”.'
                : 'Öffne communet.net in Safari und melde dich dort an. Tippe dann auf „Teilen“ und „Zum Home-Bildschirm“.'}
            </p>
          </div>
        )}

        {!standalone && !done && (platform === 'android' || platform === 'other') && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{platform === 'android' ? 'Android' : (en ? 'Computer' : 'Computer')}</h2>
            {deferred ? (
              <button className={`btn-primary ${styles.installBtn}`} onClick={install}>{en ? 'Install app' : 'App installieren'}</button>
            ) : (
              <ol className={styles.steps}>
                {platform === 'android' ? (
                  <>
                    <li>{en ? 'Open the browser menu (three dots) in Chrome.' : 'Öffne in Chrome das Menü (drei Punkte).'}</li>
                    <li>{en ? 'Tap “Install app” or “Add to Home screen”.' : 'Tippe auf „App installieren“ oder „Zum Startbildschirm hinzufügen“.'}</li>
                  </>
                ) : (
                  <>
                    <li>{en ? 'In Chrome or Edge, click the install icon in the address bar.' : 'Klicke in Chrome oder Edge auf das Installieren-Symbol in der Adressleiste.'}</li>
                    <li>{en ? 'On iPhone, Android and tablets the app works best.' : 'Am besten funktioniert die App auf Handy und Tablet.'}</li>
                  </>
                )}
              </ol>
            )}
          </div>
        )}

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{en ? 'Good to know' : 'Gut zu wissen'}</h2>
          <ul className={styles.list}>
            <li>{en ? 'It is the same Communet: same account, same data.' : 'Es ist dasselbe Communet: gleiches Konto, gleiche Daten.'}</li>
            <li>{en ? 'Map and communities need an internet connection.' : 'Karte und Gemeinschaften brauchen eine Internetverbindung.'}</li>
            <li>{en ? 'A version for the app stores will follow.' : 'Eine Version für die App Stores folgt.'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
