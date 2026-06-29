'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {} };
const melody = (fs: number[], gap = 90) => fs.forEach((f, i) => setTimeout(() => note(f, 0.35, 0.18), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };
const r = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 3000;

/* ══ CASA DE MUÑECAS ESPACIAL ══
   Habitaciones como zonas + muebles arrastrables + personajes */

type Room = { id: string; label: string; emoji: string; x: number; y: number; w: number; h: number; bg: string; border: string };
type Furniture = { id: number; emoji: string; label: string; room: string; x: number; y: number; sz: number; color: string; placed: boolean; dragging: boolean; zIndex: number; rotation: number };
type Character = { id: number; emoji: string; name: string; x: number; y: number; mood: string; dragging: boolean; zIndex: number };
type Particle = { id: number; x: number; y: number; e: string };

const ROOMS: Room[] = [
  { id: 'living',  label: '🛋️ Sala',      emoji: '🛋️', x: 5,  y: 15, w: 42, h: 35, bg: 'rgba(180,120,255,.1)', border: 'rgba(180,120,255,.4)' },
  { id: 'kitchen', label: '🍕 Cocina',     emoji: '🍕', x: 53, y: 15, w: 42, h: 35, bg: 'rgba(255,180,80,.1)',  border: 'rgba(255,180,80,.45)' },
  { id: 'garden',  label: '🌺 Jardín',     emoji: '🌺', x: 5,  y: 57, w: 42, h: 35, bg: 'rgba(80,220,80,.08)', border: 'rgba(80,220,80,.4)' },
  { id: 'space',   label: '🚀 Cuarto Espacial', emoji: '🚀', x: 53, y: 57, w: 42, h: 35, bg: 'rgba(80,160,255,.08)', border: 'rgba(80,160,255,.4)' },
];

const FURNITURE_DEFS: Omit<Furniture, 'placed' | 'dragging' | 'zIndex'>[] = [
  // Living room
  { id:1,  emoji:'🛋️', label:'sofá',      room:'living',  x:2,  y:18, sz:54, color:'#C77DFF', rotation:0 },
  { id:2,  emoji:'📺', label:'tele',       room:'living',  x:2,  y:30, sz:48, color:'#4D96FF', rotation:0 },
  { id:3,  emoji:'🪴', label:'planta',     room:'living',  x:2,  y:42, sz:44, color:'#7CFC00', rotation:0 },
  { id:4,  emoji:'🎮', label:'juego',      room:'living',  x:2,  y:54, sz:42, color:'#FF6B9D', rotation:0 },
  { id:5,  emoji:'🎵', label:'música',     room:'living',  x:2,  y:65, sz:42, color:'#FFD700', rotation:0 },
  // Kitchen
  { id:6,  emoji:'🍕', label:'pizza',      room:'kitchen', x:95, y:18, sz:48, color:'#FF8E53', rotation:0 },
  { id:7,  emoji:'🎂', label:'torta',      room:'kitchen', x:95, y:30, sz:50, color:'#FF6B9D', rotation:0 },
  { id:8,  emoji:'🍓', label:'frutillas',  room:'kitchen', x:95, y:42, sz:44, color:'#FF4444', rotation:0 },
  { id:9,  emoji:'🧁', label:'cupcake',    room:'kitchen', x:95, y:54, sz:46, color:'#DDA0DD', rotation:0 },
  { id:10, emoji:'🍦', label:'helado',     room:'kitchen', x:95, y:65, sz:48, color:'#87CEEB', rotation:0 },
  // Garden
  { id:11, emoji:'🌸', label:'flores',     room:'garden',  x:2,  y:62, sz:48, color:'#FFB7C5', rotation:0 },
  { id:12, emoji:'🦋', label:'mariposa',   room:'garden',  x:2,  y:73, sz:44, color:'#FF99CC', rotation:0 },
  { id:13, emoji:'🐝', label:'abeja',      room:'garden',  x:2,  y:82, sz:40, color:'#FFD700', rotation:0 },
  { id:14, emoji:'🌻', label:'girasol',    room:'garden',  x:2,  y:90, sz:48, color:'#FFD700', rotation:0 },
  // Space room
  { id:15, emoji:'🚀', label:'cohete',     room:'space',   x:95, y:62, sz:52, color:'#4D96FF', rotation:-15 },
  { id:16, emoji:'🌟', label:'estrella',   room:'space',   x:95, y:73, sz:48, color:'#FFD700', rotation:0 },
  { id:17, emoji:'🛸', label:'ovni',       room:'space',   x:95, y:82, sz:50, color:'#7CFC00', rotation:0 },
  { id:18, emoji:'🪐', label:'planeta',    room:'space',   x:95, y:90, sz:52, color:'#B8A9FF', rotation:0 },
];

const CHARACTERS_DEF: Omit<Character, 'dragging' | 'zIndex'>[] = [
  { id:101, emoji:'👧', name:'Luna',    x:30, y:48, mood:'happy' },
  { id:102, emoji:'👦', name:'Orión',   x:65, y:48, mood:'idle' },
  { id:103, emoji:'🐱', name:'Cosmo',   x:48, y:48, mood:'curious' },
  { id:104, emoji:'🐶', name:'Nebula',  x:14, y:48, mood:'playful' },
];

const MOODS: Record<string, string> = {
  happy: '😊', idle: '😐', curious: '🤔', playful: '😄', excited: '🤩', sleepy: '😴', love: '🥰',
};

const CHAR_SOUNDS: Record<string, () => void> = {
  '👧': () => melody([659,784,1047,1319]),
  '👦': () => melody([523,659,784,880]),
  '🐱': () => { note(800,0.15,0.2); setTimeout(()=>note(1000,0.15,0.15),160); },
  '🐶': () => { note(300,0.2,0.25,'sawtooth'); setTimeout(()=>note(380,0.15,0.2,'sawtooth'),150); },
};

const FURN_SOUNDS: Record<string, () => void> = {
  '📺': () => melody([400,500,600]),
  '🎮': () => { note(660,0.1,0.2,'square'); setTimeout(()=>note(880,0.1,0.2,'square'),100); setTimeout(()=>note(550,0.15,0.15,'square'),200); },
  '🎵': () => melody([523,659,784,1047]),
  '🍕': () => note(440,0.3,0.2),
  '🎂': () => melody([523,523,659,523,784,740]),
  '🚀': () => { note(200,0.5,0.3,'sawtooth'); setTimeout(()=>note(400,0.3,0.2),300); },
  '🪐': () => melody([262,330,392,523]),
};

export default function Mundo3() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);
  const [furniture, setFurniture] = useState<Furniture[]>(() => FURNITURE_DEFS.map(f => ({ ...f, placed: false, dragging: false, zIndex: f.id })));
  const [characters, setCharacters] = useState<Character[]>(() => CHARACTERS_DEF.map(c => ({ ...c, dragging: false, zIndex: 100 + c.id })));
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hoverRoom, setHoverRoom] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [combo, setCombo] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowPos, setToqwowPos] = useState({ x: 44, y: 42 });
  const [toqwowMood, setToqwowMood] = useState<'idle'|'happy'|'dance'>('idle');
  const [draggingTq, setDraggingTq] = useState(false);

  const draggingFurId = useRef<number | null>(null);
  const draggingCharId = useRef<number | null>(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const maxZ = useRef(200);
  const tqDragging = useRef(false);
  const tqOff = useRef({ x: 0, y: 0 });

  const addParticles = useCallback((x: number, y: number) => {
    const PARTY = ['✨','🌟','💫','❤️','🎉','🌈','💎','⭐'];
    const np: Particle[] = Array.from({ length: 8 }, () => ({ id: uid++, x: x + r(-40, 40), y: y + r(-30, 30), e: PARTY[ri(0, PARTY.length)] }));
    setParticles(p => [...p, ...np]);
    setTimeout(() => setParticles(p => p.filter(pp => !np.find(n => n.id === pp.id))), 900);
  }, []);

  const showComboMsg = useCallback((msg: string, snd: () => void) => {
    setCombo(msg); setShowCombo(true); snd(); vib([60, 30, 60]);
    setToqwowMood('dance'); setTimeout(() => { setToqwowMood('idle'); setShowCombo(false); }, 2500);
  }, []);

  /* ── Furniture drag ── */
  const onFurnDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingFurId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const f = furniture.find(f => f.id === id)!;
    dragOff.current = { x: e.clientX - wr.left - (f.x / 100) * wr.width, y: e.clientY - wr.top - (f.y / 100) * wr.height };
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, dragging: true, zIndex: maxZ.current, placed: false } : f));
    setIsDragging(true);
    note(ri(400, 700), 0.1, 0.12); vib(12);
  }, [furniture]);

  const onFurnMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingFurId.current !== id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX - wr.left - dragOff.current.x) / wr.width) * 100;
    const ny = ((e.clientY - wr.top - dragOff.current.y) / wr.height) * 100;
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, x: Math.max(0, Math.min(93, nx)), y: Math.max(0, Math.min(90, ny)) } : f));
    const px = e.clientX - wr.left, py = e.clientY - wr.top;
    const room = ROOMS.find(rm => px > (rm.x / 100) * wr.width && px < ((rm.x + rm.w) / 100) * wr.width && py > (rm.y / 100) * wr.height && py < ((rm.y + rm.h) / 100) * wr.height);
    setHoverRoom(room?.id || null);
  }, []);

  const onFurnUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingFurId.current !== id) return;
    draggingFurId.current = null; setIsDragging(false); setHoverRoom(null);
    const wr = worldRef.current!.getBoundingClientRect();
    const px = e.clientX - wr.left, py = e.clientY - wr.top;
    const room = ROOMS.find(rm => px > (rm.x / 100) * wr.width && px < ((rm.x + rm.w) / 100) * wr.width && py > (rm.y / 100) * wr.height && py < ((rm.y + rm.h) / 100) * wr.height);
    const furn = furniture.find(f => f.id === id)!;
    if (room) {
      setFurniture(prev => prev.map(f => f.id === id ? { ...f, dragging: false, placed: true } : f));
      const snd = FURN_SOUNDS[furn.emoji] || (() => note(ri(500, 900), 0.2, 0.2));
      snd(); vib([25, 12, 25]);
      addParticles(px, py);
      setToqwowMood('happy'); setTimeout(() => setToqwowMood('idle'), 1200);
      // Special combos
      const placed = furniture.filter(f => f.placed && f.id !== id);
      if (furn.emoji === '🎂' && placed.some(f => f.emoji === '🎵')) showComboMsg('🎂🎵 ¡Fiesta de cumpleaños!', () => melody([523,523,659,523,784,740,784]));
      if (furn.emoji === '🚀' && placed.some(f => f.emoji === '🪐')) showComboMsg('🚀🪐 ¡Misión al espacio!', () => { note(200,0.6,0.3,'sawtooth'); setTimeout(()=>melody([523,659,784,1047]),400); });
      if (furn.emoji === '🌸' && placed.some(f => f.emoji === '🦋')) showComboMsg('🌸🦋 ¡Jardín encantado!', () => melody([784,1047,1319,1568]));
      if (furn.emoji === '🛋️' && placed.some(f => f.emoji === '📺')) showComboMsg('🛋️📺 ¡Noche de películas!', () => melody([440,392,523,494]));
    } else {
      setFurniture(prev => prev.map(f => f.id === id ? { ...f, dragging: false } : f));
      note(ri(300, 500), 0.12, 0.1); vib(8);
    }
  }, [furniture, addParticles, showComboMsg]);

  /* ── Character drag ── */
  const onCharDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingCharId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const ch = characters.find(c => c.id === id)!;
    dragOff.current = { x: e.clientX - wr.left - (ch.x / 100) * wr.width, y: e.clientY - wr.top - (ch.y / 100) * wr.height };
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, dragging: true, zIndex: maxZ.current } : c));
    const snd = CHAR_SOUNDS[characters.find(c => c.id === id)!.emoji];
    if (snd) snd(); vib(18);
  }, [characters]);

  const onCharMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current !== id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX - wr.left - dragOff.current.x) / wr.width) * 100;
    const ny = ((e.clientY - wr.top - dragOff.current.y) / wr.height) * 100;
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, x: Math.max(0, Math.min(92, nx)), y: Math.max(8, Math.min(85, ny)) } : c));
  }, []);

  const onCharUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current !== id) return;
    draggingCharId.current = null;
    const wr = worldRef.current!.getBoundingClientRect();
    const px = e.clientX - wr.left, py = e.clientY - wr.top;
    addParticles(px, py);
    const ch = characters.find(c => c.id === id)!;
    // Character meets furniture
    const nearby = furniture.find(f => {
      const fx = (f.x / 100) * wr.width, fy = (f.y / 100) * wr.height;
      return Math.sqrt((px - fx) ** 2 + (py - fy) ** 2) < 80;
    });
    const moods = ['happy', 'excited', 'love', 'playful'];
    const newMood = nearby ? moods[ri(0, moods.length)] : ch.mood;
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, dragging: false, mood: newMood } : c));
    note(ri(600, 1100), 0.2, 0.18); vib([20, 10, 20]);
  }, [characters, furniture, addParticles]);

  /* ── Toqwow ── */
  const onTqDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId);
    tqDragging.current = true; setDraggingTq(true);
    const wr = worldRef.current!.getBoundingClientRect();
    tqOff.current = { x: e.clientX - wr.left - (toqwowPos.x / 100) * wr.width, y: e.clientY - wr.top - (toqwowPos.y / 100) * wr.height };
    melody([523, 659, 784]); vib(18);
  }, [toqwowPos]);

  const onTqMove = useCallback((e: React.PointerEvent) => {
    if (!tqDragging.current) return;
    const wr = worldRef.current!.getBoundingClientRect();
    setToqwowPos({ x: Math.max(2, Math.min(84, ((e.clientX - wr.left - tqOff.current.x) / wr.width) * 100)), y: Math.max(8, Math.min(82, ((e.clientY - wr.top - tqOff.current.y) / wr.height) * 100)) });
    setToqwowMood('dance');
  }, []);

  const onTqUp = useCallback(() => {
    tqDragging.current = false; setDraggingTq(false);
    setToqwowMood('happy'); setTimeout(() => setToqwowMood('idle'), 1500);
    melody([784, 1047, 1319]); vib([25, 12, 25]);
  }, []);

  const tqAnims: Record<string, string> = {
    idle: 'tqFloat 3.5s ease-in-out infinite',
    happy: 'tqHappy .4s ease-in-out 3',
    dance: 'tqDance .35s ease-in-out infinite alternate',
  };

  const placedCount = furniture.filter(f => f.placed).length;

  return (
    <div ref={worldRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', touchAction: 'none', fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(135deg,#1a0a2e 0%,#2d1b5e 40%,#1a2a4a 70%,#0a1a2e 100%)' }}>

      {/* Bg sparkles */}
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: `${r(1, 3)}px`, height: `${r(1, 3)}px`, background: ['#B8A9FF', '#FFD700', '#FF6B9D', '#00D4C8', 'white'][i % 5], opacity: r(.1, .7), top: `${r(0, 90)}%`, left: `${r(0, 100)}%`, animation: `tw${i % 3} ${r(2, 5)}s ${r(0, 4)}s infinite` }} />
      ))}

      {/* ROOMS */}
      {ROOMS.map(rm => (
        <div key={rm.id} style={{ position: 'absolute', left: `${rm.x}%`, top: `${rm.y}%`, width: `${rm.w}%`, height: `${rm.h}%`, borderRadius: 20, border: `2px solid ${hoverRoom === rm.id ? 'rgba(255,255,255,.7)' : rm.border}`, background: hoverRoom === rm.id ? rm.bg.replace('.1', '.25').replace('.08', '.2') : rm.bg, transition: 'all .2s', pointerEvents: 'none', zIndex: 2 }}>
          <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)', letterSpacing: 1 }}>{rm.label}</div>
        </div>
      ))}

      {/* FURNITURE */}
      {furniture.map(f => (
        <div key={f.id}
          onPointerDown={e => onFurnDown(e, f.id)}
          onPointerMove={e => onFurnMove(e, f.id)}
          onPointerUp={e => onFurnUp(e, f.id)}
          style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, fontSize: f.sz, lineHeight: 1, touchAction: 'none', userSelect: 'none', zIndex: f.dragging ? 60 : f.placed ? f.zIndex + 2 : f.zIndex, cursor: f.dragging ? 'grabbing' : 'grab', transform: `rotate(${f.rotation}deg) scale(${f.dragging ? 1.15 : f.placed ? 1 : 0.9})`, transition: f.dragging ? 'none' : 'transform .2s, filter .2s', filter: f.dragging ? `drop-shadow(0 10px 24px ${f.color}) drop-shadow(0 0 16px white)` : f.placed ? `drop-shadow(0 0 10px ${f.color})` : `drop-shadow(0 2px 6px ${f.color}55)`, animation: f.dragging ? 'none' : `fFloat${f.id % 4} ${3.5 + f.id * .2}s ease-in-out infinite` }}
        >{f.emoji}</div>
      ))}

      {/* CHARACTERS */}
      {characters.map(ch => (
        <div key={ch.id}
          onPointerDown={e => onCharDown(e, ch.id)}
          onPointerMove={e => onCharMove(e, ch.id)}
          onPointerUp={e => onCharUp(e, ch.id)}
          style={{ position: 'absolute', left: `${ch.x}%`, top: `${ch.y}%`, zIndex: ch.dragging ? 70 : ch.zIndex, touchAction: 'none', userSelect: 'none', cursor: ch.dragging ? 'grabbing' : 'grab', transform: `scale(${ch.dragging ? 1.2 : 1})`, transition: 'transform .18s', animation: ch.dragging ? 'none' : `charF${ch.id % 3} ${3 + ch.id * .3}s ease-in-out infinite` }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>{ch.emoji}</div>
          <div style={{ fontSize: 18, textAlign: 'center', marginTop: -6, lineHeight: 1 }}>{MOODS[ch.mood] || '😊'}</div>
          <div style={{ fontSize: 10, textAlign: 'center', color: 'rgba(255,255,255,.6)', fontWeight: 600, letterSpacing: .5 }}>{ch.name}</div>
        </div>
      ))}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{ position: 'absolute', left: `${toqwowPos.x}%`, top: `${toqwowPos.y}%`, width: 'min(120px,20vw)', cursor: draggingTq ? 'grabbing' : 'grab', zIndex: 30, touchAction: 'none', filter: `drop-shadow(0 0 ${draggingTq ? '30px' : '18px'} rgba(184,169,255,.85))`, animation: tqAnims[toqwowMood], transition: 'filter .2s' }}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={120} height={152} style={{ objectFit: 'contain', width: '100%', height: 'auto', mixBlendMode: 'screen', pointerEvents: 'none' }} priority />
      </div>

      {/* Particles */}
      {particles.map(p => <div key={p.id} style={{ position: 'absolute', left: p.x - 12, top: p.y - 12, fontSize: ri(18, 28), pointerEvents: 'none', zIndex: 55, lineHeight: 1, animation: 'burstP 1s ease-out forwards' }}>{p.e}</div>)}

      {/* Combo */}
      {showCombo && (
        <div style={{ position: 'absolute', top: '32%', left: '50%', transform: 'translateX(-50%)', zIndex: 65, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(14px)', borderRadius: 24, padding: '16px 28px', fontSize: 20, fontWeight: 800, color: '#FFD700', textAlign: 'center', animation: 'comboIn .4s ease-out', boxShadow: '0 0 40px rgba(255,200,0,.4)', whiteSpace: 'nowrap' }}>{combo}</div>
      )}

      {/* Progress */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', zIndex: 50, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 50, padding: '7px 16px', fontSize: 13, color: 'white', cursor: 'pointer' }}>← Inicio</button>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>🏠 Casa Galáctica</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{placedCount}/{furniture.length} colocados</div>
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,.35)', pointerEvents: 'none', zIndex: 40, whiteSpace: 'nowrap' }}>
        🏠 Arrastrá muebles a las habitaciones · Mové los personajes · ¡Buscá las combinaciones secretas!
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.12}50%{opacity:.9}} @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.08}} @keyframes tw2{0%,100%{opacity:.45}50%{opacity:.9}}
        @keyframes tqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes tqHappy{0%{transform:scale(1)}40%{transform:scale(1.2) rotate(10deg)}80%{transform:scale(1.2) rotate(-10deg)}100%{transform:scale(1)}}
        @keyframes tqDance{0%{transform:rotate(-13deg) scale(1.12)}100%{transform:rotate(13deg) scale(1.12)}}
        @keyframes fFloat0{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-7px) rotate(3deg)}}
        @keyframes fFloat1{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes fFloat2{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
        @keyframes fFloat3{0%,100%{transform:rotate(0deg)}50%{transform:rotate(6deg)}}
        @keyframes charF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes charF1{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.07) rotate(3deg)}}
        @keyframes charF2{0%,100%{transform:translateX(0)}25%{transform:translateX(6px)}75%{transform:translateX(-6px)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.3) translateY(0)}100%{opacity:0;transform:scale(2) translateY(-80px) rotate(180deg)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.4)}60%{opacity:1;transform:translateX(-50%) scale(1.1)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
