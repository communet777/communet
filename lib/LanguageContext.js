import{createContext,useContext,useState,useEffect}from'react'
import{t as translate}from'./i18n'
const LanguageContext=createContext({lang:'de',setLang:()=>{},t:()=>''})
export function LanguageProvider({children}){
const[lang,setLangState]=useState('de')
useEffect(()=>{
const saved=localStorage.getItem('communet_lang')
if(saved==='en'||saved==='de'){setLangState(saved);return}
const b=navigator.language||navigator.languages?.[0]||'de'
setLangState(b.toLowerCase().startsWith('de')?'de':'en')
},[])
function setLang(l){setLangState(l);localStorage.setItem('communet_lang',l)}
const t=(key)=>translate(lang,key)
return<LanguageContext.Provider value={{lang,setLang,t}}>{children}</LanguageContext.Provider>
}
export function useLang(){return useContext(LanguageContext)}
