import'../styles/globals.css'
import{LanguageProvider}from'../lib/LanguageContext'
import{AuthProvider}from'../lib/AuthContext'
import{ActiveProfileProvider}from'../lib/ActiveProfileContext'
import Footer from'../components/Footer'
import PwaRegister from'../components/PwaRegister'
import InstallHint from'../components/InstallHint'
export default function App({Component,pageProps}){
return<LanguageProvider><AuthProvider><ActiveProfileProvider><Component{...pageProps}/><Footer/><InstallHint/><PwaRegister/></ActiveProfileProvider></AuthProvider></LanguageProvider>
}
