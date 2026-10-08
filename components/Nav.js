import TypIcon from'./TypIcon'
import Icon from'./Icon'
import{ICONS}from'../lib/typIcons'
import Link from'next/link'
import{useRouter}from'next/router'
import{useState,useEffect}from'react'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import{useActiveProfile}from'../lib/ActiveProfileContext'
import ProfileSwitcher from'./ProfileSwitcher'
import ThemeSwitch from'./ThemeSwitch'
import{supabase}from'../lib/supabase'
import styles from'./Nav.module.css'
export default function Nav(){
const router=useRouter()
const{lang,setLang,t}=useLang()
const{user}=useAuth()
const{earlyAccess,unread,active}=useActiveProfile()
const[open,setOpen]=useState(false)
const[internId,setInternId]=useState(null)
useEffect(()=>{
setInternId(null)
if(!user||!active||active.typ!=='kommune')return
let alive=true
supabase.from('kommune_intern').select('aktiv').eq('kommune_id',active.id).maybeSingle().then(({data})=>{if(alive&&data?.aktiv)setInternId(active.id)})
return()=>{alive=false}
},[user,active?.id,active?.typ])
return(
<>
<nav className={styles.nav}>
<Link href="/"className={styles.logo}aria-label="Communet Startseite"><Icon name="globus"size={32}/><span className={styles.logoText}><span className={styles.logoName}>COMMUNET</span><span className={styles.logoClaim}>CONNECT · LIVE · CREATE</span></span></Link>
<div className={styles.links}>
<Link href="/karte"className={`${styles.link}${router.pathname==='/karte'?' '+styles.active:''}`}>{t('nav_map')}</Link>
<Link href="/kommunen"className={`${styles.link}${router.pathname.startsWith('/kommunen')?' '+styles.active:''}`}>{t('nav_communities')}</Link>
<Link href="/angebote"className={`${styles.link}${router.pathname==='/angebote'?' '+styles.active:''}`}>{t('nav_offers')}</Link>
<Link href="/versorgung"className={`${styles.link} ${styles.navSupply}${router.pathname==='/versorgung'?' '+styles.active:''}`}><TypIcon src={ICONS.korb}size={15}/> {t('nav_supply')}</Link>
{user&&earlyAccess&&<Link href="/leute"className={`${styles.link}${router.pathname.startsWith('/leute')?' '+styles.active:''}`}>Leute</Link>}
{user&&earlyAccess&&<Link href="/nachrichten"className={`${styles.link}${router.pathname.startsWith('/nachrichten')?' '+styles.active:''}`}>Nachrichten{unread>0&&<span style={{marginLeft:6,background:'var(--gold,#E9AD55)',color:'#173F4A',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{unread}</span>}</Link>}
{user&&<Link href="/app"className={`${styles.link}${router.pathname==='/app'?' '+styles.active:''}`}>App</Link>}
{user&&<ProfileSwitcher/>}
{user&&internId&&<Link href={`/profil/intern?id=${internId}`}className={`${styles.link}${router.pathname.startsWith('/profil/intern')||router.pathname.startsWith('/profil/raum')?' '+styles.active:''}`}>🏡 Intern</Link>}
{user
?<Link href="/profil"className={`${styles.cta}${router.pathname.startsWith('/profil')?' '+styles.active:''}`}><Icon name="person"/> Profil</Link>
:<Link href="/auth/login"className={styles.cta}>Anmelden</Link>
}
<div className={styles.switchCol}>
<div className={styles.langSwitch}>
<button className={`${styles.langBtn}${lang==='de'?' '+styles.langActive:''}`}onClick={()=>setLang('de')}>DE</button>
<button className={`${styles.langBtn}${lang==='en'?' '+styles.langActive:''}`}onClick={()=>setLang('en')}>EN</button>
</div>
<ThemeSwitch/>
</div>
</div>
<button className={styles.hamburger}onClick={()=>setOpen(o=>!o)}aria-label="Menu">
{open?'✕':'☰'}
</button>
</nav>
{open&&(
<div className={styles.mobileMenu}onClick={()=>setOpen(false)}>
<Link href="/karte"className={styles.mobileLink}><Icon name="karte"/> {t('nav_map')}</Link>
<Link href="/kommunen"className={styles.mobileLink}><Icon name="globus"/> {t('nav_communities')}</Link>
<Link href="/angebote"className={styles.mobileLink}><Icon name="stern"/> {t('nav_offers')}</Link>
<Link href="/versorgung"className={`${styles.mobileLink} ${styles.navSupply}`}><TypIcon src={ICONS.korb}size={15}/> {t('nav_supply')}</Link>
{user&&earlyAccess&&<Link href="/leute"className={styles.mobileLink}><Icon name="person"/> Leute</Link>}
{user&&earlyAccess&&<Link href="/nachrichten"className={styles.mobileLink}><Icon name="stern"/> Nachrichten{unread>0?` (${unread})`:''}</Link>}
{user&&<Link href="/app"className={styles.mobileLink}><Icon name="stern"/> App</Link>}
{user&&internId&&<Link href={`/profil/intern?id=${internId}`}className={styles.mobileLink}>🏡 Intern</Link>}
<div className={styles.mobileLang}>
<button className={`${styles.langBtn}${lang==='de'?' '+styles.langActive:''}`}onClick={e=>{e.stopPropagation();setLang('de')}}>DE</button>
<button className={`${styles.langBtn}${lang==='en'?' '+styles.langActive:''}`}onClick={e=>{e.stopPropagation();setLang('en')}}>EN</button>
</div>
<div className={styles.mobileLang}><ThemeSwitch/></div>
{user&&<div style={{padding:'4px 16px'}}><ProfileSwitcher style={{width:'100%',maxWidth:'none'}}/></div>}
{user
?<Link href="/profil"className={styles.mobileCta}><Icon name="person"/> Profil</Link>
:<Link href="/auth/login"className={styles.mobileCta}>Anmelden</Link>
}
</div>
)}
</>
)
}
