import{createContext,useContext,useState,useEffect,useCallback}from'react'
import{translations}from'./i18n'
import{supabase}from'./supabase'
const LanguageContext=createContext({lang:'de',setLang:()=>{},t:()=>'',reloadTexts:()=>{}})
// Texte kommen aus lib/i18n.js; in /admin geänderte Texte liegen in der
// Supabase-Tabelle site_texts und haben Vorrang.
export function LanguageProvider({children}){
const[lang,setLangState]=useState('de')
const[overrides,setOverrides]=useState({de:{},en:{}})
useEffect(()=>{
const saved=localStorage.getItem('communet_lang')
if(saved==='en'||saved==='de'){setLangState(saved);return}
const b=navigator.language||navigator.languages?.[0]||'de'
setLangState(b.toLowerCase().startsWith('de')?'de':'en')
},[])
const reloadTexts=useCallback(async()=>{
const{data,error}=await supabase.from('site_texts').select('key,lang,value')
if(error||!data)return
const o={de:{},en:{}}
data.forEach(r=>{if(o[r.lang])o[r.lang][r.key]=r.value})
setOverrides(o)
},[])
useEffect(()=>{reloadTexts()},[reloadTexts])
function setLang(l){setLangState(l);localStorage.setItem('communet_lang',l)}
const t=(key)=>overrides[lang]?.[key]||translations[lang]?.[key]||overrides.de[key]||translations.de[key]||key
return<LanguageContext.Provider value={{lang,setLang,t,reloadTexts}}>{children}</LanguageContext.Provider>
}
export function useLang(){return useContext(LanguageContext)}
