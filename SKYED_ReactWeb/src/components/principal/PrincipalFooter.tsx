import { useState } from 'react';
import TermsModal from '../shared/TermsModal';
import { Link } from 'react-router-dom';

export default function PrincipalFooter() {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <footer className="footer">
      <span>© 2026 SKYED · Sogamoso, Boyacá, Colombia</span>
      <div className="footer-links">
        <button type="button" title="Leer los términos y condiciones" onClick={() => setTermsOpen(true)}>Términos</button>
        <button type="button" title="Leer la política de privacidad" onClick={() => setTermsOpen(true)}>Privacidad</button>
        <Link to="/ayuda">Centro de ayuda</Link>
      </div>

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        variant="principal"
      />
    </footer>
  );
}
