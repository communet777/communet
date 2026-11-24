// Gemeinschaftsformen-Quiz (Testversion). Versteckt: nicht im Menü, noindex.
// Das Quiz läuft in einem Shadow-DOM, damit sich seine Styles und die der App nicht gegenseitig beeinflussen.
// Vor dem Launch: überarbeiten und als Reiter „Gemeinschaftsformen“ freigeben oder entfernen.
import{useEffect,useRef}from'react'
import Head from'next/head'
import Nav from'../components/Nav'
import{QUIZ_CSS,QUIZ_HTML,QUIZ_JS}from'../lib/quiz/quizSource'

export default function Quiz(){
const host=useRef(null)
useEffect(()=>{
const el=host.current
if(!el||el.shadowRoot)return
const root=el.attachShadow({mode:'open'})
root.innerHTML='<style>'+QUIZ_CSS+'</style>'+QUIZ_HTML
try{new Function('ROOT',QUIZ_JS)(root)}catch(e){console.error('Quiz konnte nicht starten',e)}
},[])
return(<>
<Head>
<title>Gemeinschaftsformen-Quiz · Communet (Testversion)</title>
<meta name="robots" content="noindex, nofollow"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
</Head>
<Nav/>
<div ref={host}/>
</>)
}
