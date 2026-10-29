import { enlaceCorreo, enlaceWhatsApp } from '../../utils/contacto';

type Variant = 'social' | 'deportivo';

/** Misma información que se muestra en el footer de cada sitio. */
const CONTACT: Record<Variant, {
  email: string;
  phone: string;
  whatsapp: string;
  place: string;
  hours: string;
  title: string;
  intro: string;
  socials: { label: string; short: string; href: string }[];
}> = {
  social: {
    email: 'skyedsocial@gmail.com',
    phone: '+57 317 703 7517',
    whatsapp: '573177037517',
    place: 'Sogamoso, Boyacá',
    hours: 'Lun – Vie · 8 am – 6 pm',
    title: 'Hablemos de tu próximo evento',
    intro:
      'Cuéntanos qué quieres celebrar. Te respondemos rápido y te ayudamos a convertir tu idea en una experiencia inolvidable.',
    socials: [
      { label: 'Facebook', short: 'F', href: 'https://www.facebook.com/?locale=es_LA' },
      { label: 'Instagram', short: 'IG', href: 'https://www.instagram.com/?hl=es' },
      { label: 'X / Twitter', short: 'X', href: 'https://twitter.com/?lang=es' },
      { label: 'WhatsApp', short: 'WA', href: 'https://api.whatsapp.com/send?phone=573177037517' },
    ],
  },
  deportivo: {
    email: 'skyeddeportivo@gmail.com',
    phone: '+57 313 201 3573',
    whatsapp: '573132013573',
    place: 'Sogamoso, Boyacá',
    hours: 'Lun – Vie · 8 am – 6 pm',
    title: 'Hablemos de tu próxima pedalada',
    intro:
      '¿Dudas con una inscripción, un evento o quieres ser aliado? Escríbenos y nuestro equipo te acompaña en cada paso del camino.',
    socials: [
      { label: 'Facebook', short: 'F', href: 'https://www.facebook.com/?locale=es_LA' },
      { label: 'Instagram', short: 'IG', href: 'https://www.instagram.com/?hl=es' },
      { label: 'X / Twitter', short: 'X', href: 'https://twitter.com/?lang=es' },
    ],
  },
};

export default function ContactSection({ variant }: { variant: Variant }) {
  const c = CONTACT[variant];
  const items = [
    // Gmail y WhatsApp en el navegador: mailto:/tel: no hacen nada en un
    // computador sin programa de correo o de llamadas (ver utils/contacto.ts).
    { icon: 'ti-mail', label: 'Email', value: c.email, href: enlaceCorreo(c.email), title: 'Escribir por Gmail' },
    { icon: 'ti-phone', label: 'Teléfono', value: c.phone, href: enlaceWhatsApp(c.whatsapp), title: 'Escribir por WhatsApp' },
    { icon: 'ti-map-pin', label: 'Ubicación', value: c.place },
    { icon: 'ti-clock', label: 'Horario', value: c.hours },
  ];

  return (
    <section className={`ctu ctu--${variant}`} id="contactanos" aria-labelledby="ctu-title">
      <div className="ctu-inner">
        <div className="ctu-head">
          <span className="ctu-label">Contáctanos</span>
          <h2 id="ctu-title" className="ctu-title">{c.title}</h2>
        </div>

        <div className="ctu-card">
          <span className="ctu-orb ctu-orb--a" aria-hidden="true" />
          <span className="ctu-orb ctu-orb--b" aria-hidden="true" />

          <div className="ctu-left">
            <div className="ctu-brand">
              <img
                src={variant === 'social' ? '/assets/social/logo_social.png' : '/assets/deportivo/logo_deportivo.png'}
                alt=""
              />
              <span>SKY<em>ED</em></span>
            </div>
            <p className="ctu-intro">{c.intro}</p>

            <div className="ctu-socials">
              <span>Síguenos</span>
              {c.socials.map((s) => (
                <a title={s.label} key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  {s.short}
                </a>
              ))}
            </div>
          </div>

          <ul className="ctu-list">
            {items.map((it) => {
              const inner = (
                <>
                  <span className="ctu-ico"><i className={`ti ${it.icon}`} aria-hidden="true" /></span>
                  <span className="ctu-txt"><strong>{it.label}</strong>{it.value}</span>
                </>
              );
              return (
                <li key={it.label}>
                  {it.href
                    ? <a className="ctu-row ctu-row--link" href={it.href} target="_blank" rel="noopener noreferrer" title={it.title}>{inner}</a>
                    : <div className="ctu-row">{inner}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
