'use client';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- Audio synth (mismo patrón liviano usado en el resto de zonas nuevas) ----
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.3, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

const BG = '/assets/redesign/nave/fondo.webp';
const PROPS_BASE = '/assets/redesign/nave/props';

// Sandbox de juego libre: objetos espaciales libremente arrastrables por la
// cabina, reaccionan (rebote + sonido + partícula) al tocarlos sin arrastrar.
type Objeto = { id: string; nombre: string; archivo: string; w: number; x: number; y: number; sonido: number[]; emoji: string };

// Posiciones iniciales dispersas por el piso de la cabina, alrededor del panel
// de mando central (provisorio, a ajustar mirando el fondo real en dispositivo)
const OBJETOS: Objeto[] = [
  { id: 'cohete', nombre: 'Cohete', archivo: 'cohete.png', w: 8, x: 14, y: 84, sonido: [523, 659, 784], emoji: '🚀' },
  { id: 'estrella', nombre: 'Estrella', archivo: 'estrella.png', w: 8, x: 48, y: 92, sonido: [880, 988, 1046], emoji: '⭐' },
  { id: 'alien', nombre: 'Alien', archivo: 'alien.png', w: 7, x: 84, y: 86, sonido: [440, 523, 392], emoji: '👽' },
  { id: 'tablet', nombre: 'Tablet', archivo: 'tablet.png', w: 8, x: 28, y: 93, sonido: [659, 784, 880], emoji: '🌌' },
  { id: 'casco', nombre: 'Casco', archivo: 'casco.png', w: 8, x: 68, y: 90, sonido: [349, 440], emoji: '🪐' },
  { id: 'luna', nombre: 'Luna', archivo: 'luna.png', w: 7, x: 7, y: 68, sonido: [587, 698], emoji: '🌙' },
  { id: 'rompecabezas1', nombre: 'Rompecabezas', archivo: 'rompecabezas1.png', w: 6, x: 92, y: 72, sonido: [523, 587, 659], emoji: '🧩' },
  { id: 'rompecabezas2', nombre: 'Rompecabezas', archivo: 'rompecabezas2.png', w: 6, x: 58, y: 96, sonido: [587, 659, 698], emoji: '🧩' },
  { id: 'telescopio', nombre: 'Telescopio', archivo: 'telescopio.png', w: 9, x: 38, y: 82, sonido: [392, 523, 659], emoji: '🔭' },
];

type Pos = { x: number; y: number };
type Arrastrando = { id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };
type Burst = { id: number; x: number; y: number; emoji: string };

export default function NavePage() {
  const router = useRouter();

  const [pos, setPos] = useState<Record<string, Pos>>(
    Object.fromEntries(OBJETOS.map(o => [o.id, { x: o.x, y: o.y }]))
  );
  const [zOrder, setZOrder] = useState<string[]>(OBJETOS.map(o => o.id));
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

  const onObjetoPointerDown = (o: Objeto) => (e: React.PointerEvent) => {
    e.stopPropagation();
    traerAlFrente(o.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cur = pos[o.id];
    arrastre.current = {
      id: o.id, startClientX: e.clientX, startClientY: e.clientY,
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
    setPos(prev => ({ ...prev, [a.id]: { x: Math.max(3, Math.min(97, xPct)), y: Math.max(8, Math.min(97, yPct)) } }));
  };

  const onContainerPointerUp = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    if (!a.movido) {
      const o = OBJETOS.find(x => x.id === a.id)!;
      setBounceId(o.id);
      setTimeout(() => setBounceId(null), 260);
      melody(o.sonido, 90, 0.22, 0.16);
      vib(15);
      lanzarBurst(pos[o.id].x, pos[o.id].y - o.w * 0.5, o.emoji);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#1a1030', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0/aldea')}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 50, width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,10,40,.75)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 10, left: 58, zIndex: 50, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        🚀 La Nave de Planeta Tiqui
      </div>

      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          <Image src={BG} alt="La Nave de Planeta Tiqui" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />

          {zOrder.map((id, i) => {
            const o = OBJETOS.find(x => x.id === id)!;
            const cur = pos[id];
            return (
              <img key={o.id} src={`${PROPS_BASE}/${o.archivo}`} alt={o.nombre} draggable={false}
                onPointerDown={onObjetoPointerDown(o)}
                style={{
                  position: 'absolute', left: `${cur.x}%`, top: `${cur.y}%`, width: `${o.w}%`,
                  transform: `translate(-50%,-50%) scale(${bounceId === o.id ? 1.15 : 1})`,
                  transition: arrastre.current?.id === o.id ? 'none' : 'transform .2s cubic-bezier(.34,1.56,.64,1), left .18s ease-out, top .18s ease-out',
                  cursor: 'grab', zIndex: 20 + i, touchAction: 'none',
                  filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.4))',
                }} />
            );
          })}

          {bursts.map(b => (
            <div key={b.id} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
              animation: 'burstFloatNave .9s ease-out forwards', zIndex: 60, pointerEvents: 'none',
            }}>{b.emoji}</div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes burstFloatNave { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
      `}</style>
    </div>
  );
}
