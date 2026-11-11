import { useEffect, useRef, useState } from 'react';
import { Bike, Flag, MapPin, Mountain, Trophy } from 'lucide-react';
import SportWrapper from '../../components/deportivo/SportWrapper';
import ContactSection from '../../components/shared/ContactSection';
import { anim, useInViewAnimations } from '../../hooks/useInViewAnimations';
import '../../styles/deportivo/deportivo.css';
import '../../styles/shared/contactSection.css';
import '../../styles/shared/nosotrosMotion.css';
import '../../styles/deportivo/about-journal.css';

type Hito = {
  year: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  note: string;
};

const HITOS: Hito[] = [
  {
    year: '2020',
    title: 'La primera idea',
    text: 'SKYED nace en Sogamoso con una meta sencilla: hacer que más personas encuentren su lugar en el ciclismo.',
    image: '/assets/deportivo/event1.jpg',
    alt: 'Ciclistas avanzan juntos por una carretera de montaña',
    note: 'Sogamoso · El punto de partida',
  },
  {
    year: '2021',
    title: 'La salida inaugural',
    text: 'El primer Gran Fondo reúne a más de 200 ciclistas y convierte una idea local en una experiencia compartida.',
    image: '/assets/deportivo/event3.jpg',
    alt: 'Pelotón de ciclistas en una pista cubierta',
    note: 'Primer Gran Fondo · 200+ ciclistas',
  },
  {
    year: '2022',
    title: 'Nuevos terrenos',
    text: 'MTB y gravel amplían el recorrido. La montaña se vuelve otra forma de encontrarnos.',
    image: '/assets/deportivo/event2.jpg',
    alt: 'Ciclista de montaña desciende por un camino de roca',
    note: 'MTB · Gravel · Boyacá',
  },
  {
    year: '2023',
    title: 'Una comunidad que crece',
    text: 'La plataforma alcanza el hito de 1.000 ciclistas y confirma que rodar en compañía cambia todo.',
    image: '/assets/deportivo/event4.jpg',
    alt: 'Grupo de ciclistas recorre una vía rural entre árboles de otoño',
    note: '1.000 ciclistas en la comunidad',
  },
  {
    year: '2026',
    title: 'La historia sigue',
    text: 'Seguimos abriendo rutas, sumando disciplinas y creando motivos para volver a encontrarnos.',
    image: '/assets/deportivo/event5.jpg',
    alt: 'Competidores de BMX saltan sobre una pista frente al público',
    note: 'Una comunidad en movimiento',
  },
];

const DISCIPLINAS = [
  {
    number: '01',
    name: 'Ruta',
    line: 'Kilómetros que se convierten en recuerdos.',
    image: '/assets/deportivo/event1.jpg',
    alt: 'Pelotón de ciclismo de ruta en un puerto de montaña',
    icon: Bike,
  },
  {
    number: '02',
    name: 'Gravel',
    line: 'El gusto de no saber exactamente qué viene.',
    image: '/assets/deportivo/event4.jpg',
    alt: 'Ciclistas recorren un camino rural sin pavimentar',
    icon: Flag,
  },
  {
    number: '03',
    name: 'Montaña',
    line: 'Técnica, tierra y una vista que lo vale todo.',
    image: '/assets/deportivo/event2.jpg',
    alt: 'Ciclista de montaña baja por una ladera rocosa',
    icon: Mountain,
  },
  {
    number: '04',
    name: 'Pista y BMX',
    line: 'Velocidad, precisión y decisiones en un instante.',
    image: '/assets/deportivo/event5.jpg',
    alt: 'Ciclistas BMX compiten sobre una pista de tierra',
    icon: Trophy,
  },
];

const DISCIPLINAS_CINTA = ['RUTA', 'GRAVEL', 'MTB', 'PISTA', 'BMX', 'BOYACÁ'] as const;

export default function AboutJournal() {
  const mainRef = useRef<HTMLElement>(null);
  const [hitoActivo, setHitoActivo] = useState(HITOS.length - 1);
  useInViewAnimations(mainRef);
  const hito = HITOS[hitoActivo];

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = 'Sobre nosotros | SKYED Deportivo';
    return () => { document.title = tituloAnterior; };
  }, []);

  return (
    <SportWrapper>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <main id="main" className="about-page about-journal" ref={mainRef}>
        <div className="nos-progress" aria-hidden="true" />

        <section className="page-header" aria-labelledby="journal-title">
          <h1 id="journal-title">Sobre nosotros</h1>
          <p>
            En SKYED somos apasionados por el ciclismo y conectamos a ciclistas de todos los niveles
            con experiencias para vivir Boyacá.
          </p>
        </section>

        <div className="journal-marquee" aria-label="Disciplinas de SKYED Deportivo">
          <div className="journal-marquee__track">
            {[0, 1].map((group) => (
              <div className="journal-marquee__group" key={group} aria-hidden={group === 1}>
                {[0, 1, 2].map((repeat) => (
                  <span className="journal-marquee__set" key={repeat}>
                    {DISCIPLINAS_CINTA.map((disciplina) => (
                      <span className="journal-marquee__item" key={disciplina}>
                        {disciplina}<i aria-hidden="true">✳</i>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="field-note" id="origen" aria-labelledby="field-note-title">
          <div className="field-note__index" {...anim('fade-up')}>
            <span>APUNTE DE CAMPO</span>
            <span>BOYACÁ / COLOMBIA</span>
          </div>
          <div className="field-note__body">
            <div className="field-note__copy" {...anim('fade-left')}>
              <p className="journal-eyebrow">Donde empieza todo / 2020</p>
              <h2 id="field-note-title">No es solo llegar.<br /><em>Es todo lo que pasa en el camino.</em></h2>
              <p>
                SKYED nació en Sogamoso para conectar ciclistas con eventos bien organizados. Desde entonces,
                trabajamos para que cada salida sea segura, emocionante y abierta a personas de todos los niveles.
              </p>
              <p>
                Creemos en la fuerza de una comunidad que se anima, se espera y celebra junta. Por eso cada ruta
                empieza mucho antes de la línea de partida.
              </p>
            </div>
            <figure className="field-note__figure" {...anim('wipe', 1)}>
              <img src="/assets/deportivo/event1.jpg" alt="Ciclistas comparten el esfuerzo en una subida de montaña" loading="lazy" />
              <figcaption><span>FIG. 01</span> Cada salida tiene su propio paisaje.</figcaption>
            </figure>
          </div>
          <div className="field-note__year" aria-hidden="true">2020</div>
        </section>

        <section className="ride-worlds" id="disciplinas" aria-labelledby="ride-worlds-title">
          <div className="ride-worlds__heading" {...anim('fade-up')}>
            <p className="journal-eyebrow">Elige tu terreno / 02</p>
            <h2 id="ride-worlds-title">Una región.<br /><em>Muchas maneras de rodar.</em></h2>
            <p>Distintos terrenos, un mismo impulso: salir y descubrir hasta dónde podemos llegar.</p>
          </div>
          <div className="ride-worlds__grid">
            {DISCIPLINAS.map(({ number, name, line, image, alt, icon: Icon }, index) => (
              <article className={`ride-card ride-card--${index + 1}`} key={name} {...anim('zoom-in', index)}>
                <img src={image} alt={alt} loading="lazy" />
                <div className="ride-card__veil" aria-hidden="true" />
                <div className="ride-card__number">{number}<span> / 04</span></div>
                <div className="ride-card__content">
                  <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <h3>{name}</h3>
                  <p>{line}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="field-manifesto" id="esencia" aria-labelledby="manifesto-title">
          <div className="field-manifesto__heading" {...anim('fade-up')}>
            <p className="journal-eyebrow">Lo que nos mueve / 03</p>
            <h2 id="manifesto-title">El ciclismo<br />se construye <em>en plural.</em></h2>
          </div>
          <div className="field-manifesto__columns">
            <article {...anim('fade-left')}>
              <span>01 / MISIÓN</span>
              <p>Diseñar eventos ciclistas de calidad, seguros e innovadores, que conecten a participantes, aliados y espectadores.</p>
            </article>
            <article {...anim('fade-right', 1)}>
              <span>02 / VISIÓN</span>
              <p>Ser un referente en la organización del ciclismo y contribuir a una comunidad más activa, cercana y abierta.</p>
            </article>
          </div>
          <Bike className="field-manifesto__mark" size={116} strokeWidth={0.8} aria-hidden="true" />
        </section>

        <section className="ride-log" id="recorrido" aria-labelledby="ride-log-title">
          <div className="ride-log__heading" {...anim('fade-up')}>
            <p className="journal-eyebrow">Kilómetro a kilómetro / 04</p>
            <h2 id="ride-log-title">Una historia que<br /><em>sigue en marcha.</em></h2>
            <p>Cada año suma una nueva página. Elige una fecha para volver a recorrerla.</p>
          </div>
          <div className="ride-log__years" role="group" aria-label="Hitos de la historia de SKYED">
            {HITOS.map((item, index) => (
              <button
                type="button"
                key={item.year}
                aria-pressed={hitoActivo === index}
                className={hitoActivo === index ? 'is-active' : ''}
                onClick={() => setHitoActivo(index)}
              >
                <span>{item.year}</span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
          <article className="ride-log__story" aria-live="polite" aria-atomic="true">
            <figure className="ride-log__image">
              <img key={hito.year} src={hito.image} alt={hito.alt} loading="lazy" />
              <figcaption>{hito.note}</figcaption>
            </figure>
            <div className="ride-log__text">
              <span className="ride-log__year">{hito.year}</span>
              <h3>{hito.title}</h3>
              <p>{hito.text}</p>
              <span className="ride-log__location"><MapPin size={15} aria-hidden="true" /> Sogamoso, Boyacá</span>
            </div>
          </article>
        </section>

        <ContactSection variant="deportivo" />

        <section className="skyed-map-wrap" aria-labelledby="about-map-title">
          <div className="top-bar" {...anim('fade-up')}>
            <div className="top-left">
              <div className="eyebrow">Nuestra ubicación</div>
              <h2 id="about-map-title">Encuéntranos en Sogamoso</h2>
              <p>Boyacá, Colombia · Sede principal SKYED</p>
            </div>
            <div className="badge-online">
              <div className="dot" aria-hidden="true" /> Encuéntranos aquí
            </div>
          </div>

          <div className="map-shell" {...anim('zoom-in', 1)}>
            <iframe
              className="map-frame"
              title="Ubicación SKYED en Sogamoso"
              src="https://maps.google.com/maps?q=Sogamoso,Boyaca,Colombia&output=embed&z=14"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="info-row">
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-building" aria-hidden="true" /></div>
                <div>
                  <div className="info-label">Dirección</div>
                  <div className="info-val">Sogamoso, Boyacá</div>
                </div>
              </div>
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-clock" aria-hidden="true" /></div>
                <div>
                  <div className="info-label">Horario</div>
                  <div className="info-val">Lun – Vie · 8 am – 6 pm</div>
                </div>
              </div>
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-phone" aria-hidden="true" /></div>
                <div>
                  <div className="info-label">Teléfono</div>
                  <div className="info-val">+57 313 201 3573</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SportWrapper>
  );
}