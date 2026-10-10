import{useEffect,useRef,useState}from'react'
import styles from'../styles/Reveal.module.css'

// Blendet Inhalt sanft ein, sobald er beim Scrollen sichtbar wird.
// Was schon im Bild ist oder bei "weniger Bewegung" bleibt unverändert sichtbar.
export default function Reveal({children,as:Tag='div',className='',delay=0,style,...rest}){
const ref=useRef(null)
const[state,setState]=useState('idle')
useEffect(()=>{
const el=ref.current
if(!el||typeof IntersectionObserver==='undefined')return
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
if(el.getBoundingClientRect().top<window.innerHeight*0.9)return
setState('hidden')
const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setState('shown');io.disconnect()}},{threshold:.1})
io.observe(el)
return()=>io.disconnect()
},[])
const cls=[className,state==='hidden'?styles.hidden:'',state==='shown'?styles.shown:''].filter(Boolean).join(' ')
return<Tag ref={ref} className={cls} style={delay?{...style,transitionDelay:`${delay}ms`}:style} {...rest}>{children}</Tag>
}
