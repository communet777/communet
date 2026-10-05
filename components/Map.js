import{useEffect,useRef}from'react'
import{getTypIconUrl,ICONS}from'../lib/typIcons'
import{WATER_COLORS}from'../lib/water'
import{getWaterIcon}from'../lib/waterIcons'
import{getTypColor,ICON_SHADOW,FARM_COLOR}from'../lib/typColors'
export default function Map({communities,selected,onSelect,farmShops=[],selectedFarm=null,selectedZoom=6,onSelectFarm,waterSources=[],onSelectWater,onViewChange,initialView=null,flyTarget=null}){
const mapRef=useRef(null)
const mapInstanceRef=useRef(null)
const markersRef=useRef({})
const farmMarkersRef=useRef({})
const waterLayerRef=useRef(null)
const canvasRef=useRef(null)
// Aktuelle Callbacks merken, damit Leaflet-Ereignisse immer die neueste Version aufrufen
const viewCbRef=useRef(onViewChange);viewCbRef.current=onViewChange
const waterCbRef=useRef(onSelectWater);waterCbRef.current=onSelectWater
useEffect(()=>{
if(typeof window==='undefined'||mapInstanceRef.current)return
const L=require('leaflet');require('leaflet/dist/leaflet.css')
const map=L.map(mapRef.current,{center:initialView?[initialView.lat,initialView.lon]:[50,10],zoom:initialView?initialView.zoom:4,zoomControl:true})
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:18}).addTo(map)
mapInstanceRef.current=map
// Wasserquellen werden auf einer Zeichenfläche (Canvas) gezeichnet, das bleibt auch bei 1000 Punkten flüssig
canvasRef.current=L.canvas({padding:0.3})
waterLayerRef.current=L.layerGroup().addTo(map)
const emitView=()=>{const b=map.getBounds();viewCbRef.current&&viewCbRef.current({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast(),zoom:map.getZoom()})}
map.on('moveend',emitView)
emitView()
},[])
useEffect(()=>{
if(!mapInstanceRef.current)return
const L=require('leaflet')
Object.values(markersRef.current).forEach(m=>mapInstanceRef.current.removeLayer(m))
markersRef.current={}
communities.forEach(k=>{
const icon=L.divIcon({className:'',html:`<div style="width:30px;height:30px;border-radius:50%;background:${getTypColor(k.typ)};border:2px solid #E9AD55;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:${k.status==='aktiv'?1:0.75};-webkit-tap-highlight-color:transparent;outline:none"><img src="${getTypIconUrl(k.typ)}" width="20" height="20" alt="" style="display:block;pointer-events:none;filter:${ICON_SHADOW}"/></div>`,iconSize:[30,30],iconAnchor:[15,15]})
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
const icon=L.divIcon({className:'',html:`<div style="width:26px;height:26px;border-radius:50%;background:${FARM_COLOR};border:2px solid #E9AD55;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none"><img src="${ICONS.korb}" width="16" height="16" alt="" style="display:block;pointer-events:none;filter:${ICON_SHADOW}"/></div>`,iconSize:[26,26],iconAnchor:[13,13]})
const marker=L.marker([f.lat,f.lon],{icon}).addTo(mapInstanceRef.current).on('click',()=>onSelectFarm&&onSelectFarm(f))
farmMarkersRef.current[f.id]=marker
})
},[farmShops])
useEffect(()=>{
if(!mapInstanceRef.current||!waterLayerRef.current)return
const L=require('leaflet')
const g=waterLayerRef.current
g.clearLayers()
waterSources.forEach(w=>{
const icon=L.divIcon({className:'',html:`<div style="width:26px;height:26px;border-radius:50%;background:${WATER_COLORS[w.typ]||'#5a8898'};border:2px solid #E9AD55;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;outline:none"><img src="${getWaterIcon(w.typ)}" width="16" height="16" alt="" style="display:block;pointer-events:none;filter:${ICON_SHADOW}"/></div>`,iconSize:[26,26],iconAnchor:[13,13]})
L.marker([w.lat,w.lon],{icon})
.on('click',()=>waterCbRef.current&&waterCbRef.current(w))
.addTo(g)
})
},[waterSources])
useEffect(()=>{
if(!mapInstanceRef.current||!selected)return
mapInstanceRef.current.flyTo([selected.lat,selected.lon],selectedZoom,{duration:1})
},[selected,selectedZoom])
useEffect(()=>{
if(!mapInstanceRef.current||!selectedFarm)return
mapInstanceRef.current.flyTo([selectedFarm.lat,selectedFarm.lon],10,{duration:1})
},[selectedFarm])
useEffect(()=>{
if(!mapInstanceRef.current||!flyTarget)return
if(flyTarget.bbox){
const[s,n,w,e]=flyTarget.bbox
mapInstanceRef.current.flyToBounds([[s,w],[n,e]],{duration:1,padding:[24,24],maxZoom:16})
}else{
mapInstanceRef.current.flyTo([flyTarget.lat,flyTarget.lon],flyTarget.zoom||13,{duration:1})
}
},[flyTarget])
return<div ref={mapRef}style={{width:'100%',height:'100%',minHeight:'500px',WebkitTapHighlightColor:'transparent'}}/>
}
