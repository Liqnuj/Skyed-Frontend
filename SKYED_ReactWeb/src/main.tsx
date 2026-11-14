import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PermisosProvider } from './context/PermisosContext';
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
import AboutSport from './pages/deportivo/AboutJournal';
import Kit from './pages/deportivo/Kit';
import Checkout from './pages/deportivo/Checkout';
import SocialHome from './pages/social/SocialHome';
import SocialEvents from './pages/social/SocialEvents';
import Venues from './pages/social/Venues';
import AboutSocial from './pages/social/nosotros';
import Reserve from './pages/social/Reserve';
import PQR from './pages/social/PQR';
import Perfil from './pages/social/Perfil';
import SocialNotifications from './pages/social/SocialNotifications';
import Admin from './pages/social/Admin';
import AdminDeportivo from './pages/deportivo/Admin';
import AdminRedirect from './components/AdminRedirect';
import { instalarFiltroDeCaracteres } from './utils/seguridadTexto';
import './styles/global.css';
import './styles/principal/principal.css';
import './styles/social/social.css';
import './styles/deportivo/deportivo.css';
import Participant from './pages/deportivo/Participant';
import UsersRoles from './pages/admin/UsersRoles';
import AyudaAdmin from './pages/admin/AyudaAdmin';
import SkaiWidget from './components/shared/SkaiWidget';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import SoloUsuarios from './components/SoloUsuarios';
import AyudaPrincipalInicioPage from './pages/ayuda/AyudaPrincipalInicioPage';
import AyudaInicioPage from './pages/ayuda/AyudaInicioPage';
import AyudaCategoriaPage from './pages/ayuda/AyudaCategoriaPage';
import AyudaArticuloPage from './pages/ayuda/AyudaArticuloPage';
import PqrDeportivo from './pages/deportivo/Pqr';
import { EntradaModuloProvider } from './components/principal/EntradaModulo';
import CargaGlobal from './components/shared/CargaGlobal';


function App(){
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <PermisosProvider>
        <BrowserRouter>
          <ScrollToTop/>
          {/* Animación al entrar a Social o Deportivo desde la principal */}
          <EntradaModuloProvider>
          <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/registro" element={<RegisterPage/>}/>
            <Route path="/recuperar" element={<RecoverPage/>}/>
            <Route path="/perfil" element={<ProfilePage/>}/>
            
            <Route path="/deportivo" element={<SportHome/>}/>
            <Route path="/deportivo/eventos" element={<SportEvents/>}/>
            <Route path="/deportivo/eventos/:id" element={<SportEventDetail/>}/>
            <Route path="/deportivo/resultados" element={<Results/>}/>
            <Route path="/deportivo/nosotros" element={<AboutSport/>}/>
            <Route path="/deportivo/entrega-kit" element={<Kit/>}/>
            {/* Páginas de participante: un admin puede ver el sitio, pero no las usa. */}
            <Route element={<SoloUsuarios modulo="deportivo" />}>
              <Route path="/deportivo/inscripcion/:id" element={<Inscription/>}/>
              <Route path="/deportivo/checkout" element={<Checkout/>}/>
              <Route path="/deportivo/mi-entrada" element={<MyEntry/>}/>
              <Route path="/deportivo/notificaciones" element={<Notifications/>}/>
              <Route path="/deportivo/pqr" element={<PqrDeportivo/>}/>
              <Route path="/deportivo/perfil" element={<Participant/>}/>
            </Route>
            
            <Route path="/social" element={<SocialHome/>}/>
            <Route path="/social/eventos" element={<SocialEvents/>}/>
            <Route path="/social/lugares" element={<Venues/>}/>
            <Route path="/social/nosotros" element={<AboutSocial/>}/>
            {/* Páginas de cliente: un admin puede ver el sitio, pero no reserva ni radica PQR. */}
            <Route element={<SoloUsuarios modulo="social" />}>
              <Route path="/social/reservar" element={<Reserve/>}/>
              <Route path="/social/pqr" element={<PQR/>}/>
              <Route path="/social/perfil" element={<Perfil/>}/>
              <Route path="/social/notificaciones" element={<SocialNotifications/>}/>
            </Route>

            {/* Cada panel exige su propio rol de administrador. */}
            <Route path="/admin" element={<AdminRedirect/>}/>
            <Route element={<AdminProtectedRoute rol="adminSocial" modulo="social" />}>
              <Route path="/social/admin" element={<Admin/>}/>
            </Route>
            <Route element={<AdminProtectedRoute rol="adminDeportivo" modulo="deportivo" />}>
              <Route path="/deportivo/admin" element={<AdminDeportivo/>}/>
            </Route>
            <Route element={<AdminProtectedRoute />}>
              <Route path="/admin/usuarios" element={<UsersRoles/>}/>
              <Route path="/admin/ayuda" element={<AyudaAdmin/>}/>
            </Route>


                        {/* Centro de Ayuda: público (visitantes, usuarios y administradores) */}
            {/* Centro de Ayuda de la página principal: reúne la ayuda de Deportivo, Social y la general */}
            <Route path="/ayuda" element={<AyudaPrincipalInicioPage/>}/>
            <Route path="/ayuda/categoria/:slug" element={<AyudaCategoriaPage modulo="principal"/>}/>
            <Route path="/ayuda/articulo/:slug" element={<AyudaArticuloPage modulo="principal"/>}/>
            <Route path="/ayuda/*" element={<Navigate to="/ayuda" replace/>}/>
            <Route path="/social/ayuda" element={<AyudaInicioPage modulo="social"/>}/>
            <Route path="/social/ayuda/categoria/:slug" element={<AyudaCategoriaPage modulo="social"/>}/>
            <Route path="/social/ayuda/articulo/:slug" element={<AyudaArticuloPage modulo="social"/>}/>
            <Route path="/deportivo/ayuda" element={<AyudaInicioPage modulo="deportivo"/>}/>
            <Route path="/deportivo/ayuda/categoria/:slug" element={<AyudaCategoriaPage modulo="deportivo"/>}/>
            <Route path="/deportivo/ayuda/articulo/:slug" element={<AyudaArticuloPage modulo="deportivo"/>}/>

            

            <Route path="*" element={<HomePage/>}/>
          </Routes>
          </EntradaModuloProvider>
          <SkaiWidget/>
          {/* Ventana "Guardando…" mientras se crea, guarda o elimina algo (evita clics repetidos) */}
          <CargaGlobal/>
        </BrowserRouter>
        </PermisosProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

// Ningún formulario acepta caracteres de inyección (SQL, XSS, comandos): ver utils/seguridadTexto.ts
instalarFiltroDeCaracteres();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);