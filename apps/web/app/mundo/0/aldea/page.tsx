'use client';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- Audio synth (mismo patrón liviano usado en Guardería, sin assets de sonido) ----
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.3, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

// ---- Rutas de assets ----
// Fondo específico de esta zona:
const BG = '/assets/redesign/aldea/fondo.webp';
// Elenco 3D claymation, compartido por las 5 zonas nuevas del rediseño:
const CHAR_BASE = '/assets/redesign/personajes';



type Personaje = {
  id: string; nombre: string; archivo: string; tipo: 'biped' | 'cuadrupedo';
  w: number; x: number; y: number; sonido: number[];
};

// Posiciones iniciales dispersas por la plaza central de piedra (ajustadas mirando
// el fondo real: la plaza vacía queda aprox entre 40-70% x / 45-62% y)
const PERSONAJES: Personaje[] = [
  { id: 'toqwow', nombre: 'Toqwow', archivo: 'char_toqwow.png', tipo: 'biped', w: 12, x: 55, y: 54, sonido: [523, 659, 784] },
  { id: 'tizi', nombre: 'Tizi', archivo: 'char_tizi.png', tipo: 'biped', w: 10, x: 42, y: 50, sonido: [659, 784, 988] },
  { id: 'zoe', nombre: 'Zoe', archivo: 'char_zoe.png', tipo: 'biped', w: 10, x: 62, y: 48, sonido: [587, 698, 880] },
  { id: 'coti', nombre: 'Coti', archivo: 'char_coti.png', tipo: 'biped', w: 10, x: 48, y: 58, sonido: [698, 880, 1046] },
  { id: 'puli', nombre: 'Puli', archivo: 'char_puli.png', tipo: 'biped', w: 10, x: 58, y: 60, sonido: [784, 988, 1174] },
  { id: 'tito', nombre: 'Tito', archivo: 'char_tito.png', tipo: 'biped', w: 10, x: 38, y: 60, sonido: [523, 698, 880] },
  { id: 'luta', nombre: 'Luta', archivo: 'char_luta.png', tipo: 'biped', w: 10, x: 68, y: 56, sonido: [440, 587, 740] },
  { id: 'michi', nombre: 'Michi', archivo: 'char_michi.png', tipo: 'cuadrupedo', w: 7, x: 45, y: 64, sonido: [880, 988] },
  { id: 'vago', nombre: 'Vago', archivo: 'char_vago.png', tipo: 'cuadrupedo', w: 8, x: 63, y: 65, sonido: [349, 440] },
  { id: 'copo', nombre: 'Copo de Nieve', archivo: 'char_copo.png', tipo: 'cuadrupedo', w: 7, x: 53, y: 66, sonido: [659, 784] },
];

type Portal = { id: string; nombre: string; emoji: string; ruta: string; x: number; y: number; w: number };

// Posiciones de los 5 portales, ubicadas sobre cada estructura real del fondo
const PORTALES: Portal[] = [
  { id: 'guarderia', nombre: 'Guardería Mágica', emoji: '🍼', ruta: '/mundo/0/guarderia', x: 20, y: 20, w: 10 },
  { id: 'casa-juguetes', nombre: 'Casa de los Juguetes Vivos', emoji: '🧸', ruta: '/mundo/0/casa-juguetes', x: 18, y: 76, w: 10 },
  { id: 'taller', nombre: 'Taller de Vestuario', emoji: '👗', ruta: '/mundo/0/taller', x: 77, y: 45, w: 10 },
  { id: 'parque', nombre: 'Parque de los Descubrimientos', emoji: '🌷', ruta: '/mundo/0/parque', x: 88, y: 20, w: 10 },
  { id: 'nave', nombre: 'Nave de Planeta Tiqui', emoji: '🚀', ruta: '/mundo/0/nave', x: 88, y: 74, w: 10 },
];

type Pos = { x: number; y: number };
type Arrastrando = { id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };
type Burst = { id: number; x: number; y: number; emoji: string };

export default function AldeaPage() {
  const router = useRouter();

  const [pos, setPos] = useState<Record<string, Pos>>(
    Object.fromEntries(PERSONAJES.map(p => [p.id, { x: p.x, y: p.y }]))
  );
  const [zOrder, setZOrder] = useState<string[]>(PERSONAJES.map(p => p.id));
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [portalHover, setPortalHover] = useState<string | null>(null);
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

  const onPersonajePointerDown = (p: Personaje) => (e: React.PointerEvent) => {
    e.stopPropagation();
    traerAlFrente(p.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cur = pos[p.id];
    arrastre.current = {
      id: p.id, startClientX: e.clientX, startClientY: e.clientY,
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
    setPos(prev => ({ ...prev, [a.id]: { x: Math.max(3, Math.min(97, xPct)), y: Math.max(10, Math.min(96, yPct)) } }));
  };

  const onContainerPointerUp = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    if (!a.movido) {
      // toque simple (sin arrastre) -> reacción de vida: rebote + sonido
      const p = PERSONAJES.find(x => x.id === a.id)!;
      setBounceId(p.id);
      setTimeout(() => setBounceId(null), 260);
      melody(p.sonido, 90, 0.22, 0.16);
      vib(15);
      lanzarBurst(pos[p.id].x, pos[p.id].y - p.w * 0.5, '✨');
    }
  };

  const onPortalPointerDown = (portal: Portal) => (e: React.PointerEvent) => {
    e.stopPropagation();
    melody([523, 659, 784, 1046], 90, 0.28, 0.2);
    vib([15, 10, 20]);
    lanzarBurst(portal.x, portal.y - portal.w * 0.5, '✨');
    setTimeout(() => router.push(portal.ruta), 260);
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#1a1030', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0')}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 50, width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,10,40,.75)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 10, left: 58, zIndex: 50, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        🏘️ La Aldea de Toqwow
      </div>

      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          <Image src={BG} alt="La Aldea de Toqwow" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />

          {/* Portales a las otras 4 zonas + Taller (5 en total) */}
          {PORTALES.map(portal => (
            <div key={portal.id}
              onPointerDown={onPortalPointerDown(portal)}
              onPointerEnter={() => setPortalHover(portal.id)}
              onPointerLeave={() => setPortalHover(null)}
              style={{
                position: 'absolute', left: `${portal.x}%`, top: `${portal.y}%`, width: `${portal.w}%`,
                transform: `translate(-50%,-50%) scale(${portalHover === portal.id ? 1.12 : 1})`,
                transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)', cursor: 'pointer', zIndex: 10, touchAction: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,220,140,.35), rgba(255,220,140,.05))',
                border: '2px solid rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2vw', boxShadow: '0 4px 14px rgba(0,0,0,.35)',
              }}>{portal.emoji}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'white', background: 'rgba(20,10,40,.7)',
                borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap',
              }}>{portal.nombre}</div>
            </div>
          ))}

          {/* Elenco: los 10 personajes libres para arrastrar por la plaza */}
          {zOrder.map((id, i) => {
            const p = PERSONAJES.find(x => x.id === id)!;
            const cur = pos[id];
            return (
              <img key={p.id} src={`${CHAR_BASE}/${p.archivo}`} alt={p.nombre} draggable={false}
                onPointerDown={onPersonajePointerDown(p)}
                style={{
                  position: 'absolute', left: `${cur.x}%`, top: `${cur.y}%`, width: `${p.w}%`,
                  transform: `translate(-50%,-50%) scale(${bounceId === p.id ? 1.15 : 1})`,
                  transition: arrastre.current?.id === p.id ? 'none' : 'transform .2s cubic-bezier(.34,1.56,.64,1), left .18s ease-out, top .18s ease-out',
                  cursor: 'grab', zIndex: 20 + i, touchAction: 'none',
                  filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.4))',
                }} />
            );
          })}

          {bursts.map(b => (
            <div key={b.id} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
              animation: 'burstFloatAldea .9s ease-out forwards', zIndex: 60, pointerEvents: 'none',
            }}>{b.emoji}</div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes burstFloatAldea { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
      `}</style>
    </div>
  );
}
