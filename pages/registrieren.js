import{useState}from'react'
import Nav from'../components/Nav'
import{useLang}from'../lib/LanguageContext'
import styles from'../styles/Registrieren.module.css'
const LAENDER_DE=["Deutschland","Österreich","Schweiz","Frankreich","Italien","Spanien","Portugal","Niederlande","Belgien","Dänemark","Schweden","Norwegen","Finnland","Polen","Tschechien","Slowakei","Ungarn","Kroatien","Griechenland","Irland","England","Schottland","Wales","Estland","Lettland","Litauen","Slowenien","Rumänien","Bulgarien","Serbien","USA","Kanada","Australien","Neuseeland","Indien","Japan","Brasilien","Mexiko","Kolumbien","Argentinien","Costa Rica","Südafrika","Israel","Thailand","Anderes"]
const LAENDER_EN=["Germany","Austria","Switzerland","France","Italy","Spain","Portugal","Netherlands","Belgium","Denmark","Sweden","Norway","Finland","Poland","Czech Republic","Slovakia","Hungary","Croatia","Greece","Ireland","England","Scotland","Wales","Estonia","Latvia","Lithuania","Slovenia","Romania","Bulgaria","Serbia","USA","Canada","Australia","New Zealand","India","Japan","Brazil","Mexico","Colombia","Argentina","Costa Rica","South Africa","Israel","Thailand","Other"]
export default function Registrieren(){
const{t,lang}=useLang()
const[form,setForm]=useState({name:'',email:'',land:'',typ:'person',honeypot:''})
const[status,setStatus]=useState('idle')
const countries=lang==='en'?LAENDER_EN:LAENDER_DE
function update(field,val){setForm(f=>({...f,[field]:val}))}
async function handleSubmit(e){
e.preventDefault()
if(form.honeypot)return
setStatus('sending')
try{
const res=await fetch('https://formspree.io/f/xzdloqrg',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,email:form.email,land:form.land,typ:form.typ,language:lang,_subject:`Neue Communet-Anmeldung: ${form.typ} aus ${form.land}`})})
if(res.ok)setStatus('sent');else setStatus('error')
}catch{setStatus('error')}
}
return(
<div><Nav/>
<div className={styles.page}>
{status==='sent'?(
<><div className={styles.icon}>🎉</div>
<h1 className={styles.title}>{t('reg_thanks_title')}, {form.name}!</h1>
<p className={styles.desc}>{t('reg_thanks_desc')}</p></>
):(
<><div className={styles.icon}>👋</div>
<div className={styles.badge}>{t('reg_badge')}</div>
<h1 className={styles.title}>{t('reg_title')}</h1>
<p className={styles.desc}>{t('reg_desc')}</p>
<form onSubmit={handleSubmit}className={styles.form}>
<div className={styles.typSelector}>
<button type="button"className={`${styles.typBtn}${form.typ==='person'?' '+styles.typActive:''}`}onClick={()=>update('typ','person')}>{t('reg_as_person')}</button>
<button type="button"className={`${styles.typBtn}${form.typ==='kommune'?' '+styles.typActive:''}`}onClick={()=>update('typ','kommune')}>{t('reg_as_commune')}</button>
</div>
<div className={styles.fieldWrap}>
<label className={styles.label}>{form.typ==='kommune'?t('reg_name_commune'):t('reg_name_person')} *</label>
<input type="text"required className={styles.input}placeholder={form.typ==='kommune'?t('reg_name_placeholder_commune'):t('reg_name_placeholder_person')}value={form.name}onChange={e=>update('name',e.target.value)}/>
</div>
<div className={styles.fieldWrap}>
<label className={styles.label}>{t('reg_email')} *</label>
<input type="email"required className={styles.input}placeholder="email@example.com"value={form.email}onChange={e=>update('email',e.target.value)}/>
</div>
<div className={styles.fieldWrap}>
<label className={styles.label}>{t('reg_country')} *</label>
<select required className={styles.input}value={form.land}onChange={e=>update('land',e.target.value)}>
<option value="">{t('reg_country_placeholder')}</option>
{countries.map(l=><option key={l}value={l}>{l}</option>)}
</select>
</div>
<input type="text"name="_gotcha"style={{display:'none'}}tabIndex="-1"autoComplete="off"value={form.honeypot}onChange={e=>update('honeypot',e.target.value)}/>
<button type="submit"className={styles.btn}disabled={status==='sending'}>
{status==='sending'?t('reg_sending'):t('reg_submit')}
</button>
{status==='error'&&<p className={styles.error}>{t('reg_error')}</p>}
</form></>
)}
</div></div>
)
}
