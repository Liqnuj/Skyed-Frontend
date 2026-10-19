import { useState } from 'react';
import TermsModal from '../shared/TermsModal';

export default function PrincipalFooter() {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <footer className="footer">
      <span>© 2026 SKYED · Sogamoso, Boyacá, Colombia</span>
      <div className="footer-links">
        <button type="button" onClick={() => setTermsOpen(true)}>Términos</button>
        <button type="button" onClick={() => setTermsOpen(true)}>Privacidad</button>
        <a href="#">Soporte</a>
      </div>

      <TermsModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        variant="principal"
      />
    </footer>
  );
}
