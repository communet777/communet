import { useState } from 'react'
import Icon from'../components/Icon'
import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/ComingSoon.module.css'

export default function Kontakt(){
  const { t } = useLang()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function handleSubmit(e){
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase.from('contact_messages').insert({
      name: name.trim() || null,
      email: email.trim(),
      message: message.trim(),
    })
    if (error) { setStatus('error'); return }
    setStatus('sent')
    setName(''); setEmail(''); setMessage('')
  }

  return(
    <div><Nav/><div className={styles.page}>
      <div className={styles.icon}>✉️</div>
      <h1 className={styles.title}>{t('contact_title')}</h1>
      <p className={styles.desc}>{t('contact_desc')}</p>
      <div className={styles.features}>
        <div className={styles.feature}>📧 {t('contact_f1')}</div>
        <div className={styles.feature}><Icon name="standort"/> {t('contact_f2')}</div>
      </div>
      <a href="mailto:communet@outlook.de" className={styles.btn}>{t('contact_btn')}</a>

      <div style={{width:'100%',maxWidth:400,marginTop:32,textAlign:'left'}}>
        <div style={{textAlign:'center',fontSize:13,color:'var(--muted)',margin:'0 0 16px'}}>{t('contact_form_title')}</div>
        {status === 'sent' ? (
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontWeight:600,marginBottom:4}}>{t('contact_sent_title')}</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>{t('contact_sent_desc')}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:10}}>
            <input
              type="text" placeholder={t('contact_name')} value={name}
              onChange={e=>setName(e.target.value)}
              style={{padding:'10px 14px',borderRadius:8,border:'1.5px solid var(--border)',fontSize:14,fontFamily:'inherit'}}
            />
            <input
              type="email" placeholder={t('contact_email')} value={email} required
              onChange={e=>setEmail(e.target.value)}
              style={{padding:'10px 14px',borderRadius:8,border:'1.5px solid var(--border)',fontSize:14,fontFamily:'inherit'}}
            />
            <textarea
              placeholder={t('contact_message')} value={message} required rows={5} maxLength={4000}
              onChange={e=>setMessage(e.target.value)}
              style={{padding:'10px 14px',borderRadius:8,border:'1.5px solid var(--border)',fontSize:14,fontFamily:'inherit',resize:'vertical'}}
            />
            <button type="submit" disabled={status==='sending'} className={styles.btn} style={{border:'none',cursor:'pointer'}}>
              {status==='sending' ? t('contact_sending') : t('contact_send')}
            </button>
            {status === 'error' && <div style={{fontSize:12,color:'#c0392b',textAlign:'center'}}>{t('contact_error')}</div>}
          </form>
        )}
      </div>
    </div></div>
  )
}
