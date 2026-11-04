import type { ReactNode } from 'react';
import SocialWrapper from '../social/SocialWrapper';
import SportWrapper from '../deportivo/SportWrapper';
import PrincipalWrapper from '../principal/PrincipalWrapper';
import PrincipalNav from '../principal/PrincipalNav';
import PrincipalFooter from '../principal/PrincipalFooter';
import type { EspacioAyuda } from '../../services/ayudaService';
import { ModuloAyudaContext } from './ayudaContext';
import '../../styles/shared/nosotrosMotion.css';
import '../../styles/shared/ayuda.css';
import '../../styles/principal/ayudaPrincipal.css';

/** Envuelve la ayuda en el layout (nav, footer, accesibilidad) de la página principal o de cada módulo. */
export default function AyudaLayout({ modulo, children }: { modulo: EspacioAyuda; children: ReactNode }) {
  const contenido = (
    <ModuloAyudaContext.Provider value={modulo}>
      <div className={`ayuda ay-${modulo}`} role="main">
        {modulo === 'deportivo' && <div className="nos-progress" aria-hidden="true" />}
        {children}
      </div>
    </ModuloAyudaContext.Provider>
  );

  // La página principal no trae nav ni footer en su wrapper: se agregan aquí (igual que en HomePage).
  if (modulo === 'principal') {
    return (
      <PrincipalWrapper>
        <PrincipalNav />
        {contenido}
        <PrincipalFooter />
      </PrincipalWrapper>
    );
  }

  const Wrapper = modulo === 'social' ? SocialWrapper : SportWrapper;

  return <Wrapper>{contenido}</Wrapper>;
}
