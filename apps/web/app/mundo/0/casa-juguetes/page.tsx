'use client';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- Audio synth (mismo patrón liviano usado en Aldea/Guardería) ----
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.3, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

const BG = '/assets/redesign/casa-juguetes/fondo.webp';
const PROPS_BASE = '/assets/redesign/casa-juguetes/props';

// "Juguetes vivos": cada juguete es libremente arrastrable por el cuarto y
// reacciona (rebote + sonido + partícula) al tocarlo sin arrastrar, como si
// despertara un segundo. Sin puzzle de colocación — es un sandbox de juego libre.
type Juguete = { id: string; nombre: string; archivo: string; w: number; x: number; y: number; sonido: number[]; emoji: string };

// Posiciones iniciales dispersas por el piso/alfombra (provisorio, a ajustar mirando el fondo real)
const JUGUETES: Juguete[] = [
  { id: 'oso', nombre: 'Oso de peluche', archivo: 'oso_peluche.png', w: 13, x: 45, y: 66, sonido: [392, 440, 523], emoji: '🧸' },
  { id: 'perrito', nombre: 'Perrito de peluche', archivo: 'peluche_perrito.png', w: 11, x: 61, y: 74, sonido: [440, 523, 587], emoji: '🐶' },
  { id: 'auto', nombre: 'Auto', archivo: 'auto.png', w: 9, x: 25, y: 80, sonido: [523, 440, 349], emoji: '🚗' },
  { id: 'bloques_pila', nombre: 'Bloques', archivo: 'bloques_pila.png', w: 10, x: 34, y: 58, sonido: [523, 587, 659], emoji: '🧱' },
  { id: 'bloques_estructura', nombre: 'Bloques', archivo: 'bloques_estructura.png', w: 9, x: 50, y: 56, sonido: [587, 659, 698], emoji: '🧱' },
  { id: 'olla', nombre: 'Olla', archivo: 'olla.png', w: 7, x: 58, y: 63, sonido: [349, 392], emoji: '🍲' },
  { id: 'libros', nombre: 'Libros', archivo: 'libros.png', w: 7, x: 20, y: 66, sonido: [659, 784, 880], emoji: '📚' },
  { id: 'cuchara', nombre: 'Cuchara', archivo: 'cuchara.png', w: 6, x: 42, y: 83, sonido: [880, 988], emoji: '🥄' },
  { id: 'bloques_arco', nombre: 'Bloques', archivo: 'bloques_arco.png', w: 6, x: 30, y: 73, sonido: [523, 659], emoji: '🧱' },
  { id: 'bloques_torre', nombre: 'Bloques', archivo: 'bloques_torre.png', w: 5, x: 66, y: 58, sonido: [698, 784], emoji: '🧱' },
  { id: 'pelota', nombre: 'Pelota', archivo: 'pelota.png', w: 6, x: 52, y: 79, sonido: [392, 523, 659], emoji: '⚽' },
];

type Pos = { x: number; y: number };
type Arrastrando = { id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };
type Burst = { id: number; x: number; y: number; emoji: string };

export default function CasaJuguetesPage() {
  const router = useRouter();

  const [pos, setPos] = useState<Record<string, Pos>>(
    Object.fromEntries(JUGUETES.map(j => [j.id, { x: j.x, y: j.y }]))
  );
  const [zOrder, setZOrder] = useState<string[]>(JUGUETES.map(j => j.id));
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const burstIdRef = useRef(0);
  const arrastre = useRef<Arrastrando | null>(null);

  const lanzarBurst = useCallback((xPct: number, yPct: number, emoji: string) => {
    const id = burstIdRef.current++;
    setBursts(prev => [...prev, { id, x: xPct, y: yPct, emoji }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
  }, []);

  const traerAlFrente = (id: string) => {
    setZOrder(prev => [...prev.filter(x => x !== id), id]);
  };

  const onJuguetePointerDown = (j: Juguete) => (e: React.PointerEvent) => {
    e.stopPropagation();
    traerAlFrente(j.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cur = pos[j.id];
    arrastre.current = {
      id: j.id, startClientX: e.clientX, startClientY: e.clientY,
      offsetX: cur.x - ((e.clientX - rect.left) / rect.width) * 100,
      offsetY: cur.y - ((e.clientY - rect.top) / rect.height) * 100,
      movido: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onContainerPointerMove = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dist = Math.hypot(e.clientX - a.startClientX, e.clientY - a.startClientY);
    if (dist > 6) a.movido = true;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100 + a.offsetX;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100 + a.offsetY;
    setPos(prev => ({ ...prev, [a.id]: { x: Math.max(3, Math.min(97, xPct)), y: Math.max(8, Math.min(96, yPct)) } }));
  };

  const onContainerPointerUp = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    if (!a.movido) {
      const j = JUGUETES.find(x => x.id === a.id)!;
      setBounceId(j.id);
      setTimeout(() => setBounceId(null), 260);
      melody(j.sonido, 90, 0.22, 0.16);
      vib(15);
      lanzarBurst(pos[j.id].x, pos[j.id].y - j.w * 0.5, j.emoji);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#2a1f1a', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0/aldea')}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 50, width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,10,40,.75)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 10, left: 58, zIndex: 50, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        🧸 La Casa de los Juguetes Vivos
      </div>

      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          <Image src={BG} alt="La Casa de los Juguetes Vivos" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />

          {zOrder.map((id, i) => {
            const j = JUGUETES.find(x => x.id === id)!;
            const cur = pos[id];
            return (
              <img key={j.id} src={`${PROPS_BASE}/${j.archivo}`} alt={j.nombre} draggable={false}
                onPointerDown={onJuguetePointerDown(j)}
                style={{
                  position: 'absolute', left: `${cur.x}%`, top: `${cur.y}%`, width: `${j.w}%`,
                  transform: `translate(-50%,-50%) scale(${bounceId === j.id ? 1.15 : 1})`,
                  transition: arrastre.current?.id === j.id ? 'none' : 'transform .2s cubic-bezier(.34,1.56,.64,1), left .18s ease-out, top .18s ease-out',
                  cursor: 'grab', zIndex: 20 + i, touchAction: 'none',
                  filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.4))',
                }} />
            );
          })}

          {bursts.map(b => (
            <div key={b.id} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
              animation: 'burstFloatCasa .9s ease-out forwards', zIndex: 60, pointerEvents: 'none',
            }}>{b.emoji}</div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes burstFloatCasa { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
      `}</style>
    </div>
  );
}
