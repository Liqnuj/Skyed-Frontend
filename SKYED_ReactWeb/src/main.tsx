import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/principal/HomePage';
import LoginPage from './pages/principal/LoginPage';
import RegisterPage from './pages/principal/RegisterPage';
import RecoverPage from './pages/principal/RecoverPage';
import ProfilePage from './pages/principal/ProfilePage';
import SportHome from './pages/deportivo/SportHome';
import SportEvents from './pages/deportivo/SportEvents';
import SportEventDetail from './pages/deportivo/SportEventDetail';
import Inscription from './pages/deportivo/Inscription';
import MyEntry from './pages/deportivo/MyEntry';
import Results from './pages/deportivo/Results';
import Notifications from './pages/deportivo/Notifications';
import AboutSport from './pages/deportivo/About';
import Kit from './pages/deportivo/Kit';
import Checkout from './pages/deportivo/Checkout';
import SocialHome from './pages/social/SocialHome';
import SocialEvents from './pages/social/SocialEvents';
import Venues from './pages/social/Venues';
import AboutSocial from './pages/social/nosotros';
import Reserve from './pages/social/Reserve';
import PQR from './pages/social/PQR';
import Admin from './pages/social/Admin';
import './styles/global.css';
import './styles/principal/principal.css';
import './styles/social/social.css';
import './styles/deportivo/deportivo.css';

function App(){
  return <AccessibilityProvider><AuthProvider><BrowserRouter><ScrollToTop/><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/registro" element={<RegisterPage/>}/>
    <Route path="/recuperar" element={<RecoverPage/>}/>
    <Route path="/perfil" element={<ProfilePage/>}/>
    <Route path="/deportivo" element={<SportHome/>}/>
    <Route path="/deportivo/eventos" element={<SportEvents/>}/>
    <Route path="/deportivo/eventos/:id" element={<SportEventDetail/>}/>
    <Route path="/deportivo/inscripcion/:id" element={<Inscription/>}/>
    <Route path="/deportivo/checkout" element={<Checkout/>}/>
    <Route path="/deportivo/mi-entrada" element={<MyEntry/>}/>
    <Route path="/deportivo/resultados" element={<Results/>}/>
    <Route path="/deportivo/notificaciones" element={<Notifications/>}/>
    <Route path="/deportivo/nosotros" element={<AboutSport/>}/>
    <Route path="/deportivo/entrega-kit" element={<Kit/>}/>
    <Route path="/social" element={<SocialHome/>}/>
    <Route path="/social/eventos" element={<SocialEvents/>}/>
    <Route path="/social/lugares" element={<Venues/>}/>
    <Route path="/social/nosotros" element={<AboutSocial/>}/>
    <Route path="/social/reservar" element={<Reserve/>}/>
    <Route path="/social/pqr" element={<PQR/>}/>
    <Route path="/social/admin" element={<Admin/>}/>
    <Route path="*" element={<HomePage/>}/>
  </Routes></BrowserRouter></AuthProvider></AccessibilityProvider>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
