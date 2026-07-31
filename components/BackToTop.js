import{useEffect,useState}from'react'
export default function BackToTop(){
const[show,setShow]=useState(false)
useEffect(()=>{
function onScroll(){setShow(window.scrollY>400)}
window.addEventListener('scroll',onScroll)
return()=>window.removeEventListener('scroll',onScroll)
},[])
if(!show)return null
return(
<button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}style={{position:'fixed',bottom:24,right:24,width:44,height:44,borderRadius:'50%',background:'var(--g)',color:'#fff',border:'none',fontSize:20,cursor:'pointer',boxShadow:'0 4px 16px rgba(0,0,0,0.18)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',transition:'opacity .2s'}}aria-label="Nach oben">
↑
</button>
)
}
