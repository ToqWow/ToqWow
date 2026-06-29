'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══════ AUDIO ══════ */
let AC: AudioContext | null = null;
const ac = () => { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); return AC; };
const osc = (f: number, d = 0.3, v = 0.22, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const chord = (fs: number[], gap = 80) => fs.forEach((f, i) => setTimeout(() => osc(f, 0.4, 0.18), i * gap));
const sweep = (f1: number, f2: number, d = 0.4) => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d); g.gain.setValueAtTime(0.22, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}; };
const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

/* ══════ TIPOS ══════ */
type Vec2 = { x: number; y: number };
type Paint = { x: number; y: number; r: number; color: string; id: number };
type DraggableObj = {
  id: number; x: number; y: number; emoji: string; sz: number;
  label: string; color: string; dragging: boolean; rotation: number;
  scale: number; zIndex: number; reaction: string;
};
type Star = { id: number; x: number; y: number; sz: number; opacity: number; twinkle: number };
type Sparkle = { id: number; x: number; y: number; color: string };
type Bubble = { id: number; x: number; y: number; sz: number; color: string };

const PALETTE = [
  '#FF6B9D', '#FF8E53', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF6B6B', '#00D4C8', '#FFB347', '#98FF98',
  '#FF99CC', '#87CEEB', '#DDA0DD', '#F0E68C', '#FFA07A',
];

const INITIAL_OBJECTS: Omit<DraggableObj, 'dragging' | 'reaction' | 'zIndex'>[] = [
  { id: 1,  emoji: '🌟', label: 'estrella',  sz: 52, color: '#FFD700', x: 8,  y: 12, rotation: 0,  scale: 1 },
  { id: 2,  emoji: '🪐', label: 'planeta',   sz: 64, color: '#B8A9FF', x: 72, y: 8,  rotation: 0,  scale: 1 },
  { id: 3,  emoji: '🌙', label: 'luna',       sz: 56, color: '#FFFACD', x: 88, y: 38, rotation: 0, scale: 1 },
  { id: 4,  emoji: '☀️',  label: 'sol',        sz: 58, color: '#FFD700', x: 4,  y: 40, rotation: 0, scale: 1 },
  { id: 5,  emoji: '🌈', label: 'arcoíris',  sz: 54, color: '#FF6B9D', x: 40, y: 4,  rotation: 0,  scale: 1 },
  { id: 6,  emoji: '☄️',  label: 'cometa',    sz: 50, color: '#FF8E53', x: 60, y: 55, rotation: -30, scale: 1 },
  { id: 7,  emoji: '🚀', label: 'cohete',    sz: 52, color: '#4D96FF', x: 20, y: 58, rotation: -15, scale: 1 },
  { id: 8,  emoji: '🛸', label: 'ovni',      sz: 56, color: '#6BCB77', x: 80, y: 65, rotation: 0,  scale: 1 },
  { id: 9,  emoji: '💫', label: 'destellos', sz: 48, color: '#C77DFF', x: 50, y: 70, rotation: 0,  scale: 1 },
  { id: 10, emoji: '🌌', label: 'galaxia',   sz: 62, color: '#4D96FF', x: 28, y: 22, rotation: 0,  scale: 1 },
  { id: 11, emoji: '⭐', label: 'estrella2', sz: 44, color: '#FFD93D', x: 15, y: 72, rotation: 0,  scale: 1 },
  { id: 12, emoji: '🌠', label: 'meteorito', sz: 48, color: '#FF8E53', x: 64, y: 28, rotation: 20, scale: 1 },
  { id: 13, emoji: '🌊', label: 'ola',        sz: 50, color: '#87CEEB', x: 46, y: 42, rotation: 0, scale: 1 },
  { id: 14, emoji: '🎇', label: 'fuegos',    sz: 52, color: '#FF6B6B', x: 84, y: 18, rotation: 0,  scale: 1 },
  { id: 15, emoji: '🦋', label: 'mariposa',  sz: 48, color: '#FF99CC', x: 32, y: 50, rotation: 0,  scale: 1 },
];

/* Combinaciones: arrastrar A sobre B → resultado */
const COMBOS: Record<string, { emoji: string; label: string; sound: () => void }> = {
  'estrella+planeta':  { emoji: '🌟🪐', label: '¡Sistema solar!', sound: () => chord([523,659,784,1047]) },
  'sol+luna':          { emoji: '🌅',    label: '¡Amanecer!',      sound: () => chord([440,550,660,880]) },
  'cohete+planeta':    { emoji: '🚀🪐',  label: '¡Despegue!',      sound: () => sweep(200,1000,0.6) },
  'ovni+estrella':     { emoji: '👽✨',  label: '¡Contacto!',      sound: () => chord([300,400,500,600]) },
  'cometa+luna':       { emoji: '💥🌙',  label: '¡Impacto lunar!', sound: () => { osc(100,0.5,0.35,'sawtooth'); setTimeout(()=>chord([523,659,784]),300); } },
  'arcoíris+sol':      { emoji: '🌈☀️',  label: '¡Magia solar!',   sound: () => chord([523,659,784,1047,1319]) },
  'galaxia+estrella':  { emoji: '🌌⭐',  label: '¡Supernova!',     sound: () => chord([880,660,440,220]) },
  'mariposa+arcoíris': { emoji: '🦋🌈',  label: '¡Magia!',         sound: () => chord([784,1047,1319,1568]) },
};

const r  = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 1000;

export default function Mundo0() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [objects, setObjects] = useState<DraggableObj[]>(() =>
    INITIAL_OBJECTS.map(o => ({ ...o, dragging: false, reaction: '', zIndex: o.id }))
  );
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [paintColor, setPaintColor] = useState(PALETTE[0]);
  const [isPainting, setIsPainting] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [comboMsg, setComboMsg] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowMood, setToqwowMood] = useState<'idle' | 'happy' | 'dance' | 'wave'>('idle');
  const [toqwowPos, setToqwowPos] = useState({ x: 50, y: 75 });
  const [draggingToqwow, setDraggingToqwow] = useState(false);
  const [bgColor, setBgColor] = useState('linear-gradient(180deg,#04051a 0%,#080d3a 35%,#093058 65%,#074a55 100%)');

  const draggingId = useRef<number | null>(null);
  const dragOffset = useRef<Vec2>({ x: 0, y: 0 });
  const maxZ = useRef(20);
  const painting = useRef(false);
  const lastPaint = useRef<Vec2 | null>(null);
  const toqwowDragging = useRef(false);
  const toqwowOffset = useRef<Vec2>({ x: 0, y: 0 });
  const idleTimer = useRef<any>(null);

  /* ── Canvas setup ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctxRef.current = canvas.getContext('2d');
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Estrellas de fondo estáticas ── */
  const bgStars = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    id: i, x: r(0, 100), y: r(0, 90), sz: r(1, i % 6 === 0 ? 4 : 2.5),
    opacity: r(0.15, 0.9), twinkle: ri(0, 4),
  })), []);

  /* ── Sparkles burst ── */
  const addSparkles = useCallback((x: number, y: number, color: string) => {
    const ns: Sparkle[] = Array.from({ length: 8 }, () => ({ id: uid++, x: x + r(-30, 30), y: y + r(-30, 30), color }));
    setSparkles(s => [...s, ...ns]);
    setTimeout(() => setSparkles(s => s.filter(sp => !ns.find(n => n.id === sp.id))), 800);
    const nb: Bubble[] = Array.from({ length: 5 }, () => ({ id: uid++, x: x + r(-25, 25), y: y + r(-20, 20), sz: r(4, 14), color: PALETTE[ri(0, PALETTE.length)] }));
    setBubbles(b => [...b, ...nb]);
    setTimeout(() => setBubbles(b => b.filter(bb => !nb.find(n => n.id === bb.id))), 1600);
    vib(20);
  }, []);

  /* ── Toqwow idle hint ── */
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setToqwowMood('wave');
      setTimeout(() => setToqwowMood('idle'), 2000);
    }, 10000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [resetIdleTimer]);

  /* ── Paint on canvas ── */
  const paint = useCallback((clientX: number, clientY: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = paintColor;
    if (lastPaint.current) {
      const dx = x - lastPaint.current.x;
      const dy = y - lastPaint.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(dist / 8);
      for (let i = 0; i <= steps; i++) {
        const px = lastPaint.current.x + (dx * i) / steps;
        const py = lastPaint.current.y + (dy * i) / steps;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    }
    lastPaint.current = { x, y };
    osc(ri(400, 800), 0.08, 0.06);
  }, [paintColor]);

  /* ── Check combo ── */
  const checkCombo = useCallback((draggedId: number, targetId: number) => {
    const dragged = objects.find(o => o.id === draggedId);
    const target = objects.find(o => o.id === targetId);
    if (!dragged || !target) return false;
    const key1 = `${dragged.label}+${target.label}`;
    const key2 = `${target.label}+${dragged.label}`;
    const combo = COMBOS[key1] || COMBOS[key2];
    if (combo) {
      setComboMsg(`${combo.emoji} ${combo.label}`);
      setShowCombo(true);
      combo.sound();
      vib([80, 40, 80]);
      setTimeout(() => setShowCombo(false), 2500);
      setToqwowMood('dance');
      setTimeout(() => setToqwowMood('idle'), 2500);
      // Celebración de partículas
      for (let i = 0; i < 16; i++) setTimeout(() => addSparkles(r(window.innerWidth * .2, window.innerWidth * .8), r(window.innerHeight * .2, window.innerHeight * .7), PALETTE[ri(0, PALETTE.length)]), i * 60);
      return true;
    }
    return false;
  }, [objects, addSparkles]);

  /* ── Pointer events para objetos ── */
  const onObjPointerDown = useCallback((e: React.PointerEvent, id: number) => {
    if (isPainting) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingId.current = id;
    maxZ.current++;
    const obj = objects.find(o => o.id === id)!;
    const worldRect = worldRef.current!.getBoundingClientRect();
    const objX = (obj.x / 100) * worldRect.width;
    const objY = (obj.y / 100) * worldRect.height;
    dragOffset.current = { x: e.clientX - worldRect.left - objX, y: e.clientY - worldRect.top - objY };
    setObjects(prev => prev.map(o => o.id === id ? { ...o, dragging: true, zIndex: maxZ.current, scale: 1.12 } : o));
    osc(ri(400, 700), 0.12, 0.15); vib(15);
    resetIdleTimer();
  }, [objects, isPainting, resetIdleTimer]);

  const onObjPointerMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current !== id) return;
    const worldRect = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX - worldRect.left - dragOffset.current.x) / worldRect.width) * 100;
    const ny = ((e.clientY - worldRect.top - dragOffset.current.y) / worldRect.height) * 100;
    setObjects(prev => prev.map(o => o.id === id ? { ...o, x: Math.max(0, Math.min(92, nx)), y: Math.max(0, Math.min(88, ny)) } : o));
    addSparkles(e.clientX - worldRect.left, e.clientY - worldRect.top, paintColor);
  }, [addSparkles, paintColor]);

  const onObjPointerUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current !== id) return;
    draggingId.current = null;
    const worldRect = worldRef.current!.getBoundingClientRect();
    const dropX = e.clientX - worldRect.left;
    const dropY = e.clientY - worldRect.top;
    // Check if dropped on another object
    let combo = false;
    objects.forEach(other => {
      if (other.id === id || other.dragging) return;
      const ox = (other.x / 100) * worldRect.width + other.sz / 2;
      const oy = (other.y / 100) * worldRect.height + other.sz / 2;
      const dist = Math.sqrt((dropX - ox) ** 2 + (dropY - oy) ** 2);
      if (dist < other.sz * 0.8 && !combo) { combo = checkCombo(id, other.id); }
    });
    setObjects(prev => prev.map(o => o.id === id ? { ...o, dragging: false, scale: 1, reaction: combo ? 'glow' : '' } : o));
    setTimeout(() => setObjects(prev => prev.map(o => o.id === id ? { ...o, reaction: '' } : o)), 1000);
    osc(ri(300, 600), 0.18, 0.18); vib(12);
  }, [objects, checkCombo]);

  /* ── Tap sin drag ── */
  const onObjTap = useCallback((id: number, x: number, y: number) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    addSparkles(x, y, obj.color);
    osc(ri(440, 880), 0.2, 0.2); vib(18);
    setToqwowMood('happy'); setTimeout(() => setToqwowMood('idle'), 1000);
    resetIdleTimer();
  }, [objects, addSparkles, resetIdleTimer]);

  /* ── Toqwow drag ── */
  const onTqDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    toqwowDragging.current = true;
    setDraggingToqwow(true);
    const worldRect = worldRef.current!.getBoundingClientRect();
    toqwowOffset.current = { x: e.clientX - worldRect.left - (toqwowPos.x / 100) * worldRect.width, y: e.clientY - worldRect.top - (toqwowPos.y / 100) * worldRect.height };
    chord([523, 659, 784]);
    resetIdleTimer();
  }, [toqwowPos, resetIdleTimer]);

  const onTqMove = useCallback((e: React.PointerEvent) => {
    if (!toqwowDragging.current) return;
    const worldRect = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX - worldRect.left - toqwowOffset.current.x) / worldRect.width) * 100;
    const ny = ((e.clientY - worldRect.top - toqwowOffset.current.y) / worldRect.height) * 100;
    setToqwowPos({ x: Math.max(2, Math.min(85, nx)), y: Math.max(5, Math.min(85, ny)) });
    setToqwowMood('dance');
    if (Math.random() < 0.3) addSparkles(e.clientX - worldRect.left, e.clientY - worldRect.top, '#B8A9FF');
  }, [addSparkles]);

  const onTqUp = useCallback((e: React.PointerEvent) => {
    toqwowDragging.current = false;
    setDraggingToqwow(false);
    setToqwowMood('happy');
    setTimeout(() => setToqwowMood('idle'), 1500);
    chord([784, 1047, 1319]);
    vib([30, 15, 30]);
  }, []);

  /* ── World pointer events (painting) ── */
  const onWorldDown = useCallback((e: React.PointerEvent) => {
    if (draggingId.current !== null || toqwowDragging.current) return;
    if (isPainting) {
      painting.current = true;
      lastPaint.current = null;
      paint(e.clientX, e.clientY);
    }
    resetIdleTimer();
  }, [isPainting, paint, resetIdleTimer]);

  const onWorldMove = useCallback((e: React.PointerEvent) => {
    if (painting.current && isPainting) paint(e.clientX, e.clientY);
  }, [isPainting, paint]);

  const onWorldUp = useCallback(() => {
    painting.current = false;
    lastPaint.current = null;
  }, []);

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    osc(200, 0.4, 0.2); vib(30);
  };

  const tqStyle: Record<string, string> = {
    idle: 'tFloat 3.5s ease-in-out infinite',
    happy: 'tqHappy .4s ease-in-out 3',
    dance: 'tqDance .35s ease-in-out infinite alternate',
    wave: 'tqWave .5s ease-in-out 4',
  };

  return (
    <div
      ref={worldRef}
      onPointerDown={onWorldDown}
      onPointerMove={onWorldMove}
      onPointerUp={onWorldUp}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: bgColor, cursor: isPainting ? 'crosshair' : 'default', fontFamily: 'system-ui,sans-serif', touchAction: 'none' }}
    >
      {/* Canvas de pintura */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* Estrellas fijas de fondo */}
      {bgStars.map(s => (
        <div key={s.id} style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: s.sz, height: s.sz, background: s.id % 7 === 0 ? PALETTE[s.id % PALETTE.length] : 'white', opacity: s.opacity, top: `${s.y}%`, left: `${s.x}%`, animation: `tw${s.twinkle} ${r(2, 5)}s ${r(0, 4)}s infinite`, zIndex: 1 }} />
      ))}

      {/* UI top */}
      <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', zIndex: 40 }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 50, padding: '8px 16px', fontSize: 13, color: 'white', cursor: 'pointer' }}>← Inicio</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: 1 }}>🌍 Planeta Tiqui</div>
        <button onClick={() => { setShowPalette(v => !v); setIsPainting(v => !v); }} style={{ background: isPainting ? paintColor : 'rgba(255,255,255,.1)', border: `2px solid ${isPainting ? 'white' : 'rgba(255,255,255,.2)'}`, borderRadius: 50, padding: '8px 16px', fontSize: 13, color: 'white', cursor: 'pointer', fontWeight: isPainting ? 700 : 400 }}>
          {isPainting ? '🎨 Pintando' : '🖌️ Pintar'}
        </button>
      </div>

      {/* Paleta de colores */}
      {showPalette && (
        <div style={{ position: 'absolute', top: 60, right: 14, zIndex: 41, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 160 }}>
            {PALETTE.map(c => (
              <div key={c} onClick={() => { setPaintColor(c); }} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: paintColor === c ? '3px solid white' : '2px solid rgba(255,255,255,.3)', boxShadow: paintColor === c ? '0 0 10px white' : 'none', transition: 'transform .12s', transform: paintColor === c ? 'scale(1.2)' : 'scale(1)' }} />
            ))}
          </div>
          <button onClick={clearCanvas} style={{ background: 'rgba(255,80,80,.4)', border: '1px solid rgba(255,100,100,.4)', borderRadius: 12, padding: '6px 10px', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🗑️ Borrar todo</button>
        </div>
      )}

      {/* Objetos arrastrables */}
      {objects.map(obj => (
        <div
          key={obj.id}
          onPointerDown={e => onObjPointerDown(e, obj.id)}
          onPointerMove={e => onObjPointerMove(e, obj.id)}
          onPointerUp={e => onObjPointerUp(e, obj.id)}
          onClick={() => !obj.dragging && onObjTap(obj.id, (obj.x / 100) * (worldRef.current?.offsetWidth || 800) + obj.sz / 2, (obj.y / 100) * (worldRef.current?.offsetHeight || 600) + obj.sz / 2)}
          style={{
            position: 'absolute', left: `${obj.x}%`, top: `${obj.y}%`,
            fontSize: obj.sz, cursor: obj.dragging ? 'grabbing' : 'grab',
            lineHeight: 1, zIndex: obj.zIndex + 3, touchAction: 'none',
            transform: `scale(${obj.scale}) rotate(${obj.rotation}deg)`,
            transition: obj.dragging ? 'none' : 'transform .2s',
            filter: obj.dragging ? `drop-shadow(0 8px 20px ${obj.color})` : obj.reaction === 'glow' ? `drop-shadow(0 0 20px white)` : `drop-shadow(0 2px 8px ${obj.color}55)`,
            animation: obj.dragging ? 'none' : `objFloat${(obj.id) % 5} ${3 + (obj.id % 4) * .4}s ease-in-out infinite`,
            userSelect: 'none',
          }}
          title={obj.label}
        >{obj.emoji}</div>
      ))}

      {/* TOQWOW — arrastrable */}
      <div
        onPointerDown={onTqDown}
        onPointerMove={onTqMove}
        onPointerUp={onTqUp}
        style={{
          position: 'absolute',
          left: `${toqwowPos.x}%`, top: `${toqwowPos.y}%`,
          width: 'min(140px,24vw)', cursor: draggingToqwow ? 'grabbing' : 'grab',
          zIndex: 30, touchAction: 'none',
          filter: `drop-shadow(0 0 ${draggingToqwow ? '32px' : '20px'} rgba(184,169,255,${draggingToqwow ? 1 : .8}))`,
          animation: tqStyle[toqwowMood],
          transform: draggingToqwow ? 'scale(1.15)' : 'scale(1)',
          transition: draggingToqwow ? 'none' : 'filter .2s, transform .2s',
          userSelect: 'none',
        }}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={140} height={175} style={{ objectFit: 'contain', width: '100%', height: 'auto', mixBlendMode: 'screen', pointerEvents: 'none' }} priority />
      </div>

      {/* Combo message */}
      {showCombo && (
        <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)', zIndex: 50, textAlign: 'center', animation: 'comboIn .4s ease-out' }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{comboMsg.split(' ')[0]}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFD700', textShadow: '0 0 20px rgba(255,200,0,.9)', background: 'rgba(0,0,0,.5)', borderRadius: 20, padding: '8px 20px', backdropFilter: 'blur(8px)' }}>{comboMsg.split(' ').slice(1).join(' ')}</div>
        </div>
      )}

      {/* Sparkles */}
      {sparkles.map(s => <div key={s.id} style={{ position: 'absolute', left: s.x, top: s.y, width: 8, height: 8, borderRadius: '50%', background: s.color, pointerEvents: 'none', zIndex: 25, animation: 'sparkleOut .8s ease-out forwards' }} />)}
      {bubbles.map(b => <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.sz, height: b.sz, borderRadius: '50%', background: b.color, opacity: .7, pointerEvents: 'none', zIndex: 24, animation: 'riseB 1.6s ease-out forwards' }} />)}

      {/* Hint pintura */}
      {isPainting && <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.55)', fontSize: 12, pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap', background: 'rgba(0,0,0,.3)', padding: '6px 14px', borderRadius: 20 }}>🖌️ Arrastrá el dedo para pintar el espacio</div>}
      {!isPainting && <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.32)', fontSize: 11, pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap' }}>⬆️ Arrastrá los objetos · Toqwow también se mueve · ¡Combinalos!</div>}

      <style>{`
        @keyframes tw0{0%,100%{opacity:.15}50%{opacity:.95}} @keyframes tw1{0%,100%{opacity:.75}50%{opacity:.1}} @keyframes tw2{0%,100%{opacity:.45}33%{opacity:.9}66%{opacity:.1}} @keyframes tw3{0%,100%{opacity:.6}50%{opacity:.12}} @keyframes tw4{0%,100%{opacity:.3}50%{opacity:.85}}
        @keyframes tFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1)}}
        @keyframes tqHappy{0%{transform:scale(1)}50%{transform:scale(1.2) rotate(8deg)}100%{transform:scale(1)}}
        @keyframes tqDance{0%{transform:rotate(-12deg) scale(1.12)}100%{transform:rotate(12deg) scale(1.12)}}
        @keyframes tqWave{0%,100%{transform:rotate(0deg)}25%{transform:rotate(15deg) scale(1.08)}75%{transform:rotate(-15deg) scale(1.08)}}
        @keyframes objFloat0{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(3deg)}}
        @keyframes objFloat1{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04)}}
        @keyframes objFloat2{0%,100%{transform:translateX(0)}25%{transform:translateX(6px)}75%{transform:translateX(-6px)}}
        @keyframes objFloat3{0%,100%{transform:rotate(0deg)}50%{transform:rotate(8deg)}}
        @keyframes objFloat4{0%,100%{transform:translateY(0) translateX(0)}33%{transform:translateY(-5px) translateX(4px)}66%{transform:translateY(-3px) translateX(-4px)}}
        @keyframes sparkleOut{0%{transform:scale(0);opacity:1}60%{transform:scale(1.5);opacity:.8}100%{transform:scale(2);opacity:0}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0)}100%{opacity:0;transform:translateY(-120px) scale(.1)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.5)}60%{opacity:1;transform:translateX(-50%) scale(1.15)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
