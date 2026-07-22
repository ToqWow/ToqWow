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

// ---- OBJETIVO: 3 muebles principales que el nino debe encastrar en su lugar correcto.
//      Empiezan en una bandeja abajo; hay un contorno fantasma marcando donde van. ----
type Mueble = { id: string; src: string; nombre: string; metaX: number; metaY: number; w: number };
const MUEBLES: Mueble[] = [
  { id: 'cuna', src: 'cuna_nube.png', nombre: 'Cuna', metaX: 16, metaY: 34, w: 16 },
  { id: 'banera', src: 'banera_burbuja.png', nombre: 'Bañera', metaX: 52, metaY: 40, w: 15 },
  { id: 'ropero', src: 'ropero_capsula.png', nombre: 'Ropero', metaX: 80, metaY: 36, w: 14 },
];

// ---- DECORACION LIBRE: props chicos, sin objetivo, se acomodan donde el nino quiera ----
type Item = { id: string; src: string; x: number; y: number; w: number; sonido: number[]; emoji: string };
const DECOR_INICIAL: Item[] = [
  { id: 'alfombra_cohete', src: 'alfombra_cohete.png', x: 33, y: 86, w: 22, sonido: [349, 392], emoji: '🚀' },
  { id: 'alfombra_estrellas', src: 'alfombra_estrellas.png', x: 62, y: 88, w: 20, sonido: [523, 587], emoji: '⭐' },
  { id: 'taburete', src: 'taburete.png', x: 63, y: 54, w: 10, sonido: [440, 523], emoji: '🪑' },
  { id: 'movil', src: 'movil_planetas.png', x: 20, y: 10, w: 13, sonido: [784, 880, 988], emoji: '✨' },
  { id: 'espejo', src: 'espejo_cristal.png', x: 8, y: 30, w: 11, sonido: [659, 784], emoji: '💎' },
  { id: 'estrella', src: 'luz_estrella.png', x: 88, y: 14, w: 9, sonido: [880, 1046], emoji: '⭐' },
  { id: 'planeta', src: 'planeta_decor.png', x: 90, y: 32, w: 10, sonido: [523, 659, 784], emoji: '🪐' },
  { id: 'cristal', src: 'cristal_cluster.png', x: 38, y: 46, w: 9, sonido: [988, 1174], emoji: '💠' },
  { id: 'planta', src: 'planta_alien.png', x: 12, y: 56, w: 12, sonido: [392, 440], emoji: '🌱' },
  { id: 'cesto', src: 'cesto_juguetes.png', x: 27, y: 68, w: 14, sonido: [349, 392, 440], emoji: '🧸' },
  { id: 'torre', src: 'torre_bloques.png', x: 46, y: 70, w: 9, sonido: [261, 329, 392], emoji: '🧱' },
  { id: 'peluche', src: 'peluche_alien.png', x: 58, y: 74, w: 10, sonido: [587, 659, 523], emoji: '💜' },
  { id: 'lampara', src: 'lampara_orbe.png', x: 74, y: 64, w: 9, sonido: [698, 880], emoji: '🔆' },
  { id: 'botella1', src: 'botella_leche_1.png', x: 22, y: 48, w: 8, sonido: [523, 587], emoji: '🍼' },
  { id: 'botella2', src: 'botella_leche_2.png', x: 34, y: 50, w: 7, sonido: [523, 587], emoji: '🍼' },
];

const CUNA_ZONA = { x: 16, y: 34, w: 16 };
const BANERA_ZONA = { x: 52, y: 40, w: 15 };
const TOLERANCIA = 10; // % de distancia para considerar "bien encastrado"

type Burst = { id: number; x: number; y: number; emoji: string };
type MueblePos = { x: number; y: number; colocado: boolean };
type Arrastrando = { tipo: 'mueble' | 'decor'; id: string; startClientX: number; startClientY: number; offsetX: number; offsetY: number; movido: boolean };

export default function GuarderiaPage() {
  const router = useRouter();

  // posicion de bandeja inicial para los 3 muebles (fila abajo, se van sacando de ahi)
  const [muebles, setMuebles] = useState<Record<string, MueblePos>>(
    Object.fromEntries(MUEBLES.map((m, i) => [m.id, { x: 20 + i * 30, y: 95, colocado: false }]))
  );
  const [decor, setDecor] = useState<Item[]>(DECOR_INICIAL);
  const [charPos, setCharPos] = useState({ x: 45, y: 62 });
  const [charDragging, setCharDragging] = useState(false);
  const [reaction, setReaction] = useState<'none' | 'dormir' | 'banar' | 'comer'>('none');
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [celebracion, setCelebracion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const burstIdRef = useRef(0);
  const arrastre = useRef<Arrastrando | null>(null);
  const charOffset = useRef({ x: 0, y: 0 });

  const todosColocados = MUEBLES.every(m => muebles[m.id].colocado);

  const lanzarBurst = useCallback((xPct: number, yPct: number, emoji: string) => {
    const id = burstIdRef.current++;
    setBursts(prev => [...prev, { id, x: xPct, y: yPct, emoji }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
  }, []);

  const dentroDeZona = (x: number, y: number, zona: { x: number; y: number; w: number }) =>
    Math.abs(x - (zona.x + zona.w / 2)) < zona.w * 0.7 && Math.abs(y - zona.y) < 14;

  // ---- Arrastre de muebles-objetivo ----
  const onMueblePointerDown = (m: Mueble) => (e: React.PointerEvent) => {
    if (muebles[m.id].colocado) return;
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = muebles[m.id];
    arrastre.current = {
      tipo: 'mueble', id: m.id, startClientX: e.clientX, startClientY: e.clientY,
      offsetX: pos.x - ((e.clientX - rect.left) / rect.width) * 100,
      offsetY: pos.y - ((e.clientY - rect.top) / rect.height) * 100,
      movido: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // ---- Arrastre de decoracion libre ----
  const onDecorPointerDown = (item: Item) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    arrastre.current = {
      tipo: 'decor', id: item.id, startClientX: e.clientX, startClientY: e.clientY,
      offsetX: item.x - ((e.clientX - rect.left) / rect.width) * 100,
      offsetY: item.y - ((e.clientY - rect.top) / rect.height) * 100,
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
    if (a.tipo === 'mueble') {
      setMuebles(prev => ({ ...prev, [a.id]: { ...prev[a.id], x: Math.max(3, Math.min(97, xPct)), y: Math.max(4, Math.min(97, yPct)) } }));
    } else {
      setDecor(prev => prev.map(it => it.id === a.id ? { ...it, x: Math.max(3, Math.min(97, xPct)), y: Math.max(4, Math.min(96, yPct)) } : it));
    }
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
    if (!a) return;

    if (a.tipo === 'mueble') {
      const meta = MUEBLES.find(m => m.id === a.id)!;
      const pos = muebles[a.id];
      const cerca = Math.hypot(pos.x - meta.metaX, pos.y - meta.metaY) < TOLERANCIA;
      if (cerca) {
        setMuebles(prev => ({ ...prev, [a.id]: { x: meta.metaX, y: meta.metaY, colocado: true } }));
        melody([523, 659, 784, 1046], 90, 0.3, 0.22);
        vib([15, 10, 15]);
        lanzarBurst(meta.metaX, meta.metaY - meta.w * 0.4, '✅');
        setTimeout(() => {
          const yaEstan = MUEBLES.filter(mm => mm.id !== a.id).every(mm => muebles[mm.id].colocado);
          if (yaEstan) {
            setCelebracion(true);
            melody([523, 659, 784, 1046, 1318], 130, 0.4, 0.22);
            vib([20, 30, 20, 30, 40]);
          }
        }, 50);
      }
      return;
    }

    // decoracion libre: toque vs arrastre
    const item = decor.find(it => it.id === a.id);
    if (!item) return;
    if (!a.movido) {
      setBounceId(item.id);
      setTimeout(() => setBounceId(null), 260);
      melody(item.sonido, 90, 0.22, 0.16);
      vib(15);
      lanzarBurst(item.x, item.y - item.w * 0.3, item.emoji);
      return;
    }
    if (item.id.startsWith('botella')) {
      const cerca = Math.abs(item.x - charPos.x) < 12 && Math.abs(item.y - charPos.y) < 16;
      if (cerca) {
        setReaction('comer');
        melody([392, 440, 523, 659], 110, 0.3, 0.18);
        vib(20);
        lanzarBurst(charPos.x, charPos.y - 6, '💜');
        setTimeout(() => setReaction('none'), 1400);
        const original = DECOR_INICIAL.find(it => it.id === item.id)!;
        setDecor(prev => prev.map(it => it.id === item.id ? { ...it, x: original.x, y: original.y } : it));
      }
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

      {/* Progreso: 3 circulos que se van tildando a medida que se coloca cada mueble */}
      <div style={{ position: 'absolute', top: 12, left: 62, zIndex: 50, display: 'flex', gap: 8 }}>
        {MUEBLES.map(m => (
          <div key={m.id} style={{
            width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: muebles[m.id].colocado ? 'rgba(90,220,150,.9)' : 'rgba(20,10,40,.7)',
            border: '2px solid rgba(255,255,255,.6)', fontSize: 16, transition: 'background .3s',
          }}>{muebles[m.id].colocado ? '✅' : ''}</div>
        ))}
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

        {/* Contorno fantasma: muestra donde va cada mueble hasta que se coloca bien */}
        {MUEBLES.map(m => !muebles[m.id].colocado && (
          <img key={`ghost-${m.id}`} src={`${BASE}/${m.src}`} alt="" draggable={false}
            style={{
              position: 'absolute', left: `${m.metaX}%`, top: `${m.metaY}%`, width: `${m.w}%`,
              transform: 'translate(-50%,-50%)', opacity: 0.28, filter: 'grayscale(1) brightness(1.6)',
              zIndex: 3, pointerEvents: 'none',
            }} />
        ))}

        {/* Decoracion libre */}
        {decor.map(item => (
          <img key={item.id} src={`${BASE}/${item.src}`} alt="" draggable={false}
            onPointerDown={onDecorPointerDown(item)}
            style={{
              position: 'absolute', left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`,
              transform: `translate(-50%,-50%) scale(${bounceId === item.id ? 1.18 : 1})`,
              transition: arrastre.current?.id === item.id ? 'none' : 'transform .18s cubic-bezier(.34,1.56,.64,1)',
              cursor: 'grab', zIndex: 6, touchAction: 'none',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))',
            }} />
        ))}

        {/* Muebles objetivo (empiezan en la bandeja de abajo) */}
        {MUEBLES.map(m => (
          <img key={m.id} src={`${BASE}/${m.src}`} alt={m.nombre} draggable={false}
            onPointerDown={onMueblePointerDown(m)}
            style={{
              position: 'absolute', left: `${muebles[m.id].x}%`, top: `${muebles[m.id].y}%`, width: `${m.w}%`,
              transform: 'translate(-50%,-50%)',
              transition: arrastre.current?.id === m.id ? 'none' : 'left .25s ease-out, top .25s ease-out',
              cursor: muebles[m.id].colocado ? 'default' : 'grab', zIndex: muebles[m.id].colocado ? 5 : 25, touchAction: 'none',
              filter: (m.id === 'cuna' && reaction === 'dormir') ? 'drop-shadow(0 0 20px rgba(150,220,255,.9))'
                : (m.id === 'banera' && reaction === 'banar') ? 'drop-shadow(0 0 20px rgba(150,255,220,.9))'
                : 'drop-shadow(0 6px 8px rgba(0,0,0,.4))',
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

        <img
          src="/assets/mundo1/char_toqwow_v3.png"
          alt="Personaje"
          draggable={false}
          onPointerDown={onCharPointerDown}
          style={{
            position: 'absolute', left: `${charPos.x}%`, top: `${charPos.y}%`, width: '20%',
            transform: `translate(-50%,-50%) scale(${charDragging || reaction === 'comer' ? 1.12 : 1}) ${reaction === 'dormir' ? 'rotate(90deg) scale(.8)' : ''}`,
            transition: charDragging ? 'none' : 'transform .25s ease-out, left .2s ease-out, top .2s ease-out',
            cursor: charDragging ? 'grabbing' : 'grab', zIndex: 20, touchAction: 'none',
            filter: reaction === 'comer' ? 'drop-shadow(0 0 18px rgba(200,150,255,.9))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.45))',
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
            zIndex: 60, background: 'rgba(20,10,40,.35)',
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
