// Kommunen-Katalog: Grundlage ist data/communities.js.
// Änderungen aus /admin liegen in der Supabase-Tabelle catalog_communities
// und überschreiben den Eintrag mit gleicher id (neue Kommunen ab id 1000,
// hidden=true blendet einen Eintrag aus).
import{useEffect,useState}from'react'
import{COMMUNITIES}from'../data/communities'
import{supabase}from'./supabase'

let cache=null
let pending=null

function clean(row){
  const o={}
  for(const[k,v]of Object.entries(row)){if(k!=='updated_at')o[k]=v}
  if(!Array.isArray(o.tags))o.tags=[]
  return o
}

// Alle Einträge inkl. ausgeblendeter (für /admin)
export function mergeCatalogAll(rows){
  const byId=new Map(COMMUNITIES.map(c=>[c.id,{...c,hidden:false,edited:false}]))
  for(const r of rows||[]){
    const base=byId.get(r.id)
    byId.set(r.id,{...(base||{}),...clean(r),edited:true,isNew:!base})
  }
  return[...byId.values()]
}

export function mergeCatalog(rows){
  return mergeCatalogAll(rows).filter(c=>!c.hidden)
}

export async function fetchCatalogRows(){
  const{data,error}=await supabase.from('catalog_communities').select('*')
  if(error)throw error
  return data||[]
}

export function invalidateCatalog(){cache=null;pending=null}

// Liefert [liste, geladen]. Startet sofort mit der Datei, ersetzt sie
// durch die zusammengeführte Liste, sobald Supabase geantwortet hat.
export function useCatalog(){
  const[list,setList]=useState(cache||COMMUNITIES)
  const[loaded,setLoaded]=useState(!!cache)
  useEffect(()=>{
    if(cache){setList(cache);setLoaded(true);return}
    if(!pending){
      pending=fetchCatalogRows()
        .then(rows=>{cache=mergeCatalog(rows);return cache})
        .catch(()=>{pending=null;return null})
    }
    let alive=true
    pending.then(c=>{if(!alive)return;if(c)setList(c);setLoaded(true)})
    return()=>{alive=false}
  },[])
  return[list,loaded]
}
