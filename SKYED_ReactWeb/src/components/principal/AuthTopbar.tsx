import { Link } from 'react-router-dom';

export default function AuthTopbar() {
  return (
    <header className="auth-topbar">
      <Link to="/" className="auth-logo">
        <img src="/assets/principal/logoP.png" alt="SKYED" className="auth-logo-icon" />
        <span className="auth-logo-text">SKY<span className="accent">ED</span></span>
      </Link>
    </header>
  );
}
