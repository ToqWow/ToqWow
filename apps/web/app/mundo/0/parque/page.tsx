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

const BG = '/assets/redesign/parque/fondo.webp';
const PROPS_BASE = '/assets/redesign/parque/props';

// El objetivo del juego es armar el rincón de jardinería: arrastrar los 5
// objetos (regadera, pala, casita de pájaros, canasta, sombrilla) hasta el
// círculo de pasto marcado. Las 4 criaturas (rana, pájaro, mariposa,
// luciérnaga) quedan libres para pasear y reaccionan al tocarlas, sin meta.
type Objeto = { id: string; nombre: string; archivo: string; w: number; x: number; y: number; sonido: number[]; emoji: string; esMeta: boolean };

const OBJETOS: Objeto[] = [
  { id: 'rana', nombre: 'Rana', archivo: 'rana.png', w: 8, x: 44, y: 66, sonido: [349, 392, 440], emoji: '🐸', esMeta: false },
  { id: 'pajaro', nombre: 'Pájaro', archivo: 'pajaro.png', w: 7, x: 28, y: 46, sonido: [880, 988, 1046], emoji: '🐦', esMeta: false },
  { id: 'mariposa', nombre: 'Mariposa', archivo: 'mariposa.png', w: 6, x: 62, y: 28, sonido: [659, 784, 880], emoji: '🦋', esMeta: false },
  { id: 'luciernaga', nombre: 'Luciérnaga', archivo: 'luciernaga.png', w: 6, x: 55, y: 45, sonido: [523, 659], emoji: '✨', esMeta: false },
  { id: 'regadera', nombre: 'Regadera', archivo: 'regadera.png', w: 8, x: 24, y: 70, sonido: [392, 440, 349], emoji: '💧', esMeta: true },
  { id: 'pala', nombre: 'Pala', archivo: 'pala.png', w: 7, x: 30, y: 82, sonido: [349, 293], emoji: '🌱', esMeta: true },
  { id: 'casita_pajaros', nombre: 'Casita de pájaros', archivo: 'casita_pajaros.png', w: 9, x: 15, y: 62, sonido: [523, 587, 659], emoji: '🏠', esMeta: true },
  { id: 'canasta', nombre: 'Canasta', archivo: 'canasta.png', w: 9, x: 20, y: 88, sonido: [440, 523], emoji: '🧺', esMeta: true },
  { id: 'sombrilla', nombre: 'Sombrilla', archivo: 'sombrilla.png', w: 10, x: 12, y: 78, sonido: [587, 698, 784], emoji: '☂️', esMeta: true },
];

const METAS = OBJETOS.filter(o => o.esMeta);
// Rincón de jardinería, en el pasto abierto a la derecha de la laguna
const RINCON = { x: 78, y: 58, radio: 17 };

type Pos = { x: number; y: number };
type Arrastrando = { id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };
type Burst = { id: number; x: number; y: number; emoji: string };

const posicionesIniciales = () => Object.fromEntries(OBJETOS.map(o => [o.id, { x: o.x, y: o.y }]));

export default function ParquePage() {
  const router = useRouter();

  const [pos, setPos] = useState<Record<string, Pos>>(posicionesIniciales);
  const [zOrder, setZOrder] = useState<string[]>(OBJETOS.map(o => o.id));
  const [ubicados, setUbicados] = useState<Set<string>>(new Set());
  const [ubicandoId, setUbicandoId] = useState<string | null>(null);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [celebrando, setCelebrando] = useState(false);
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
    if (ubicados.has(o.id)) return;
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
    setPos(prev => ({ ...prev, [a.id]: { x: Math.max(3, Math.min(97, xPct)), y: Math.max(8, Math.min(96, yPct)) } }));
  };

  const reiniciarRonda = () => {
    setPos(posicionesIniciales());
    setUbicados(new Set());
    setZOrder(OBJETOS.map(o => o.id));
  };

  const onContainerPointerUp = () => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    const o = OBJETOS.find(x => x.id === a.id)!;

    if (!a.movido) {
      // toque simple -> reacción, no cuenta para la meta (aplica a criaturas y objetos)
      setBounceId(o.id);
      setTimeout(() => setBounceId(null), 260);
      melody(o.sonido, 90, 0.22, 0.16);
      vib(15);
      lanzarBurst(pos[o.id].x, pos[o.id].y - o.w * 0.5, o.emoji);
      return;
    }

    if (!o.esMeta) return; // las criaturas solo se arrastran libremente, sin meta

    const p = pos[o.id];
    const dist = Math.hypot(p.x - RINCON.x, p.y - RINCON.y);
    if (dist < RINCON.radio) {
      setUbicandoId(o.id);
      melody([659, 880, 1046], 80, 0.2, 0.2);
      vib(20);
      lanzarBurst(RINCON.x, RINCON.y - 8, '✨');
      setTimeout(() => {
        setUbicados(prev => {
          const next = new Set(prev).add(o.id);
          if (next.size === METAS.length) {
            setTimeout(() => {
              setCelebrando(true);
              melody([523, 659, 784, 1046, 1318], 110, 0.35, 0.22);
              vib([20, 15, 20, 15, 30]);
              setTimeout(() => { setCelebrando(false); reiniciarRonda(); }, 2600);
            }, 300);
          }
          return next;
        });
        setUbicandoId(null);
      }, 260);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#1a3020', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0/aldea')}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 80, width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,10,40,.75)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 10, left: 58, zIndex: 80, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        🌷 El Parque de los Descubrimientos
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 80, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 14px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        🌼 {ubicados.size}/{METAS.length}
      </div>

      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          <Image src={BG} alt="El Parque de los Descubrimientos" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />

          {/* Brillo suave sobre el rincón de jardinería para indicar la meta */}
          <div style={{
            position: 'absolute', left: `${RINCON.x}%`, top: `${RINCON.y}%`, width: '24%', aspectRatio: '1',
            transform: 'translate(-50%,-50%)', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,255,150,.28), rgba(180,255,150,0))',
            animation: 'pulseRincon 2.4s ease-in-out infinite', zIndex: 5, pointerEvents: 'none',
          }} />

          {zOrder.filter(id => !ubicados.has(id)).map((id, i) => {
            const o = OBJETOS.find(x => x.id === id)!;
            const cur = pos[id];
            const ubicando = ubicandoId === id;
            return (
              <img key={o.id} src={`${PROPS_BASE}/${o.archivo}`} alt={o.nombre} draggable={false}
                onPointerDown={onObjetoPointerDown(o)}
                style={{
                  position: 'absolute',
                  left: `${ubicando ? RINCON.x : cur.x}%`, top: `${ubicando ? RINCON.y : cur.y}%`,
                  width: `${o.w}%`,
                  transform: `translate(-50%,-50%) scale(${ubicando ? 0.15 : bounceId === o.id ? 1.15 : 1})`,
                  opacity: ubicando ? 0 : 1,
                  transition: ubicando ? 'all .26s ease-in' : (arrastre.current?.id === o.id ? 'none' : 'transform .2s cubic-bezier(.34,1.56,.64,1), left .18s ease-out, top .18s ease-out'),
                  cursor: 'grab', zIndex: 20 + i, touchAction: 'none',
                  filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.35))',
                }} />
            );
          })}

          {bursts.map(b => (
            <div key={b.id} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
              animation: 'burstFloatParque .9s ease-out forwards', zIndex: 60, pointerEvents: 'none',
            }}>{b.emoji}</div>
          ))}

          {celebrando && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(20,10,40,.35)',
            }}>
              <div style={{
                background: 'rgba(255,255,255,.95)', borderRadius: 24, padding: '20px 32px', textAlign: 'center',
                animation: 'popCeleb .4s cubic-bezier(.34,1.56,.64,1)',
              }}>
                <div style={{ fontSize: 40 }}>🎉🌷🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#245a2a', marginTop: 6 }}>¡Rincón listo!</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes burstFloatParque { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
        @keyframes pulseRincon { 0%,100%{ opacity: .5; transform: translate(-50%,-50%) scale(1); } 50%{ opacity: 1; transform: translate(-50%,-50%) scale(1.08); } }
        @keyframes popCeleb { 0%{ transform: scale(.5); opacity: 0; } 100%{ transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
