import type { ReactNode } from 'react';
import SocialWrapper from '../social/SocialWrapper';
import SportWrapper from '../deportivo/SportWrapper';
import type { ModuloAyuda } from '../../services/ayudaService';
import { ModuloAyudaContext } from './ayudaContext';
import '../../styles/shared/nosotrosMotion.css';
import '../../styles/shared/ayuda.css';

/** Envuelve la ayuda en el layout (nav, footer, accesibilidad) del módulo. */
export default function AyudaLayout({ modulo, children }: { modulo: ModuloAyuda; children: ReactNode }) {
  const Wrapper = modulo === 'social' ? SocialWrapper : SportWrapper;

  return (
    <Wrapper>
      <ModuloAyudaContext.Provider value={modulo}>
        <div className={`ayuda ay-${modulo}`} role="main">
          {modulo === 'deportivo' && <div className="nos-progress" aria-hidden="true" />}
          {children}
        </div>
      </ModuloAyudaContext.Provider>
    </Wrapper>
  );
}
