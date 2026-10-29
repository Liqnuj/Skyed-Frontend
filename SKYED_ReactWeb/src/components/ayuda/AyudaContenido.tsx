import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Bloque =
  | { tipo: 'p'; lineas: string[] }
  | { tipo: 'ul'; lineas: string[] }
  | { tipo: 'ol'; lineas: string[]; inicio: number };

const TOKENS = /(\*\*[^*]+\*\*|\[\[[^\]|]+\|[^\]\s]+\]\])/;
const ENLACE = /^\[\[([^\]|]+)\|([^\]\s]+)\]\]$/;

function enLinea(texto: string, clave: string): ReactNode[] {
  return texto
    .split(TOKENS)
    .filter(Boolean)
    .map((parte, i) => {
      const key = `${clave}-${i}`;

      if (parte.length > 4 && parte.startsWith('**') && parte.endsWith('**')) {
        return <strong key={key}>{parte.slice(2, -2)}</strong>;
      }

      const enlace = ENLACE.exec(parte);
      if (enlace) {
        const [, etiqueta, destino] = enlace;
        // Solo rutas internas de la app; cualquier otra cosa se muestra como texto.
        if (destino.startsWith('/') && !destino.startsWith('//')) {
          return (
            <Link key={key} className="ay-enlace" to={destino}>
              {etiqueta}
            </Link>
          );
        }
        return etiqueta;
      }

      return parte;
    });
}

function armarBloques(md: string): Bloque[] {
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;

  for (const cruda of md.replace(/\r/g, '').split('\n')) {
    const linea = cruda.trim();

    if (!linea) {
      actual = null;
      continue;
    }

    const numerada = /^(\d+)\.\s+(.*)$/.exec(linea);
    const viñeta = /^[-*]\s+(.*)$/.exec(linea);

    if (numerada) {
      if (actual?.tipo === 'ol') {
        actual.lineas.push(numerada[2]);
      } else {
        actual = { tipo: 'ol', lineas: [numerada[2]], inicio: Number(numerada[1]) };
        bloques.push(actual);
      }
    } else if (viñeta) {
      if (actual?.tipo === 'ul') {
        actual.lineas.push(viñeta[1]);
      } else {
        actual = { tipo: 'ul', lineas: [viñeta[1]] };
        bloques.push(actual);
      }
    } else if (actual?.tipo === 'p') {
      actual.lineas.push(linea);
    } else {
      actual = { tipo: 'p', lineas: [linea] };
      bloques.push(actual);
    }
  }

  return bloques;
}

export default function AyudaContenido({ texto }: { texto: string }) {
  const bloques = armarBloques(texto);

  return (
    <div className="ay-prose">
      {bloques.map((b, i) => {
        if (b.tipo === 'ol') {
          return (
            <ol key={i} style={{ counterReset: `paso ${b.inicio - 1}` }}>
              {b.lineas.map((l, j) => (
                <li key={j}>{enLinea(l, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (b.tipo === 'ul') {
          return (
            <ul key={i}>
              {b.lineas.map((l, j) => (
                <li key={j}>{enLinea(l, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{enLinea(b.lineas.join(' '), `${i}`)}</p>;
      })}
    </div>
  );
}