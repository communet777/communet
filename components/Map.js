import{useEffect,useRef}from'react'
import{getTypIcon}from'../data/communities'
const TYPE_COLORS={"Ökodorf":"#2d6a4f","Kommune":"#e07820","Kollektiv":"#3f51b5","Spirituelle Gemeinschaft":"#8e24aa","Wohnprojekt":"#00897b","Sonstige":"#757575"}
export default function Map({communities,selected,onSelect,farmShops=[]}){
const mapRef=useRef(null)
const mapInstanceRef=useRef(null)
const markersRef=useRef({})
const farmMarkersRef=useRef({})
useEffect(()=>{
if(typeof window==='undefined'||mapInstanceRef.current)return
const L=require('leaflet');require('leaflet/dist/leaflet.css')
const map=L.map(mapRef.current,{center:[20,10],zoom:2,zoomControl:true})
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:18}).addTo(map)
mapInstanceRef.current=map
},[])
useEffect(()=>{
if(!mapInstanceRef.current)return
const L=require('leaflet')
Object.values(markersRef.current).forEach(m=>mapInstanceRef.current.removeLayer(m))
markersRef.current={}
communities.forEach(k=>{
const color=TYPE_COLORS[k.typ]||'#757575'
const icon=L.divIcon({className:'',html:`<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;opacity:${k.status==='aktiv'?1:0.55}">${getTypIcon(k.typ)}</div>`,iconSize:[28,28],iconAnchor:[14,14]})
const marker=L.marker([k.lat,k.lon],{icon}).addTo(mapInstanceRef.current).on('click',()=>onSelect(k))
markersRef.current[k.id]=marker
})
},[communities])
useEffect(()=>{
if(!mapInstanceRef.current)return
const L=require('leaflet')
Object.values(farmMarkersRef.current).forEach(m=>mapInstanceRef.current.removeLayer(m))
farmMarkersRef.current={}
farmShops.forEach(f=>{
if(f.lat==null||f.lon==null)return
const icon=L.divIcon({className:'',html:`<div style="width:24px;height:24px;border-radius:50%;background:#c17817;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer">🧺</div>`,iconSize:[24,24],iconAnchor:[12,12]})
const addr=[f.strasse,[f.plz,f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
const website=f.website?`<a href="${f.website}" target="_blank" rel="noopener noreferrer">${f.website}</a>`:''
const html=`<div style="font-size:13px;max-width:200px"><strong>${f.name}</strong>${addr?`<br>${addr}`:''}${website?`<br>${website}`:''}</div>`
const marker=L.marker([f.lat,f.lon],{icon}).addTo(mapInstanceRef.current).bindPopup(html)
farmMarkersRef.current[f.id]=marker
})
},[farmShops])
useEffect(()=>{
if(!mapInstanceRef.current||!selected)return
mapInstanceRef.current.flyTo([selected.lat,selected.lon],6,{duration:1})
},[selected])
return<div ref={mapRef}style={{width:'100%',height:'100%',minHeight:'500px'}}/>
}
