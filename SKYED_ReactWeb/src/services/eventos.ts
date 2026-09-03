export async function crearEvento(evento: {
  nombre: string;
  fecha: string;
  categoria: string;
}) {
  const res = await fetch('http://localhost/skyed-backend/api/eventos.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  });
  return res.json();
}