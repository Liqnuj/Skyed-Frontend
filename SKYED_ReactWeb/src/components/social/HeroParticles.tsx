const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: Math.random() * 100, // % horizontal
  size: 3 + Math.random() * 6, // px
  duration: 3 + Math.random() * 4, // s — más rápido: estos heros son más bajos que el de Inicio
  delay: Math.random() * 2, // s — antes tardaban hasta 8-9s en aparecer
}));

// Burbujas flotantes que suben de abajo hacia arriba dentro de cualquier
// hero de Social (mismo efecto que en el hero de Inicio, .hero-particles /
// .particle ya definidos en social.css con la animación float-particle-social).
export default function HeroParticles() {
  return (
    <div className="hero-particles">
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(255,255,255,0.8)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}