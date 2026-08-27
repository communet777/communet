import Link from'next/link'
import{useRouter}from'next/router'
import{useState}from'react'
import{useLang}from'../lib/LanguageContext'
import{useAuth}from'../lib/AuthContext'
import styles from'./Nav.module.css'
export default function Nav(){
const router=useRouter()
const{lang,setLang,t}=useLang()
const{user}=useAuth()
const[open,setOpen]=useState(false)
return(
<>
<nav className={styles.nav}>
<Link href="/"className={styles.logo}>communet</Link>
<div className={styles.links}>
<Link href="/karte"className={`${styles.link}${router.pathname==='/karte'?' '+styles.active:''}`}>{t('nav_map')}</Link>
<Link href="/kommunen"className={`${styles.link}${router.pathname.startsWith('/kommunen')?' '+styles.active:''}`}>{t('nav_communities')}</Link>
<Link href="/angebote"className={`${styles.link}${router.pathname==='/angebote'?' '+styles.active:''}`}>{t('nav_offers')}</Link>
<Link href="/versorgung"className={`${styles.link} ${styles.navSupply}${router.pathname==='/versorgung'?' '+styles.active:''}`}>🧺 {t('nav_supply')}</Link>
<div className={styles.langSwitch}>
<button className={`${styles.langBtn}${lang==='de'?' '+styles.langActive:''}`}onClick={()=>setLang('de')}>DE</button>
<button className={`${styles.langBtn}${lang==='en'?' '+styles.langActive:''}`}onClick={()=>setLang('en')}>EN</button>
</div>
{user
?<Link href="/profil"className={`${styles.cta}${router.pathname.startsWith('/profil')?' '+styles.active:''}`}>👤 Profil</Link>
:<Link href="/auth/login"className={styles.cta}>Anmelden</Link>
}
</div>
<button className={styles.hamburger}onClick={()=>setOpen(o=>!o)}aria-label="Menu">
{open?'✕':'☰'}
</button>
</nav>
{open&&(
<div className={styles.mobileMenu}onClick={()=>setOpen(false)}>
<Link href="/karte"className={styles.mobileLink}>🗺️ {t('nav_map')}</Link>
<Link href="/kommunen"className={styles.mobileLink}>🌍 {t('nav_communities')}</Link>
<Link href="/angebote"className={styles.mobileLink}>✨ {t('nav_offers')}</Link>
<Link href="/versorgung"className={`${styles.mobileLink} ${styles.navSupply}`}>🧺 {t('nav_supply')}</Link>
<div className={styles.mobileLang}>
<button className={`${styles.langBtn}${lang==='de'?' '+styles.langActive:''}`}onClick={e=>{e.stopPropagation();setLang('de')}}>DE</button>
<button className={`${styles.langBtn}${lang==='en'?' '+styles.langActive:''}`}onClick={e=>{e.stopPropagation();setLang('en')}}>EN</button>
</div>
{user
?<Link href="/profil"className={styles.mobileCta}>👤 Profil</Link>
:<Link href="/auth/login"className={styles.mobileCta}>Anmelden</Link>
}
</div>
)}
</>
)
}
