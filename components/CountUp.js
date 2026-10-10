import{useEffect,useRef,useState}from'react'

// Zahl, die beim Laden hochzählt (bei "weniger Bewegung" im Betriebssystem sofort fertig)
export default function CountUp({to,duration=1400}){
const[val,setVal]=useState(to)
const from=useRef(0)
useEffect(()=>{
if(!to){setVal(0);from.current=0;return}
if(typeof window==='undefined'||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){setVal(to);from.current=to;return}
let raf,start
const a=from.current
const step=ts=>{
if(!start)start=ts
const p=Math.min(1,(ts-start)/duration)
const v=Math.round(a+(to-a)*(1-Math.pow(1-p,3)))
setVal(v);from.current=v
if(p<1)raf=requestAnimationFrame(step)
}
raf=requestAnimationFrame(step)
return()=>cancelAnimationFrame(raf)
},[to,duration])
return<>{val}</>
}
