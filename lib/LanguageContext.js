import { createContext, useContext, useState, useEffect } from 'react'
import { t as translate } from './i18n'

const LanguageContext = createContext({ lang: 'de', setLang: () => {}, t: () => '' })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('de')

  useEffect(() => {
    // 1. Gespeicherte Auswahl hat Vorrang
    const saved = localStorage.getItem('communet_lang')
    if (saved === 'en' || saved === 'de') {
      setLangState(saved)
      return
    }
    // 2. Browser-Sprache automatisch erkennen
    const browserLang = navigator.language || navigator.languages?.[0] || 'de'
    const detected = browserLang.toLowerCase().startsWith('de') ? 'de' : 'en'
    setLangState(detected)
  }, [])

  function setLang(l) {
    setLangState(l)
    localStorage.setItem('communet_lang', l)
  }

  const t = (key) => translate(lang, key)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() { return useContext(LanguageContext) }
