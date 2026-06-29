'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══════════════════════════════════════════════
   🎵 AUDIO ENGINE
══════════════════════════════════════════════ */
let AC: AudioContext | null = null;
const ac = () => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const sweep = (f1: number, f2: number, d = 0.5, v = 0.2) => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.4, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

/* ══════════════════════════════════════════════
   🎨 PAINT ENGINE CONFIG
══════════════════════════════════════════════ */
type BrushType = 'round' | 'flat' | 'fan' | 'splatter' | 'glow' | 'rainbow' | 'eraser' | 'stamp';
type BrushDef = { id: BrushType; icon: string; label: string; cursor: string };
const BRUSHES: BrushDef[] = [
  { id: 'round',    icon: '⚫', label: 'Redondo',   cursor: 'crosshair' },
  { id: 'flat',     icon: '▬',  label: 'Plano',     cursor: 'crosshair' },
  { id: 'fan',      icon: '🌊', label: 'Abanico',   cursor: 'crosshair' },
  { id: 'splatter', icon: '💦', label: 'Salpicado', cursor: 'crosshair' },
  { id: 'glow',     icon: '✨', label: 'Brillante', cursor: 'crosshair' },
  { id: 'rainbow',  icon: '🌈', label: 'Arcoíris',  cursor: 'crosshair' },
  { id: 'eraser',   icon: '🧹', label: 'Borrador',  cursor: 'cell' },
  { id: 'stamp',    icon: '⭐', label: 'Sello',     cursor: 'crosshair' },
];

const PALETTES = [
  { name: 'Espacio', colors: ['#B8A9FF','#00D4C8','#FFD700','#FF6B9D','#4D96FF','#7CFC00','#FF8E53','#DDA0DD','#00CED1','#FF6B6B','#FFD93D','#98FF98','#C77DFF','#87CEEB','#FFA07A'] },
  { name: 'Pastel',  colors: ['#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF','#F8C8D4','#E8D5F5','#D4F5E8','#F5EBD4','#D4E8F5','#F5D4F5','#D4F5D4','#F5F5D4','#D4D4F5','#F5D4D4'] },
  { name: 'Neón',    colors: ['#FF0080','#FF4500','#FFD700','#00FF41','#00D4FF','#8A2BE2','#FF1493','#FF6600','#FFFF00','#00FF00','#00FFFF','#FF00FF','#FF69B4','#7FFF00','#00BFFF'] },
  { name: 'Tierra',  colors: ['#8B4513','#D2691E','#CD853F','#DEB887','#F4A460','#228B22','#556B2F','#6B8E23','#8FBC8F','#2E8B57','#1C4587','#003366','#4B0082','#800080','#C71585'] },
];

const STAMPS = ['⭐','🌟','💫','🌙','☀️','🌈','❤️','💎','🦋','🌸','🍀','🎈','🎆','💥','🔥','❄️','🌊','🍄','🦄','🐲'];

/* ══════════════════════════════════════════════
   🏠 OBJETOS DEL MUNDO (Casa de muñecas + Espacio)
══════════════════════════════════════════════ */
type Slot = { id: string; label: string; x: number; y: number; w: number; h: number; accepts: string[]; color: string; glow: string };
type WorldObj = { id: number; emoji: string; label: string; category: string; homeX: number; homeY: number; x: number; y: number; sz: number; color: string; placed: boolean; slotId: string | null; dragging: boolean; rotation: number; scale: number; zIndex: number; sound: () => void; };
type Sticker = { id: number; emoji: string; x: number; y: number; sz: number; rotation: number };
type Particle = { id: number; x: number; y: number; e: string; vx: number; vy: number };

/* Zonas del mundo donde se pueden colocar objetos */
const SLOTS: Slot[] = [
  { id: 'sky',     label: '🌌 Cielo',        x: 5,  y: 5,  w: 90, h: 35, accepts: ['sky','planet','light'], color: 'rgba(100,150,255,.08)', glow: 'rgba(100,150,255,.3)' },
  { id: 'ground',  label: '🌍 Suelo',        x: 5,  y: 65, w: 90, h: 28, accepts: ['ground','house','creature'], color: 'rgba(100,200,100,.08)', glow: 'rgba(100,200,100,.3)' },
  { id: 'mid',     label: '🌀 Centro',       x: 20, y: 38, w: 60, h: 28, accepts: ['mid','vehicle','magic'],   color: 'rgba(200,100,255,.08)', glow: 'rgba(200,100,255,.3)' },
];

const WORLD_OBJECTS: Omit<WorldObj, 'placed' | 'slotId' | 'dragging' | 'zIndex'>[] = [
  // 🌌 SKY category
  { id:1,  emoji:'🌟', label:'Estrella Grande',  category:'sky',   homeX:2, homeY:8,  x:2,  y:8,  sz:52, color:'#FFD700', rotation:0,  scale:1, sound:()=>note(1047,0.3,0.2) },
  { id:2,  emoji:'🌙', label:'Luna Llena',        category:'sky',   homeX:2, homeY:20, x:2,  y:20, sz:56, color:'#FFFACD', rotation:0,  scale:1, sound:()=>melody([528,660,792]) },
  { id:3,  emoji:'☀️',  label:'Sol Brillante',     category:'sky',   homeX:2, homeY:33, x:2,  y:33, sz:58, color:'#FFD700', rotation:0,  scale:1, sound:()=>melody([523,659,784,880]) },
  { id:4,  emoji:'🌈', label:'Arcoíris',          category:'light', homeX:2, homeY:46, x:2,  y:46, sz:54, color:'#FF6B9D', rotation:0,  scale:1, sound:()=>melody([523,659,784,1047,1319]) },
  { id:5,  emoji:'⭐', label:'Estrella',          category:'sky',   homeX:2, homeY:58, x:2,  y:58, sz:44, color:'#FFD93D', rotation:0,  scale:1, sound:()=>note(880,0.2,0.2) },
  { id:6,  emoji:'💫', label:'Destellos',         category:'magic', homeX:2, homeY:70, x:2,  y:70, sz:48, color:'#C77DFF', rotation:0,  scale:1, sound:()=>sweep(600,1200,0.3) },
  { id:7,  emoji:'🌠', label:'Meteorito',         category:'sky',   homeX:2, homeY:82, x:2,  y:82, sz:46, color:'#FF8E53', rotation:-30,scale:1, sound:()=>sweep(800,200,0.4) },
  // 🚀 VEHICLE category
  { id:8,  emoji:'🚀', label:'Cohete',            category:'vehicle',homeX:85,y:8,  homeY:8, x:85, sz:54, color:'#4D96FF', rotation:-15,scale:1, sound:()=>sweep(200,800,0.5) },
  { id:9,  emoji:'🛸', label:'Ovni',              category:'vehicle',homeX:85,y:20, homeY:20,x:85, sz:58, color:'#6BCB77', rotation:0,  scale:1, sound:()=>{ sweep(300,600,0.2); setTimeout(()=>sweep(600,300,0.2),220); } },
  { id:10, emoji:'🛰️',  label:'Satélite',          category:'vehicle',homeX:85,y:33, homeY:33,x:85, sz:50, color:'#87CEEB', rotation:20, scale:1, sound:()=>note(370,0.3,0.2,'triangle') },
  { id:11, emoji:'☄️',  label:'Cometa',            category:'sky',   homeX:85,y:46, homeY:46,x:85, sz:50, color:'#FF8E53', rotation:-35,scale:1, sound:()=>sweep(1200,200,0.5) },
  // 🏠 HOUSE category
  { id:12, emoji:'🏠', label:'Casita',            category:'house', homeX:85,y:58, homeY:58,x:85, sz:62, color:'#FF6B9D', rotation:0,  scale:1, sound:()=>melody([523,523,659,784]) },
  { id:13, emoji:'🏰', label:'Castillo',          category:'house', homeX:85,y:70, homeY:70,x:85, sz:66, color:'#DDA0DD', rotation:0,  scale:1, sound:()=>melody([392,440,523,659,784]) },
  { id:14, emoji:'🌲', label:'Árbol',             category:'ground',homeX:85,y:82, homeY:82,x:85, sz:58, color:'#7CFC00', rotation:0,  scale:1, sound:()=>note(330,0.4,0.2) },
  // 🦄 CREATURE category
  { id:15, emoji:'🦄', label:'Unicornio',         category:'creature',homeX:45,y:2, homeY:2, x:45, sz:60, color:'#FF69B4', rotation:0, scale:1, sound:()=>melody([523,659,784,1047,1319,1568]) },
  { id:16, emoji:'🐉', label:'Dragón',            category:'creature',homeX:55,y:2, homeY:2, x:55, sz:62, color:'#FF4500', rotation:0, scale:1, sound:()=>{ note(100,0.6,0.35,'sawtooth'); setTimeout(()=>note(150,0.4,0.25,'square'),200); } },
  { id:17, emoji:'🦋', label:'Mariposa',          category:'sky',   homeX:65,y:2,  homeY:2, x:65, sz:50, color:'#FF99CC', rotation:0,  scale:1, sound:()=>{ note(880,0.2,0.18); setTimeout(()=>note(1100,0.2,0.14),120); } },
  { id:18, emoji:'🐬', label:'Delfín',            category:'mid',   homeX:75,y:2,  homeY:2, x:75, sz:54, color:'#87CEEB', rotation:0,  scale:1, sound:()=>sweep(600,1200,0.3,0.18) },
  // 🌺 PLANET category
  { id:19, emoji:'🪐', label:'Saturno',           category:'planet',homeX:45,y:90, homeY:90,x:45, sz:64, color:'#B8A9FF', rotation:0,  scale:1, sound:()=>melody([262,330,392,523]) },
  { id:20, emoji:'🌍', label:'Tierra',            category:'planet',homeX:55,y:90, homeY:90,x:55, sz:60, color:'#4D96FF', rotation:0,  scale:1, sound:()=>melody([330,415,523,659]) },
  { id:21, emoji:'🌋', label:'Volcán',            category:'ground',homeX:65,y:90, homeY:90,x:65, sz:62, color:'#FF4500', rotation:0,  scale:1, sound:()=>{ note(80,0.8,0.4,'sawtooth'); setTimeout(()=>sweep(200,800,0.4,0.2),200); } },
  { id:22, emoji:'🌊', label:'Océano',            category:'ground',homeX:75,y:90, homeY:90,x:75, sz:54, color:'#00BFFF', rotation:0,  scale:1, sound:()=>sweep(300,600,0.4,0.2) },
];

const COMBOS: Record<string, { result: string; msg: string; snd: () => void }> = {
  'sol+luna':           { result: '🌅', msg: '¡Amanecer mágico!',    snd: () => melody([440,550,660,880,1100]) },
  'estrella+planeta':   { result: '🌟🪐', msg: '¡Sistema estelar!',   snd: () => melody([523,659,784,1047,1319]) },
  'cohete+planeta':     { result: '🚀🪐', msg: '¡Misión espacial!',   snd: () => sweep(200,1200,0.8) },
  'ovni+estrella':      { result: '👽✨', msg: '¡Primer contacto!',   snd: () => melody([300,400,500,600,700]) },
  'arcoíris+sol':       { result: '🌈☀️', msg: '¡Magia del arcoíris!', snd: () => melody([523,659,784,1047,1319,1568]) },
  'unicornio+arcoíris': { result: '🦄🌈', msg: '¡Magia pura!',        snd: () => melody([784,1047,1319,1568,2093]) },
  'dragón+volcán':      { result: '🐉🌋', msg: '¡Dragón de fuego!',   snd: () => { note(80,1,0.4,'sawtooth'); setTimeout(()=>melody([523,440,392]),400); } },
  'castillo+unicornio': { result: '🏰🦄', msg: '¡El reino encantado!', snd: () => melody([392,440,523,659,784,1047]) },
  'luna+estrella':      { result: '🌙⭐', msg: '¡Noche estrellada!',  snd: () => melody([528,660,792,1056]) },
  'mariposa+flor':      { result: '🦋🌺', msg: '¡Jardín mágico!',    snd: () => melody([660,784,880,1047]) },
  'delfín+océano':      { result: '🐬🌊', msg: '¡Salto acuático!',   snd: () => sweep(400,900,0.4) },
  'cometa+luna':        { result: '💥🌙', msg: '¡Impacto lunar!',     snd: () => { note(100,0.5,0.4,'sawtooth'); setTimeout(()=>melody([523,659,784]),300); } },
};

const r = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 2000;

export default function Mundo0() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  /* ── State ── */
  const [objects, setObjects] = useState<WorldObj[]>(() =>
    WORLD_OBJECTS.map(o => ({ ...o, placed: false, slotId: null, dragging: false, zIndex: o.id }))
  );
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [brush, setBrush] = useState<BrushType>('round');
  const [brushSize, setBrushSize] = useState(18);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [color, setColor] = useState('#B8A9FF');
  const [opacity, setOpacity] = useState(0.6);
  const [stampIdx, setStampIdx] = useState(0);
  const [painting, setPainting] = useState(false);
  const [tab, setTab] = useState<'objects' | 'paint' | 'stickers'>('objects');
  const [comboMsg, setComboMsg] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowPos, setToqwowPos] = useState({ x: 44, y: 62 });
  const [toqwowMood, setToqwowMood] = useState<'idle'|'happy'|'dance'|'wave'>('idle');
  const [draggingTq, setDraggingTq] = useState(false);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [showSlots, setShowSlots] = useState(false);
  const [rainbowHue, setRainbowHue] = useState(0);

  const draggingId = useRef<number | null>(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const maxZ = useRef(25);
  const isPainting = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const tqDragging = useRef(false);
  const tqOff = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const hueTick = useRef(0);

  /* ── Canvas setup ── */
  useEffect(() => {
    const c = canvasRef.current!;
    c.width = window.innerWidth; c.height = window.innerHeight;
    ctxRef.current = c.getContext('2d');
    const onR = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  /* ── Rainbow hue ticker ── */
  useEffect(() => {
    const tick = () => { hueTick.current = (hueTick.current + 1.5) % 360; setRainbowHue(hueTick.current); rafRef.current = requestAnimationFrame(tick); };
    if (brush === 'rainbow') rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [brush]);

  /* ── Paint stroke ── */
  const doPaint = useCallback((cx: number, cy: number) => {
    const ctx = ctxRef.current; if (!ctx) return;
    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const x = cx - canvasRect.left, y = cy - canvasRect.top;
    const pts = lastPt.current ? [lastPt.current, { x, y }] : [{ x, y }];
    lastPt.current = { x, y };

    if (brush === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(x, y, brushSize * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    const paintColor = brush === 'rainbow' ? `hsl(${hueTick.current},100%,60%)` : color;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity;

    if (brush === 'round') {
      ctx.fillStyle = paintColor;
      const [p0, p1] = pts;
      if (p1) {
        const dx = p1.x - p0.x, dy = p1.y - p0.y, dist = Math.sqrt(dx*dx+dy*dy);
        for (let i = 0; i <= dist; i += 4) {
          const px = p0.x + dx*(i/dist), py = p0.y + dy*(i/dist);
          ctx.beginPath(); ctx.arc(px, py, brushSize/2, 0, Math.PI*2); ctx.fill();
        }
      } else { ctx.beginPath(); ctx.arc(x, y, brushSize/2, 0, Math.PI*2); ctx.fill(); }
    }
    else if (brush === 'flat') {
      ctx.strokeStyle = paintColor; ctx.lineWidth = brushSize * 0.4; ctx.lineCap = 'square';
      ctx.beginPath(); if (pts[1]) { ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); } else { ctx.moveTo(x-4, y); ctx.lineTo(x+4, y); } ctx.stroke();
    }
    else if (brush === 'fan') {
      ctx.fillStyle = paintColor;
      for (let i = 0; i < 7; i++) {
        const angle = (i/6) * Math.PI - Math.PI/2;
        const ex = x + Math.cos(angle) * brushSize, ey = y + Math.sin(angle) * brushSize;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineWidth = 1.5; ctx.strokeStyle = paintColor; ctx.stroke();
      }
    }
    else if (brush === 'splatter') {
      for (let i = 0; i < 12; i++) {
        const a = r(0, Math.PI*2), d = r(0, brushSize*1.8), sz = r(1, brushSize*0.35);
        ctx.fillStyle = paintColor;
        ctx.globalAlpha = opacity * r(0.3, 1);
        ctx.beginPath(); ctx.arc(x+Math.cos(a)*d, y+Math.sin(a)*d, sz, 0, Math.PI*2); ctx.fill();
      }
    }
    else if (brush === 'glow') {
      const grad = ctx.createRadialGradient(x,y,0,x,y,brushSize*1.4);
      grad.addColorStop(0, paintColor); grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = opacity * 0.6;
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, brushSize*1.4, 0, Math.PI*2); ctx.fill();
    }
    else if (brush === 'rainbow') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `hsl(${(hueTick.current + i*30) % 360},100%,60%)`;
        ctx.globalAlpha = opacity * 0.5;
        const off = (i - 2) * brushSize * 0.4;
        ctx.beginPath(); ctx.arc(x + off, y, brushSize * 0.35, 0, Math.PI*2); ctx.fill();
      }
    }
    else if (brush === 'stamp') {
      ctx.font = `${brushSize * 1.6}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = opacity;
      ctx.fillText(STAMPS[stampIdx], x, y);
    }
    note(ri(350, 750), 0.06, 0.04);
  }, [brush, brushSize, color, opacity, stampIdx]);

  /* ── Check combo ── */
  const checkCombo = useCallback((aLabel: string, bLabel: string) => {
    const k1 = `${aLabel}+${bLabel}`, k2 = `${bLabel}+${aLabel}`;
    const combo = COMBOS[k1] || COMBOS[k2];
    if (combo) {
      setComboMsg(`${combo.result} ${combo.msg}`);
      setShowCombo(true); combo.snd(); vib([80,40,80,40]);
      setTimeout(() => setShowCombo(false), 3000);
      setToqwowMood('dance'); setTimeout(() => setToqwowMood('idle'), 2500);
      for (let i = 0; i < 20; i++) setTimeout(() => {
        const pe: Particle[] = Array.from({length:4}, () => ({ id:uid++, x:r(window.innerWidth*.1,window.innerWidth*.9), y:r(window.innerHeight*.1,window.innerHeight*.8), e:['✨','🌟','💫','🎉','⭐'][ri(0,5)], vx:r(-2,2), vy:r(-3,-1) }));
        setParticles(p => [...p, ...pe]);
        setTimeout(() => setParticles(p => p.filter(pp => !pe.find(x => x.id===pp.id))), 900);
      }, i*80);
    }
    return !!combo;
  }, []);

  /* ── Object drag ── */
  const onObjDown = useCallback((e: React.PointerEvent, id: number) => {
    if (tab !== 'objects') return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const obj = objects.find(o => o.id===id)!;
    const ox = (obj.x/100)*wr.width, oy = (obj.y/100)*wr.height;
    dragOff.current = { x: e.clientX-wr.left-ox, y: e.clientY-wr.top-oy };
    setObjects(prev => prev.map(o => o.id===id ? { ...o, dragging:true, zIndex:maxZ.current, scale:1.15, placed:false, slotId:null } : o));
    note(ri(400,700), 0.12, 0.15); vib(15);
    setShowSlots(true);
  }, [objects, tab]);

  const onObjMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current!==id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setObjects(prev => prev.map(o => o.id===id ? { ...o, x:Math.max(0,Math.min(92,nx)), y:Math.max(0,Math.min(88,ny)) } : o));
    // Detect hover slot
    const px = e.clientX-wr.left, py = e.clientY-wr.top;
    const found = SLOTS.find(s => px > (s.x/100)*wr.width && px < ((s.x+s.w)/100)*wr.width && py > (s.y/100)*wr.height && py < ((s.y+s.h)/100)*wr.height);
    setHoverSlot(found?.id || null);
  }, []);

  const onObjUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current!==id) return;
    draggingId.current = null; setShowSlots(false); setHoverSlot(null);
    const obj = objects.find(o => o.id===id)!;
    const wr = worldRef.current!.getBoundingClientRect();
    const px = e.clientX-wr.left, py = e.clientY-wr.top;

    // Check slot placement
    const slot = SLOTS.find(s => {
      const inX = px > (s.x/100)*wr.width && px < ((s.x+s.w)/100)*wr.width;
      const inY = py > (s.y/100)*wr.height && py < ((s.y+s.h)/100)*wr.height;
      return inX && inY && s.accepts.includes(obj.category);
    });

    if (slot) {
      // Placed in valid slot — snap and celebrate
      setObjects(prev => prev.map(o => o.id===id ? { ...o, dragging:false, scale:1, placed:true, slotId:slot.id } : o));
      note(ri(600,900), 0.25, 0.25); vib([30,15,30]);
      setToqwowMood('happy'); setTimeout(() => setToqwowMood('idle'), 1500);
      // Check combos with neighbors in same slot
      objects.filter(o => o.slotId===slot.id && o.id!==id && o.placed).forEach(neighbor => {
        checkCombo(obj.label.toLowerCase(), neighbor.label.toLowerCase());
      });
    } else if (!slot) {
      // Free placement — stays where dropped
      setObjects(prev => prev.map(o => o.id===id ? { ...o, dragging:false, scale:1 } : o));
      note(ri(300,500), 0.15, 0.12); vib(10);
    }
  }, [objects, checkCombo]);

  /* ── Toqwow drag ── */
  const onTqDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    tqDragging.current = true; setDraggingTq(true);
    const wr = worldRef.current!.getBoundingClientRect();
    tqOff.current = { x: e.clientX-wr.left-(toqwowPos.x/100)*wr.width, y: e.clientY-wr.top-(toqwowPos.y/100)*wr.height };
    melody([523,659,784]); vib(20);
  }, [toqwowPos]);

  const onTqMove = useCallback((e: React.PointerEvent) => {
    if (!tqDragging.current) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-tqOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-tqOff.current.y)/wr.height)*100;
    setToqwowPos({ x:Math.max(2,Math.min(84,nx)), y:Math.max(5,Math.min(82,ny)) });
    setToqwowMood('dance');
  }, []);

  const onTqUp = useCallback(() => {
    tqDragging.current = false; setDraggingTq(false);
    setToqwowMood('happy'); setTimeout(() => setToqwowMood('idle'), 1500);
    melody([784,1047,1319]); vib([25,12,25]);
  }, []);

  /* ── World pointer (paint) ── */
  const onWDown = useCallback((e: React.PointerEvent) => {
    if (tab !== 'paint') return;
    isPainting.current = true; lastPt.current = null;
    doPaint(e.clientX, e.clientY);
  }, [tab, doPaint]);

  const onWMove = useCallback((e: React.PointerEvent) => {
    if (tab==='paint' && isPainting.current) doPaint(e.clientX, e.clientY);
  }, [tab, doPaint]);

  const onWUp = useCallback(() => { isPainting.current = false; lastPt.current = null; }, []);

  /* ── Sticker tap ── */
  const onWorldTap = useCallback((e: React.PointerEvent) => {
    if (tab!=='stickers') return;
    const wr = worldRef.current!.getBoundingClientRect();
    const x = ((e.clientX-wr.left)/wr.width)*100;
    const y = ((e.clientY-wr.top)/wr.height)*100;
    const s: Sticker = { id:uid++, emoji:STAMPS[stampIdx], x, y, sz:ri(28,52), rotation:r(-20,20) };
    setStickers(prev => [...prev, s]);
    note(ri(600,1200), 0.2, 0.18); vib(15);
  }, [tab, stampIdx]);

  const clearCanvas = () => { const ctx = ctxRef.current; if (ctx) ctx.clearRect(0,0,canvasRef.current!.width,canvasRef.current!.height); note(200,0.3,0.2); vib(30); };
  const resetObjects = () => { setObjects(prev => prev.map(o => ({...o, x:o.homeX, y:o.homeY, placed:false, slotId:null, dragging:false, scale:1 }))); setStickers([]); clearCanvas(); };

  const tqAnims: Record<string, string> = {
    idle: 'tqFloat 3.5s ease-in-out infinite',
    happy: 'tqHappy .4s ease-in-out 3',
    dance: 'tqDance .35s ease-in-out infinite alternate',
    wave: 'tqWave .5s ease-in-out 4',
  };

  const currentPalette = PALETTES[paletteIdx];

  return (
    <div ref={worldRef}
      onPointerDown={e => { onWDown(e); if (tab==='stickers') onWorldTap(e); }}
      onPointerMove={onWMove} onPointerUp={onWUp}
      style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative', touchAction:'none', fontFamily:'system-ui,sans-serif',
        background:'linear-gradient(180deg,#02030f 0%,#06093a 30%,#08285a 62%,#063550 100%)',
        cursor: tab==='paint' ? (brush==='eraser'?'cell':'crosshair') : tab==='stickers'?'copy':'default' }}>

      {/* Paint canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none' }}/>

      {/* BG Stars */}
      {useMemo(() => Array.from({length:110},(_,i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%', pointerEvents:'none', zIndex:1,
          width:`${r(1,i%5===0?4:2.5)}px`, height:`${r(1,i%5===0?4:2.5)}px`,
          background:i%7===0?['#B8A9FF','#00D4C8','#FFD700','#FF6B9D'][i%4]:'white',
          opacity:r(.1,.9), top:`${r(0,92)}%`, left:`${r(0,100)}%`,
          animation:`tw${i%4} ${r(2,5)}s ${r(0,4)}s infinite` }}/>
      )), [])}

      {/* Slot zones (visible when dragging) */}
      {showSlots && SLOTS.map(s => (
        <div key={s.id} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, width:`${s.w}%`, height:`${s.h}%`, zIndex:3, pointerEvents:'none',
          border: `2px dashed ${hoverSlot===s.id ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)'}`,
          background: hoverSlot===s.id ? s.glow : s.color, borderRadius:16, transition:'all .2s',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:18, fontWeight:700, color:'rgba(255,255,255,.6)', letterSpacing:2, pointerEvents:'none' }}>{s.label}</span>
        </div>
      ))}

      {/* World objects */}
      {objects.map(obj => (
        <div key={obj.id}
          onPointerDown={e => onObjDown(e, obj.id)}
          onPointerMove={e => onObjMove(e, obj.id)}
          onPointerUp={e => onObjUp(e, obj.id)}
          style={{ position:'absolute', left:`${obj.x}%`, top:`${obj.y}%`, fontSize:obj.sz, lineHeight:1, touchAction:'none', userSelect:'none',
            zIndex: obj.dragging ? 50 : obj.placed ? obj.zIndex+2 : obj.zIndex,
            cursor: obj.dragging ? 'grabbing' : (tab==='objects'?'grab':'default'),
            transform:`scale(${obj.scale}) rotate(${obj.rotation}deg)`,
            transition: obj.dragging ? 'none' : 'transform .2s, filter .2s',
            filter: obj.dragging ? `drop-shadow(0 12px 28px ${obj.color}) drop-shadow(0 0 20px white)` : obj.placed ? `drop-shadow(0 0 14px ${obj.color})` : `drop-shadow(0 2px 6px ${obj.color}66)`,
            animation: obj.dragging ? 'none' : `objF${obj.id%6} ${3+obj.id*.15}s ${obj.id*.1}s ease-in-out infinite`,
            pointerEvents: tab==='objects' ? 'auto' : 'none',
          }}
          title={obj.label}
        >{obj.emoji}</div>
      ))}

      {/* Stickers */}
      {stickers.map(s => (
        <div key={s.id} onClick={() => setStickers(prev => prev.filter(x => x.id!==s.id))}
          style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, fontSize:s.sz, lineHeight:1, userSelect:'none', zIndex:8, cursor:'pointer', transform:`rotate(${s.rotation}deg)`, transition:'transform .15s' }}
          onMouseEnter={e=>(e.currentTarget.style.transform=`rotate(${s.rotation}deg) scale(1.3)`)}
          onMouseLeave={e=>(e.currentTarget.style.transform=`rotate(${s.rotation}deg) scale(1)`)}
        >{s.emoji}</div>
      ))}

      {/* Particles */}
      {particles.map(p => <div key={p.id} style={{ position:'absolute', left:p.x, top:p.y, fontSize:ri(20,32), pointerEvents:'none', zIndex:26, lineHeight:1, animation:'burstP 1s ease-out forwards' }}>{p.e}</div>)}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{ position:'absolute', left:`${toqwowPos.x}%`, top:`${toqwowPos.y}%`,
          width:'min(130px,22vw)', cursor:draggingTq?'grabbing':'grab', zIndex:20, touchAction:'none',
          filter:`drop-shadow(0 0 ${draggingTq?'36px':'22px'} rgba(184,169,255,${draggingTq?1:.85}))`,
          animation: tqAnims[toqwowMood],
          transform:draggingTq?'scale(1.18)':'scale(1)', transition:'filter .2s, transform .2s' }}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={130} height={165}
          style={{ objectFit:'contain', width:'100%', height:'auto', mixBlendMode:'screen', pointerEvents:'none' }} priority/>
      </div>

      {/* Combo message */}
      {showCombo && (
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)', zIndex:55, textAlign:'center', animation:'comboIn .4s ease-out', pointerEvents:'none' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'white', background:'rgba(0,0,0,.65)', borderRadius:24, padding:'14px 28px', backdropFilter:'blur(14px)', boxShadow:'0 0 40px rgba(184,169,255,.6)', lineHeight:1.5 }}>
            {comboMsg}
          </div>
        </div>
      )}

      {/* ══ TOOLBAR BOTTOM ══ */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:60, background:'rgba(4,6,28,.92)', backdropFilter:'blur(16px)', borderTop:'1px solid rgba(255,255,255,.1)', padding:'10px 12px 14px' }}>

        {/* Tab selector */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:10 }}>
          {[
            { id:'objects', icon:'🪐', label:'Objetos' },
            { id:'paint',   icon:'🎨', label:'Pintar' },
            { id:'stickers',icon:'⭐', label:'Sellos' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ background: tab===t.id ? 'rgba(184,169,255,.35)' : 'rgba(255,255,255,.07)', border: tab===t.id ? '2px solid rgba(184,169,255,.8)' : '1px solid rgba(255,255,255,.15)', borderRadius:50, padding:'7px 18px', fontSize:13, fontWeight:tab===t.id?700:400, color:'white', cursor:'pointer', transition:'all .2s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Objects tab */}
        {tab==='objects' && (
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, alignItems:'center' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap', minWidth:60 }}>⬆️ Arrastrá al mundo</div>
            <div style={{ display:'flex', gap:8, flex:1, overflowX:'auto' }}>
              {objects.map(o => (
                <div key={o.id} style={{ fontSize:o.placed?28:32, opacity:o.placed?.5:1, filter:o.placed?'grayscale(1)':'none', transition:'all .2s', flexShrink:0 }} title={`${o.label}${o.placed?' (colocado)':''}`}>{o.emoji}</div>
              ))}
            </div>
            <button onClick={resetObjects} style={{ background:'rgba(255,80,80,.25)', border:'1px solid rgba(255,100,100,.4)', borderRadius:12, padding:'6px 12px', color:'white', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>🔄 Reiniciar</button>
          </div>
        )}

        {/* Paint tab */}
        {tab==='paint' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {/* Palette selector */}
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', whiteSpace:'nowrap' }}>Paleta:</div>
              {PALETTES.map((p,i) => (
                <button key={i} onClick={() => setPaletteIdx(i)}
                  style={{ fontSize:11, background:paletteIdx===i?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)', border:paletteIdx===i?'1.5px solid white':'1px solid rgba(255,255,255,.2)', borderRadius:20, padding:'3px 10px', color:'white', cursor:'pointer' }}>{p.name}</button>
              ))}
              <button onClick={clearCanvas} style={{ marginLeft:'auto', background:'rgba(255,80,80,.25)', border:'1px solid rgba(255,100,100,.4)', borderRadius:12, padding:'4px 10px', color:'white', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>🗑️ Borrar</button>
            </div>
            {/* Colors */}
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {currentPalette.colors.map(c => (
                <div key={c} onClick={() => setColor(c)}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border:color===c?'3px solid white':'2px solid rgba(255,255,255,.25)', transform:color===c?'scale(1.25)':'scale(1)', transition:'transform .12s', boxShadow:color===c?`0 0 10px ${c}`:'none' }}/>
              ))}
            </div>
            {/* Brushes */}
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>Pincel:</div>
              {BRUSHES.map(b => (
                <button key={b.id} onClick={() => setBrush(b.id)}
                  style={{ background:brush===b.id?'rgba(184,169,255,.35)':'rgba(255,255,255,.07)', border:brush===b.id?'2px solid rgba(184,169,255,.8)':'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:'4px 10px', fontSize:13, color:'white', cursor:'pointer', title:b.label }}
                  title={b.label}>{b.icon}</button>
              ))}
              <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>Tamaño:</div>
                <input type="range" min="6" max="60" value={brushSize} onChange={e=>setBrushSize(+e.target.value)} style={{ width:80 }}/>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', minWidth:24 }}>{brushSize}</div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>Opacidad:</div>
                <input type="range" min="10" max="100" value={Math.round(opacity*100)} onChange={e=>setOpacity(+e.target.value/100)} style={{ width:70 }}/>
              </div>
            </div>
          </div>
        )}

        {/* Stickers tab */}
        {tab==='stickers' && (
          <div style={{ display:'flex', gap:8, alignItems:'center', overflowX:'auto' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap', minWidth:70 }}>Tocá el mundo ↑</div>
            {STAMPS.map((s,i) => (
              <div key={i} onClick={() => setStampIdx(i)}
                style={{ fontSize:i===stampIdx?38:30, cursor:'pointer', opacity:i===stampIdx?1:.6, transition:'all .15s', flexShrink:0,
                  filter:i===stampIdx?'drop-shadow(0 0 10px gold)':'none', transform:i===stampIdx?'scale(1.2)':'scale(1)' }}>{s}</div>
            ))}
            <button onClick={()=>setStickers([])} style={{ marginLeft:'auto', background:'rgba(255,80,80,.25)', border:'1px solid rgba(255,100,100,.4)', borderRadius:12, padding:'5px 12px', color:'white', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>🗑️ Borrar sellos</button>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', zIndex:50, background:'rgba(0,0,0,.3)', backdropFilter:'blur(8px)' }}>
        <button onClick={() => router.push('/')} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', borderRadius:50, padding:'7px 16px', fontSize:13, color:'white', cursor:'pointer' }}>← Inicio</button>
        <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.85)', letterSpacing:.5 }}>🌍 Planeta Tiqui</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', textAlign:'right' }}>
          {objects.filter(o=>o.placed).length}/{objects.length} 🏠
        </div>
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.12}50%{opacity:.95}} @keyframes tw1{0%,100%{opacity:.72}50%{opacity:.08}} @keyframes tw2{0%,100%{opacity:.45}33%{opacity:.9}66%{opacity:.08}} @keyframes tw3{0%,100%{opacity:.6}50%{opacity:.1}}
        @keyframes tqFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1)}}
        @keyframes tqHappy{0%{transform:scale(1) rotate(0deg)}33%{transform:scale(1.22) rotate(10deg)}66%{transform:scale(1.22) rotate(-10deg)}100%{transform:scale(1) rotate(0deg)}}
        @keyframes tqDance{0%{transform:rotate(-14deg) scale(1.15)}100%{transform:rotate(14deg) scale(1.15)}}
        @keyframes tqWave{0%,100%{transform:rotate(0deg) scale(1)}25%{transform:rotate(18deg) scale(1.1)}75%{transform:rotate(-18deg) scale(1.1)}}
        @keyframes objF0{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-9px) rotate(4deg)}}
        @keyframes objF1{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.05)}}
        @keyframes objF2{0%,100%{transform:translateX(0)}25%{transform:translateX(8px)}75%{transform:translateX(-8px)}}
        @keyframes objF3{0%,100%{transform:rotate(0deg)}50%{transform:rotate(10deg)}}
        @keyframes objF4{0%,100%{transform:translateY(0) translateX(0)}33%{transform:translateY(-6px) translateX(5px)}66%{transform:translateY(-3px) translateX(-5px)}}
        @keyframes objF5{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.06) rotate(3deg)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.3) translateY(0) rotate(0)}100%{opacity:0;transform:scale(2) translateY(-90px) rotate(200deg)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.4)}60%{opacity:1;transform:translateX(-50%) scale(1.12)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
