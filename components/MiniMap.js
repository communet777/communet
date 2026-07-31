import{useEffect}from'react'
import{MapContainer,TileLayer,Marker,Popup,useMap}from'react-leaflet'
import'leaflet/dist/leaflet.css'
import L from'leaflet'

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function FitBounds({lat,lon}){
const map=useMap()
useEffect(()=>{
map.setView([lat,lon],10)
},[lat,lon])
return null
}

export default function MiniMap({lat,lon,name}){
if(!lat||!lon)return null
return(
<div style={{height:160,borderRadius:10,overflow:'hidden',marginTop:8}}>
<MapContainer
center={[lat,lon]}
zoom={10}
style={{height:'100%',width:'100%'}}
zoomControl={false}
attributionControl={false}
scrollWheelZoom={false}
dragging={false}
>
<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
<Marker position={[lat,lon]}>
<Popup>{name}</Popup>
</Marker>
</MapContainer>
</div>
)
}
