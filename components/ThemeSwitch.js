import{useState,useEffect}from'react'
import{useLang}from'../lib/LanguageContext'
import styles from'./Nav.module.css'
const KEY='communet_theme'
const OPTS=[['auto','Auto','Auto'],['light','Hell','Light'],['dark','Dunkel','Dark']]
// Darstellung: Auto (folgt dem Gerät) / Hell / Dunkel. Standard ist Hell.
// Das Attribut data-theme wird vor dem ersten Rendern in _document.js gesetzt.
export default function ThemeSwitch(){
const{lang}=useLang()
const[mode,setMode]=useState('light')
useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s==='auto'||s==='dark'||s==='light')setMode(s)}catch(err){}},[])
function pick(m,ev){
if(ev)ev.stopPropagation()
setMode(m)
document.documentElement.setAttribute('data-theme',m)
try{localStorage.setItem(KEY,m)}catch(err){}
}
return(
<div className={styles.langSwitch}role="group"aria-label={lang==='de'?'Darstellung':'Appearance'}>
{OPTS.map(([k,de,en])=>(
<button key={k}type="button"className={`${styles.langBtn}${mode===k?' '+styles.langActive:''}`}onClick={ev=>pick(k,ev)}>{lang==='de'?de:en}</button>
))}
</div>
)
}
