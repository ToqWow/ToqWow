'use client';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- Audio synth (mismo patron liviano que el resto de ToqWow, sin assets de sonido) ----
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.3, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

const BASE = '/assets/planeta-tiqui/guarderia';

// ---- Todos los objetos del cuarto (16) tienen un lugar correcto (meta). Arrancan en una bandeja
//      abajo, se ve un contorno fantasma en su lugar, y encastran con sonido al soltarlos cerca. ----
type Objeto = { id: string; src: string; nombre: string; metaX: number; metaY: number; w: number; sonido: number[]; emoji: string };

const OBJETOS: Objeto[] = [
  { id: 'cuna', src: 'cuna_nube.png', nombre: 'Cuna', metaX: 16, metaY: 34, w: 16, sonido: [523, 659, 784, 1046], emoji: '✅' },
  { id: 'banera', src: 'banera_burbuja.png', nombre: 'Bañera', metaX: 52, metaY: 40, w: 15, sonido: [523, 659, 784, 1046], emoji: '✅' },
  { id: 'ropero', src: 'ropero_capsula.png', nombre: 'Ropero', metaX: 80, metaY: 36, w: 14, sonido: [523, 659, 784, 1046], emoji: '✅' },
  { id: 'alfombra_cohete', src: 'alfombra_cohete.png', nombre: 'Alfombra cohete', metaX: 33, metaY: 86, w: 22, sonido: [349, 392], emoji: '🚀' },
  { id: 'alfombra_estrellas', src: 'alfombra_estrellas.png', nombre: 'Alfombra estrellas', metaX: 62, metaY: 88, w: 20, sonido: [523, 587], emoji: '⭐' },
  { id: 'taburete', src: 'taburete.png', nombre: 'Taburete', metaX: 63, metaY: 54, w: 10, sonido: [440, 523], emoji: '🪑' },
  { id: 'movil', src: 'movil_planetas.png', nombre: 'Móvil', metaX: 20, metaY: 10, w: 13, sonido: [784, 880, 988], emoji: '✨' },
  { id: 'espejo', src: 'espejo_cristal.png', nombre: 'Espejo', metaX: 8, metaY: 30, w: 11, sonido: [659, 784], emoji: '💎' },
  { id: 'estrella', src: 'luz_estrella.png', nombre: 'Estrella', metaX: 88, metaY: 14, w: 9, sonido: [880, 1046], emoji: '⭐' },
  { id: 'planeta', src: 'planeta_decor.png', nombre: 'Planeta', metaX: 90, metaY: 32, w: 10, sonido: [523, 659, 784], emoji: '🪐' },
  { id: 'cristal', src: 'cristal_cluster.png', nombre: 'Cristal', metaX: 38, metaY: 46, w: 9, sonido: [988, 1174], emoji: '💠' },
  { id: 'planta', src: 'planta_alien.png', nombre: 'Planta', metaX: 12, metaY: 56, w: 12, sonido: [392, 440], emoji: '🌱' },
  { id: 'cesto', src: 'cesto_juguetes.png', nombre: 'Cesto', metaX: 27, metaY: 68, w: 14, sonido: [349, 392, 440], emoji: '🧸' },
  { id: 'torre', src: 'torre_bloques.png', nombre: 'Torre', metaX: 46, metaY: 70, w: 9, sonido: [261, 329, 392], emoji: '🧱' },
  { id: 'peluche', src: 'peluche_alien.png', nombre: 'Peluche', metaX: 58, metaY: 74, w: 10, sonido: [587, 659, 523], emoji: '💜' },
  { id: 'lampara', src: 'lampara_orbe.png', nombre: 'Lámpara', metaX: 74, metaY: 64, w: 9, sonido: [698, 880], emoji: '🔆' },
  { id: 'botella1', src: 'botella_leche_1.png', nombre: 'Biberón', metaX: 22, metaY: 48, w: 8, sonido: [523, 587], emoji: '🍼' },
  { id: 'botella2', src: 'botella_leche_2.png', nombre: 'Biberón', metaX: 34, metaY: 50, w: 7, sonido: [523, 587], emoji: '🍼' },
];

// ---- Bandeja: posiciones iniciales en 2 filas abajo, separadas de sus metas ----
const posicionBandeja = (i: number): { x: number; y: number } => {
  const porFila = 9;
  const fila = Math.floor(i / porFila);
  const col = i % porFila;
  const totalEnFila = Math.min(porFila, OBJETOS.length - fila * porFila);
  const espacio = 96 / (totalEnFila + 1);
  return { x: espacio * (col + 1), y: fila === 0 ? 91 : 98 };
};

const CUNA_ZONA = { x: 16, y: 34, w: 16 };
const BANERA_ZONA = { x: 52, y: 40, w: 15 };
const TOLERANCIA = 9;

type Burst = { id: number; x: number; y: number; emoji: string };
type Pos = { x: number; y: number; colocado: boolean };
type Arrastrando = { id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };

export default function GuarderiaPage() {
  const router = useRouter();

  const [pos, setPos] = useState<Record<string, Pos>>(
    Object.fromEntries(OBJETOS.map((o, i) => [o.id, { ...posicionBandeja(i), colocado: false }]))
  );
  const [charPos, setCharPos] = useState({ x: 45, y: 62 });
  const [charDragging, setCharDragging] = useState(false);
  const [reaction, setReaction] = useState<'none' | 'dormir' | 'banar'>('none');
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [celebracion, setCelebracion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const burstIdRef = useRef(0);
  const arrastre = useRef<Arrastrando | null>(null);
  const charOffset = useRef({ x: 0, y: 0 });

  const colocados = OBJETOS.filter(o => pos[o.id].colocado).length;

  const lanzarBurst = useCallback((xPct: number, yPct: number, emoji: string) => {
    const id = burstIdRef.current++;
    setBursts(prev => [...prev, { id, x: xPct, y: yPct, emoji }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
  }, []);

  const dentroDeZona = (x: number, y: number, zona: { x: number; y: number; w: number }) =>
    Math.abs(x - (zona.x + zona.w / 2)) < zona.w * 0.7 && Math.abs(y - zona.y) < 14;

  const onObjetoPointerDown = (o: Objeto) => (e: React.PointerEvent) => {
    if (pos[o.id].colocado) {
      // ya esta en su lugar: tocarlo solo repite el sonido, no se mueve mas
      melody(o.sonido.slice(0, 2), 100, 0.2, 0.14);
      vib(10);
      return;
    }
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = pos[o.id];
    arrastre.current = {
      id: o.id, startClientX: e.clientX, startClientY: e.clientY,
      offsetX: p.x - ((e.clientX - rect.left) / rect.width) * 100,
      offsetY: p.y - ((e.clientY - rect.top) / rect.height) * 100,
      movido: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onContainerPointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (charDragging) {
      const xPct = ((e.clientX - rect.left) / rect.width) * 100 + charOffset.current.x;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100 + charOffset.current.y;
      setCharPos({ x: Math.max(4, Math.min(96, xPct)), y: Math.max(15, Math.min(92, yPct)) });
      return;
    }
    const a = arrastre.current;
    if (!a) return;
    const dist = Math.hypot(e.clientX - a.startClientX, e.clientY - a.startClientY);
    if (dist > 6) a.movido = true;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100 + a.offsetX;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100 + a.offsetY;
    setPos(prev => ({ ...prev, [a.id]: { ...prev[a.id], x: Math.max(3, Math.min(97, xPct)), y: Math.max(4, Math.min(99, yPct)) } }));
  };

  const onContainerPointerUp = () => {
    if (charDragging) {
      setCharDragging(false);
      if (dentroDeZona(charPos.x, charPos.y, CUNA_ZONA)) {
        setReaction('dormir');
        melody([523, 440, 349, 261], 220, 0.6, 0.12);
        vib([20, 40, 20]);
        setCharPos({ x: CUNA_ZONA.x + CUNA_ZONA.w / 2, y: CUNA_ZONA.y + 4 });
        setTimeout(() => setReaction('none'), 3000);
      } else if (dentroDeZona(charPos.x, charPos.y, BANERA_ZONA)) {
        setReaction('banar');
        melody([880, 988, 1046, 1174], 90, 0.25, 0.2);
        vib(15);
        setCharPos({ x: BANERA_ZONA.x + BANERA_ZONA.w / 2, y: BANERA_ZONA.y + 5 });
        setTimeout(() => setReaction('none'), 3000);
      }
      return;
    }
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || !a.movido) return;

    const o = OBJETOS.find(x => x.id === a.id)!;
    const p = pos[a.id];
    const cerca = Math.hypot(p.x - o.metaX, p.y - o.metaY) < TOLERANCIA;
    if (cerca) {
      setPos(prev => {
        const next = { ...prev, [a.id]: { x: o.metaX, y: o.metaY, colocado: true } };
        const totalColocados = OBJETOS.filter(oo => next[oo.id].colocado).length;
        if (totalColocados === OBJETOS.length) {
          setTimeout(() => {
            setCelebracion(true);
            melody([523, 659, 784, 1046, 1318, 1568], 130, 0.45, 0.24);
            vib([20, 30, 20, 30, 20, 50]);
          }, 250);
        }
        return next;
      });
      melody(o.sonido, 90, 0.28, 0.2);
      vib([15, 10, 15]);
      lanzarBurst(o.metaX, o.metaY - o.w * 0.4, o.emoji);
    }
  };

  const onCharPointerDown = (e: React.PointerEvent) => {
    if (reaction !== 'none') return;
    e.stopPropagation();
    setCharDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    charOffset.current = {
      x: charPos.x - ((e.clientX - rect.left) / rect.width) * 100,
      y: charPos.y - ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d0620', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0')}
        style={{ position: 'absolute', top: 12, left: 12, zIndex: 50, width: 40, height: 40, borderRadius: '50%', background: 'rgba(20,10,40,.7)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 12, left: 62, zIndex: 50, background: 'rgba(20,10,40,.7)', borderRadius: 20, padding: '6px 14px', color: 'white', fontWeight: 700, fontSize: 14, border: '2px solid rgba(255,255,255,.4)' }}>
        {colocados}/{OBJETOS.length} ✨
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          ref={containerRef}
          onPointerMove={onContainerPointerMove}
          onPointerUp={onContainerPointerUp}
          onPointerCancel={onContainerPointerUp}
          style={{ position: 'relative', width: '100%', height: '100%', maxWidth: 'calc(100vh * 1.793)', maxHeight: 'calc(100vw / 1.793)', aspectRatio: '1.793' }}
        >
          <Image src={`${BASE}/fondo.webp`} alt="Guardería Alienígena" fill priority style={{ objectFit: 'cover' }} />

          {/* Contornos fantasma: donde va cada objeto hasta que se coloca */}
          {OBJETOS.map(o => !pos[o.id].colocado && (
            <img key={`ghost-${o.id}`} src={`${BASE}/${o.src}`} alt="" draggable={false}
              style={{
                position: 'absolute', left: `${o.metaX}%`, top: `${o.metaY}%`, width: `${o.w}%`,
                transform: 'translate(-50%,-50%)', opacity: 0.25, filter: 'grayscale(1) brightness(1.7)',
                zIndex: 3, pointerEvents: 'none',
              }} />
          ))}

          {reaction === 'banar' && Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${BANERA_ZONA.x + (Math.random() * 10 - 5)}%`, top: `${BANERA_ZONA.y}%`,
              fontSize: 14 + Math.random() * 10, animation: `subirBurbuja 1.4s ease-out ${i * 0.1}s infinite`,
              zIndex: 7, pointerEvents: 'none',
            }}>🫧</div>
          ))}
          {reaction === 'dormir' && (
            <div style={{ position: 'absolute', left: `${CUNA_ZONA.x + 10}%`, top: `${CUNA_ZONA.y - 8}%`, fontSize: 24, animation: 'flotarZzz 2s ease-in-out infinite', zIndex: 7, pointerEvents: 'none' }}>💤</div>
          )}

          {/* Los 16 objetos: en bandeja hasta colocarse, luego fijos en su meta */}
          {OBJETOS.map(o => (
            <img key={o.id} src={`${BASE}/${o.src}`} alt={o.nombre} draggable={false}
              onPointerDown={onObjetoPointerDown(o)}
              style={{
                position: 'absolute', left: `${pos[o.id].x}%`, top: `${pos[o.id].y}%`,
                width: `${pos[o.id].colocado ? o.w : o.w * 0.6}%`,
                transform: 'translate(-50%,-50%)',
                transition: arrastre.current?.id === o.id ? 'none' : 'left .25s ease-out, top .25s ease-out, width .25s ease-out',
                cursor: pos[o.id].colocado ? 'pointer' : 'grab',
                zIndex: pos[o.id].colocado ? (o.id === 'cuna' || o.id === 'banera' || o.id === 'ropero' ? 5 : 6) : 25,
                touchAction: 'none',
                filter: (o.id === 'cuna' && reaction === 'dormir') ? 'drop-shadow(0 0 20px rgba(150,220,255,.9))'
                  : (o.id === 'banera' && reaction === 'banar') ? 'drop-shadow(0 0 20px rgba(150,255,220,.9))'
                  : 'drop-shadow(0 4px 6px rgba(0,0,0,.4))',
              }} />
          ))}

          <img
            src="/assets/mundo1/char_toqwow_v3.png"
            alt="Personaje"
            draggable={false}
            onPointerDown={onCharPointerDown}
            style={{
              position: 'absolute', left: `${charPos.x}%`, top: `${charPos.y}%`, width: '20%',
              transform: `translate(-50%,-50%) scale(${charDragging ? 1.1 : 1}) ${reaction === 'dormir' ? 'rotate(90deg) scale(.8)' : ''}`,
              transition: charDragging ? 'none' : 'transform .25s ease-out, left .2s ease-out, top .2s ease-out',
              cursor: charDragging ? 'grabbing' : 'grab', zIndex: 20, touchAction: 'none',
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.45))',
              opacity: reaction === 'dormir' ? 0.85 : 1,
            }}
          />

          {bursts.map(b => (
            <div key={b.id} style={{
              position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
              animation: 'burstFloat .9s ease-out forwards', zIndex: 30, pointerEvents: 'none',
            }}>{b.emoji}</div>
          ))}

          {celebracion && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 60, background: 'rgba(20,10,40,.4)',
            }} onPointerDown={() => setCelebracion(false)}>
              <div style={{
                background: 'rgba(255,255,255,.95)', borderRadius: 24, padding: '28px 36px', textAlign: 'center',
                animation: 'popIn .4s cubic-bezier(.34,1.56,.64,1)',
              }}>
                <div style={{ fontSize: 48 }}>🎉✨🎉</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4a2f7a', marginTop: 8 }}>¡La Guardería está lista!</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes burstFloat { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
        @keyframes subirBurbuja { 0%{ transform: translateY(0) scale(.6); opacity: .9; } 100%{ transform: translateY(-90px) scale(1.1); opacity: 0; } }
        @keyframes flotarZzz { 0%,100%{ transform: translateY(0); opacity: .85; } 50%{ transform: translateY(-10px); opacity: 1; } }
        @keyframes popIn { 0%{ transform: scale(.5); opacity: 0; } 100%{ transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
