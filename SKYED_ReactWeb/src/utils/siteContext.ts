const KEY = 'skyed_ultimo_contexto';

export type SiteContext = 'deportivo' | 'social';

export function setSiteContext(contexto: SiteContext) {
  localStorage.setItem(KEY, contexto);
}

export function getSiteContext(): SiteContext {
  const valor = localStorage.getItem(KEY);
  return valor === 'social' ? 'social' : 'deportivo'; // 'deportivo' es el valor por defecto
}