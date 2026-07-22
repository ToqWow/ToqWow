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

// ---- Props: posicion en % del contenedor, y que pasa al tocarlos ----
type Prop = { id: string; src: string; x: number; y: number; w: number; sonido: number[]; emoji: string };

const PROPS: Prop[] = [
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
  { id: 'taburete', src: 'taburete.png', x: 63, y: 54, w: 10, sonido: [440, 523], emoji: '🪑' },
];

// ---- Botellas: se arrastran (no se tocan) y si se sueltan sobre el personaje, lo "alimentan" ----
type Botella = { id: string; src: string; homeX: number; homeY: number; w: number };
const BOTELLAS: Botella[] = [
  { id: 'botella1', src: 'botella_leche_1.png', homeX: 22, homeY: 48, w: 8 },
  { id: 'botella2', src: 'botella_leche_2.png', homeX: 34, homeY: 50, w: 7 },
];

// ---- Alfombras: van pegadas al piso, no reaccionan a sonido especial, solo decorativas + tocables ----
const ALFOMBRAS = [
  { id: 'alfombra_cohete', src: 'alfombra_cohete.png', x: 33, y: 86, w: 22 },
  { id: 'alfombra_estrellas', src: 'alfombra_estrellas.png', x: 62, y: 88, w: 20 },
];

// ---- Muebles grandes con zona de reaccion (cuna = dormir, banera = burbujas) ----
const CUNA = { x: 16, y: 34, w: 16 };
const BANERA = { x: 52, y: 40, w: 15 };
const ROPERO = { x: 80, y: 36, w: 14 };

type Burst = { id: number; x: number; y: number; emoji: string };

export default function GuarderiaPage() {
  const router = useRouter();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [bounceId, setBounceId] = useState<string | null>(null);
  const [charPos, setCharPos] = useState({ x: 45, y: 60 });
  const [dragging, setDragging] = useState(false);
  const [reaction, setReaction] = useState<'none' | 'dormir' | 'banar' | 'comer'>('none');
  const [botellaPos, setBotellaPos] = useState<Record<string, { x: number; y: number }>>(
    Object.fromEntries(BOTELLAS.map(b => [b.id, { x: b.homeX, y: b.homeY }]))
  );
  const [draggingBotella, setDraggingBotella] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const burstIdRef = useRef(0);
  const dragOffset = useRef({ x: 0, y: 0 });

  const lanzarBurst = useCallback((xPct: number, yPct: number, emoji: string) => {
    const id = burstIdRef.current++;
    setBursts(prev => [...prev, { id, x: xPct, y: yPct, emoji }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
  }, []);

  const tocarProp = (p: Prop) => {
    setBounceId(p.id);
    setTimeout(() => setBounceId(null), 260);
    melody(p.sonido, 90, 0.22, 0.16);
    vib(15);
    lanzarBurst(p.x + p.w / 2, p.y, p.emoji);
  };

  const dentroDeZona = (x: number, y: number, zona: { x: number; y: number; w: number }) => {
    return Math.abs(x - (zona.x + zona.w / 2)) < zona.w * 0.7 && Math.abs(y - zona.y) < 14;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (reaction !== 'none') return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: charPos.x - ((e.clientX - rect.left) / rect.width) * 100,
      y: charPos.y - ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100 + dragOffset.current.x;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100 + dragOffset.current.y;
    if (dragging) {
      setCharPos({ x: Math.max(4, Math.min(96, xPct)), y: Math.max(15, Math.min(92, yPct)) });
    } else if (draggingBotella) {
      setBotellaPos(prev => ({ ...prev, [draggingBotella]: { x: Math.max(4, Math.min(96, xPct)), y: Math.max(10, Math.min(94, yPct)) } }));
    }
  };

  const onPointerUp = () => {
    if (dragging) {
      setDragging(false);
      if (dentroDeZona(charPos.x, charPos.y, CUNA)) {
        setReaction('dormir');
        melody([523, 440, 349, 261], 220, 0.6, 0.12);
        vib([20, 40, 20]);
        setCharPos({ x: CUNA.x + CUNA.w / 2, y: CUNA.y + 4 });
        setTimeout(() => setReaction('none'), 3000);
      } else if (dentroDeZona(charPos.x, charPos.y, BANERA)) {
        setReaction('banar');
        melody([880, 988, 1046, 1174], 90, 0.25, 0.2);
        vib(15);
        setCharPos({ x: BANERA.x + BANERA.w / 2, y: BANERA.y + 5 });
        setTimeout(() => setReaction('none'), 3000);
      }
      return;
    }
    if (draggingBotella) {
      const id = draggingBotella;
      const pos = botellaPos[id];
      const cerca = Math.abs(pos.x - charPos.x) < 12 && Math.abs(pos.y - charPos.y) < 16;
      setDraggingBotella(null);
      if (cerca) {
        setReaction('comer');
        melody([392, 440, 523, 659], 110, 0.3, 0.18);
        vib(20);
        lanzarBurst(charPos.x, charPos.y - 6, '💜');
        setTimeout(() => setReaction('none'), 1400);
      }
      // la botella siempre vuelve a su lugar
      const home = BOTELLAS.find(b => b.id === id)!;
      setBotellaPos(prev => ({ ...prev, [id]: { x: home.homeX, y: home.homeY } }));
    }
  };

  const onPointerDownBotella = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingBotella(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = botellaPos[id];
    dragOffset.current = {
      x: pos.x - ((e.clientX - rect.left) / rect.width) * 100,
      y: pos.y - ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d0620', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0')}
        style={{ position: 'absolute', top: 12, left: 12, zIndex: 50, width: 40, height: 40, borderRadius: '50%', background: 'rgba(20,10,40,.7)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        <Image src={`${BASE}/fondo.webp`} alt="Guardería Alienígena" fill priority style={{ objectFit: 'cover' }} />

        {ALFOMBRAS.map(a => (
          <img key={a.id} src={`${BASE}/${a.src}`} alt="" draggable={false}
            style={{ position: 'absolute', left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 2 }} />
        ))}

        {/* Muebles grandes (no reaccionan al toque directo, son zonas de destino para arrastrar el personaje) */}
        <img src={`${BASE}/cuna_nube.png`} alt="Cuna" draggable={false}
          style={{ position: 'absolute', left: `${CUNA.x}%`, top: `${CUNA.y}%`, width: `${CUNA.w}%`, transform: 'translate(-50%,-50%)', zIndex: 5,
            filter: reaction === 'dormir' ? 'drop-shadow(0 0 20px rgba(150,220,255,.9))' : 'drop-shadow(0 6px 8px rgba(0,0,0,.4))' }} />
        <img src={`${BASE}/banera_burbuja.png`} alt="Bañera" draggable={false}
          style={{ position: 'absolute', left: `${BANERA.x}%`, top: `${BANERA.y}%`, width: `${BANERA.w}%`, transform: 'translate(-50%,-50%)', zIndex: 5,
            filter: reaction === 'banar' ? 'drop-shadow(0 0 20px rgba(150,255,220,.9))' : 'drop-shadow(0 6px 8px rgba(0,0,0,.4))' }} />
        <img src={`${BASE}/ropero_capsula.png`} alt="Ropero" draggable={false}
          style={{ position: 'absolute', left: `${ROPERO.x}%`, top: `${ROPERO.y}%`, width: `${ROPERO.w}%`, transform: 'translate(-50%,-50%)', zIndex: 5, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.4))' }} />

        {/* Props tocables */}
        {PROPS.map(p => (
          <img key={p.id} src={`${BASE}/${p.src}`} alt="" draggable={false}
            onPointerDown={(e) => { e.stopPropagation(); tocarProp(p); }}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`,
              transform: `translate(-50%,-50%) scale(${bounceId === p.id ? 1.18 : 1})`,
              transition: 'transform .18s cubic-bezier(.34,1.56,.64,1)', cursor: 'pointer', zIndex: 6, touchAction: 'none',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))',
            }} />
        ))}

        {/* Burbujas cuando reaction === 'banar' */}
        {reaction === 'banar' && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${BANERA.x + (Math.random() * 10 - 5)}%`, top: `${BANERA.y}%`,
            fontSize: 14 + Math.random() * 10, animation: `subirBurbuja 1.4s ease-out ${i * 0.1}s infinite`,
            zIndex: 7, pointerEvents: 'none',
          }}>🫧</div>
        ))}
        {reaction === 'dormir' && (
          <div style={{ position: 'absolute', left: `${CUNA.x + 10}%`, top: `${CUNA.y - 8}%`, fontSize: 24, animation: 'flotarZzz 2s ease-in-out infinite', zIndex: 7, pointerEvents: 'none' }}>💤</div>
        )}

        {/* Botellas arrastrables: soltar sobre el personaje = alimentarlo */}
        {BOTELLAS.map(b => (
          <img key={b.id} src={`${BASE}/${b.src}`} alt="" draggable={false}
            onPointerDown={onPointerDownBotella(b.id)}
            style={{
              position: 'absolute', left: `${botellaPos[b.id].x}%`, top: `${botellaPos[b.id].y}%`, width: `${b.w}%`,
              transform: `translate(-50%,-50%) scale(${draggingBotella === b.id ? 1.15 : 1})`,
              transition: draggingBotella === b.id ? 'none' : 'left .25s ease-out, top .25s ease-out, transform .2s ease-out',
              cursor: draggingBotella === b.id ? 'grabbing' : 'grab', zIndex: 15,
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))', touchAction: 'none',
            }} />
        ))}

        {/* Personaje arrastrable */}
        <img
          src="/assets/mundo1/char_toqwow_v3.png"
          alt="Personaje"
          draggable={false}
          onPointerDown={onPointerDown}
          style={{
            position: 'absolute', left: `${charPos.x}%`, top: `${charPos.y}%`, width: '20%',
            transform: `translate(-50%,-50%) scale(${dragging || reaction === 'comer' ? 1.12 : 1}) ${reaction === 'dormir' ? 'rotate(90deg) scale(.8)' : ''}`,
            transition: dragging ? 'none' : 'transform .25s ease-out, left .2s ease-out, top .2s ease-out',
            cursor: dragging ? 'grabbing' : 'grab', zIndex: 20, touchAction: 'none',
            filter: reaction === 'comer' ? 'drop-shadow(0 0 18px rgba(200,150,255,.9))' : 'drop-shadow(0 8px 10px rgba(0,0,0,.45))',
            opacity: reaction === 'dormir' ? 0.85 : 1,
          }}
        />

        {/* Bursts de particulas al tocar props */}
        {bursts.map(b => (
          <div key={b.id} style={{
            position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, fontSize: 26,
            animation: 'burstFloat .9s ease-out forwards', zIndex: 30, pointerEvents: 'none',
          }}>{b.emoji}</div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes burstFloat { 0%{ transform: translate(-50%,-50%) scale(.4); opacity: 1; } 40%{ transform: translate(-50%,-150%) scale(1.3); opacity: 1;} 100%{ transform: translate(-50%,-220%) scale(1); opacity: 0; } }
        @keyframes subirBurbuja { 0%{ transform: translateY(0) scale(.6); opacity: .9; } 100%{ transform: translateY(-90px) scale(1.1); opacity: 0; } }
        @keyframes flotarZzz { 0%,100%{ transform: translateY(0); opacity: .85; } 50%{ transform: translateY(-10px); opacity: 1; } }
      `}</style>
    </div>
  );
}
