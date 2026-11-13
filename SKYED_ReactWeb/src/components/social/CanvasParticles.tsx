import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  opacity: number;
  color: string;
};

/**
 * Partículas doradas que suben. El lienzo toma el tamaño de su contenedor
 * (también cuando el contenedor cambia de alto, p. ej. al cambiar de pestaña).
 * `cantidad`: número de partículas (40 por defecto, como antes).
 */
export default function CanvasParticles({ id, cantidad = 40 }: { id: string; cantidad?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.parentElement;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas || !hero) return;
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    // Si el contenedor crece o se encoge sin que cambie la ventana, el lienzo lo sigue.
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observador?.observe(hero);

    const particles: Particle[] = [];
    for (let i = 0; i < cantidad; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3.5 + 1,
        speedY: Math.random() * 0.5 + 0.25,
        opacity: Math.random() * 0.7 + 0.2,
        color: Math.random() > 0.5 ? '201,168,76' : '245,230,239',
      });
    }

    let frameId: number;
    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speedY;
        if (p.y < -10) p.y = canvas.height + 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
        ctx.fill();
      });
      frameId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      observador?.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [cantidad]);

  return <canvas ref={canvasRef} id={id} />;
}