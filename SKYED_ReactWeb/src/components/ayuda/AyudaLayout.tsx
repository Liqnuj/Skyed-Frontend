import type { ReactNode } from 'react';
import SocialWrapper from '../social/SocialWrapper';
import SportWrapper from '../deportivo/SportWrapper';
import type { ModuloAyuda } from '../../services/ayudaService';
import '../../styles/shared/ayuda.css';

/** Envuelve la ayuda en el layout (nav, footer, accesibilidad) del módulo. */
export default function AyudaLayout({ modulo, children }: { modulo: ModuloAyuda; children: ReactNode }) {
  const Wrapper = modulo === 'social' ? SocialWrapper : SportWrapper;

  return (
    <Wrapper>
      <div className={`ayuda ay-${modulo}`} role="main">
        {children}
      </div>
    </Wrapper>
  );
}