import type { ReactNode } from 'react';

export default function PageHero({ title, text, image, children, variant = 'sport' }: {
  title: string; text?: string; image?: string; children?: ReactNode; variant?: 'sport' | 'social' | 'main';
}) {
  return (
    <section className={`page-hero ${variant}`} style={image ? { backgroundImage: `linear-gradient(110deg, rgba(5,18,37,.88), rgba(5,18,37,.35)), url("${image}")` } : undefined}>
      <div className="container">
        <span className="eyebrow">{variant === 'social' ? 'SKYED SOCIAL' : variant === 'sport' ? 'SKYED DEPORTIVO' : 'SKYED'}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        {children}
      </div>
    </section>
  );
}
