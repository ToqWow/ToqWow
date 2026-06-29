'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let AC: AudioContext | null = null;
const ac = () => { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); return AC; };
const osc = (f: number, d = 0.35, v = 0.28, t: OscillatorType = 'sine') => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {} };
const sweep = (f1: number, f2: number, d = 0.4, v = 0.28) => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {} };
const chord = (fs: number[], gap = 80, d = 0.4, v = 0.2) => fs.forEach((f, i) => setTimeout(() => osc(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

const DINOS = [
  { e: '🦕', nm: 'Bronto',   x: 12, y: 18, sz: 70, pts: 3, c: '#7CFC00', snd: () => { osc(180, 0.6, 0.35, 'sawtooth'); setTimeout(() => osc(220, 0.4, 0.2), 200); }, vb: 60, boom: false },
  { e: '🦖', nm: 'T-Rex',    x: 62, y: 14, sz: 78, pts: 5, c: '#FF6B35', snd: () => { osc(90, 0.7, 0.45, 'sawtooth'); setTimeout(() => osc(140, 0.5, 0.3, 'sawtooth'), 180); setTimeout(() => osc(200, 0.3, 0.2), 380); }, vb: [90, 45, 90], boom: true },
  { e: '🐉', nm: 'Dragón',   x: 38, y: 6,  sz: 80, pts: 7, c: '#FF4500', snd: () => { osc(70, 0.9, 0.42, 'sawtooth'); setTimeout(() => osc(140, 0.6, 0.28, 'square'), 250); setTimeout(() => sweep(400, 200, 0.4, 0.2), 500); }, vb: [110, 55, 110, 55], boom: true },
  { e: '🦎', nm: 'Raptor',   x: 80, y: 40, sz: 60, pts: 3, c: '#90EE90', snd: () => { osc(280, 0.35, 0.28, 'square'); setTimeout(() => osc(360, 0.25, 0.18), 150); }, vb: 45, boom: false },
  { e: '🐊', nm: 'Anqui',    x: 4,  y: 52, sz: 64, pts: 4, c: '#228B22', snd: () => { osc(130, 0.6, 0.32, 'triangle'); setTimeout(() => osc(180, 0.4, 0.2), 200); }, vb: 55, boom: false },
  { e: '🦕', nm: 'Diplo',    x: 55, y: 55, sz: 66, pts: 3, c: '#ADFF2F', snd: () => osc(200, 0.5, 0.3, 'sine'), vb: 40, boom: false },
  { e: '🐢', nm: 'Tortuga',  x: 26, y: 60, sz: 58, pts: 2, c: '#3CB371', snd: () => osc(160, 0.4, 0.25, 'triangle'), vb: 25, boom: false },
  { e: '🦕', nm: 'Pterano',  x: 70, y: 8,  sz: 62, pts: 3, c: '#DA70D6', snd: () => sweep(600, 300, 0.3, 0.22), vb: 35, boom: false },
  { e: '🐲', nm: 'Espino',   x: 90, y: 25, sz: 60, pts: 4, c: '#FF8C00', snd: () => { osc(160, 0.55, 0.32, 'sawtooth'); setTimeout(() => osc(240, 0.35, 0.2), 180); }, vb: 50, boom: false },
  { e: '🦴', nm: 'Fósil',    x: 18, y: 38, sz: 50, pts: 2, c: '#F5DEB3', snd: () => osc(440, 0.3, 0.2), vb: 20, boom: false },
  { e: '🥚', nm: 'Huevo',    x: 48, y: 72, sz: 52, pts: 4, c: '#FFF8DC', snd: () => { sweep(300, 600, 0.2, 0.25); setTimeout(() => chord([523, 659, 784], 60, 0.4, 0.2), 200); }, vb: [40, 20, 40], boom: true },
  { e: '🌋', nm: 'Volcán',   x: 82, y: 58, sz: 68, pts: 5, c: '#FF4500', snd: () => { osc(80, 0.8, 0.4, 'sawtooth'); setTimeout(() => sweep(200, 800, 0.5, 0.3), 200); }, vb: [80, 40, 80, 40], boom: true },
  { e: '💀', nm: 'Cráneo',   x: 6,  y: 20, sz: 50, pts: 3, c: '#DCDCDC', snd: () => { osc(200, 0.4, 0.25, 'square'); setTimeout(() => osc(150, 0.3, 0.2), 180); }, vb: 35, boom: false },
  { e: '🪨', nm: 'Roca',     x: 44, y: 42, sz: 52, pts: 2, c: '#A0522D', snd: () => osc(120, 0.4, 0.3, 'sawtooth'), vb: 30, boom: false },
  { e: '🌿', nm: 'Helecho',  x: 32, y: 25, sz: 54, pts: 2, c: '#32CD32', snd: () => osc(660, 0.3, 0.2), vb: 15, boom: false },
];

const FLOATS = [
  { e: '🦴', pts: 1 }, { e: '🥚', pts: 2 }, { e: '💎', pts: 3 },
  { e: '🌿', pts: 1 }, { e: '🪨', pts: 1 }, { e: '⭐', pts: 1 },
  { e: '🔥', pts: 2 }, { e: '💫', pts: 1 },
];

const r = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 0;
type P = { id: number; x: number; y: number; e: string };
type B = { id: number; x: number; y: number; c: string; sz: number };
type FO = { id: number; x: number; y: number; sz: number; e: string; pts: number };
type Ring = { id: number; x: number; y: number; sz: number; c: string };

const PARTY = ['🦴', '🥚', '🌿', '💫', '✨', '🍖', '⭐', '💥', '🔥', '🌟'];
const BCOLS = ['#7CFC00', '#FF6B35', '#228B22', '#FFD700', '#FF4500', '#90EE90', '#ADFF2F', '#DA70D6'];

export default function Mundo1() {
  const [parts, setParts] = useState<P[]>([]);
  const [bubbles, setBubbles] = useState<B[]>([]);
  const [fobjs, setFobjs] = useState<FO[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState('');
  const [showC, setShowC] = useState(false);
  const [win, setWin] = useState(false);
  const [dinoS, setDinoS] = useState<Record<number, number>>({});
  const [bgFlash, setBgFlash] = useState('');
  const [lava, setLava] = useState(false);

  const sRef = useRef(0); const cRef = useRef(0); const cT = useRef<any>(null); const wFired = useRef(false);
  const WIN = 65; const router = useRouter();

  const ring = useCallback((x: number, y: number, sz: number, c: string) => {
    const id = uid++;
    setRings(rr => [...rr, { id, x, y, sz, c }]);
    setTimeout(() => setRings(rr => rr.filter(r => r.id !== id)), 650);
  }, []);

  const burst = useCallback((x: number, y: number, n = 10) => {
    const np: P[] = Array.from({ length: n }, () => ({ id: uid++, x, y, e: PARTY[ri(0, PARTY.length)] }));
    setParts(p => [...p, ...np]);
    setTimeout(() => setParts(p => p.filter(b => !np.find(n => n.id === b.id))), 1000);
    const nb: B[] = Array.from({ length: 7 }, () => ({ id: uid++, x: x + r(-40, 40), y: y + r(-15, 15), c: BCOLS[ri(0, BCOLS.length)], sz: r(5, 18) }));
    setBubbles(b => [...b, ...nb]);
    setTimeout(() => setBubbles(b => b.filter(bb => !nb.find(n => n.id === bb.id))), 1900);
  }, []);

  const addScore = useCallback((pts: number, x: number, y: number, snd: () => void, vb: number | number[] = 25, boom = false) => {
    burst(x, y, pts > 4 ? 16 : 10);
    ring(x, y, 65, BCOLS[ri(0, BCOLS.length)]);
    snd(); vib(vb);
    cRef.current++;
    if (cT.current) clearTimeout(cT.current);
    cT.current = setTimeout(() => { cRef.current = 0; }, 1700);
    const mul = cRef.current > 5 ? 3 : cRef.current > 2 ? 2 : 1;
    sRef.current = Math.min(sRef.current + Math.round(pts * mul), WIN);
    setScore(sRef.current);
    if (cRef.current > 1) { setCombo(cRef.current > 5 ? `🦖 x${cRef.current} DINO COMBO!` : `🦴 x${cRef.current}`); setShowC(true); setTimeout(() => setShowC(false), 1000); }
    if (boom) { setBgFlash('rgba(255,80,0,.22)'); setTimeout(() => setBgFlash(''), 400); for (let i = 0; i < 10; i++) setTimeout(() => burst(r(x - 100, x + 100), r(y - 80, y + 80), 6), i * 55); }
    if (pts >= 5) { setLava(true); setTimeout(() => setLava(false), 1200); }
    if (sRef.current >= WIN && !wFired.current) { wFired.current = true; chord([196, 247, 294, 392, 494], 90, 0.7, 0.22); vib([100, 50, 100, 50, 100, 50, 250]); for (let i = 0; i < 36; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 7), i * 65); setTimeout(() => setWin(true), 2200); }
  }, [burst, ring]);

  const spawnFloat = useCallback(() => {
    const fo = FLOATS[ri(0, FLOATS.length)];
    setFobjs(f => [...f, { id: uid++, x: r(4, 88), y: r(6, 75), sz: ri(24, 42), e: fo.e, pts: fo.pts }]);
  }, []);

  useEffect(() => {
    for (let i = 0; i < 5; i++) setTimeout(spawnFloat, i * 800 + 400);
    const iv = setInterval(() => { if (Math.random() < .55) spawnFloat(); }, 4000);
    return () => clearInterval(iv);
  }, [spawnFloat]);

  const filled = Math.min(5, Math.floor(sRef.current / (WIN / 5)));

  return (
    <div id="w" onClick={e => { if ((e.target as HTMLElement).id === 'w') addScore(1, e.nativeEvent.offsetX, e.nativeEvent.offsetY, () => osc(ri(150, 350), 0.2, 0.12, 'sawtooth')); }}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', cursor: 'default', fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(180deg,#080214 0%,#180830 28%,#0d2010 58%,#030e02 100%)' }}>

      {bgFlash && <div style={{ position: 'absolute', inset: 0, background: bgFlash, pointerEvents: 'none', zIndex: 45 }} />}
      {lava && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 90, background: 'linear-gradient(180deg,transparent,rgba(255,60,0,.5) 60%,rgba(255,100,0,.8))', pointerEvents: 'none', zIndex: 4, animation: 'lavaIn .3s ease-out' }} />}

      {/* Meteoritos / partículas de fondo */}
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: `${r(1, 3.5)}px`, height: `${r(1, 3.5)}px`, background: i % 3 === 0 ? '#7CFC00' : i % 3 === 1 ? '#FF6B35' : 'rgba(255,255,255,.6)', opacity: r(.1, .75), top: `${r(0, 90)}%`, left: `${r(0, 100)}%`, animation: `tw${i % 3} ${r(2, 5)}s ${r(0, 4)}s infinite` }} />
      ))}

      {/* Suelo */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 88, background: 'linear-gradient(180deg,transparent,#0d2008 40%,#050e03)', pointerEvents: 'none', zIndex: 2 }} />

      {/* Silueta de árboles prehistóricos */}
      <div style={{ position: 'absolute', bottom: 60, width: '100%', display: 'flex', justifyContent: 'space-around', pointerEvents: 'none', zIndex: 3 }}>
        {['🌴', '🌲', '🌴', '🌳', '🌴', '🌲', '🌳', '🌴'].map((t, i) => (
          <span key={i} style={{ fontSize: `${ri(44, 72)}px`, filter: 'brightness(.25) saturate(.4)', marginBottom: -10 }}>{t}</span>
        ))}
      </div>

      {/* Score */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7, zIndex: 30 }}>
        {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 26, transition: 'transform .3s', transform: i === filled ? 'scale(1.6)' : 'scale(1)', filter: i <= filled ? 'drop-shadow(0 0 8px #FFD700)' : 'none' }}>{i <= filled ? '⭐' : '☆'}</span>)}
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: 'rgba(255,255,255,.38)', zIndex: 30 }}>{sRef.current}/{WIN}</div>
      <button onClick={() => router.push('/')} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 50, padding: '6px 14px', fontSize: 13, color: 'white', cursor: 'pointer', zIndex: 30 }}>← Inicio</button>
      {showC && <div style={{ position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', fontSize: 24, fontWeight: 900, color: '#7CFC00', whiteSpace: 'nowrap', textShadow: '0 0 16px rgba(100,255,0,.9)', zIndex: 30, pointerEvents: 'none' }}>{combo}</div>}

      {/* Dinosaurios */}
      {DINOS.map((d, i) => (
        <div key={i}
          onClick={e => { e.stopPropagation(); const el = e.currentTarget; setDinoS(s => ({ ...s, [i]: 1.3 })); setTimeout(() => setDinoS(s => ({ ...s, [i]: 1 })), 280); addScore(d.pts, el.offsetLeft + d.sz / 2, el.offsetTop + d.sz / 2, d.snd, d.vb, d.boom); ring(el.offsetLeft + d.sz / 2, el.offsetTop + d.sz / 2, d.sz * 1.1, d.c); }}
          style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, fontSize: d.sz, cursor: 'pointer', zIndex: 10, lineHeight: 1, filter: `drop-shadow(0 0 12px ${d.c})`, transform: `scale(${dinoS[i] || 1})`, transition: 'transform .2s', animation: `dA${i % 5} ${3.2 + i * .28}s ${i * .22}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.filter = `drop-shadow(0 0 26px ${d.c})`; e.currentTarget.style.transform = 'scale(1.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = `drop-shadow(0 0 12px ${d.c})`; e.currentTarget.style.transform = `scale(${dinoS[i] || 1})`; }}
          title={d.nm}
        >{d.e}</div>
      ))}

      {/* Objetos flotantes */}
      {fobjs.map(fo => (
        <div key={fo.id}
          onClick={e => { e.stopPropagation(); addScore(fo.pts, e.currentTarget.offsetLeft + fo.sz / 2, e.currentTarget.offsetTop + fo.sz / 2, () => osc(440, 0.2, 0.2)); setFobjs(f => f.filter(o => o.id !== fo.id)); setTimeout(spawnFloat, r(2000, 4500)); }}
          style={{ position: 'absolute', left: `${fo.x}%`, top: `${fo.y}%`, fontSize: fo.sz, cursor: 'pointer', zIndex: 13, lineHeight: 1, transition: 'transform .12s', animation: `fObjA ${r(2.5, 5)}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >{fo.e}</div>
      ))}

      {rings.map(rr => <div key={rr.id} style={{ position: 'absolute', left: rr.x - rr.sz / 2, top: rr.y - rr.sz / 2, width: rr.sz, height: rr.sz, borderRadius: '50%', border: `2.5px solid ${rr.c}`, pointerEvents: 'none', zIndex: 22, animation: 'ringOut .65s ease-out forwards' }} />)}

      {/* Toqwow */}
      <div onClick={e => { e.stopPropagation(); addScore(6, window.innerWidth / 2, window.innerHeight * .65, () => { osc(70, 1, 0.4, 'sawtooth'); chord([196, 247, 294, 392], 80, 0.6, 0.2); }, [60, 30, 60, 30, 120], true); for (let i = 0; i < 16; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 8), i * 55); }}
        style={{ position: 'absolute', bottom: 90, left: '50%', width: 'min(150px,26vw)', cursor: 'pointer', zIndex: 16, filter: 'drop-shadow(0 0 24px rgba(124,252,0,.7))', transform: 'translateX(-50%)', animation: 'tFloat 3s ease-in-out infinite', transition: 'filter .2s' }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 42px rgba(124,252,0,1))')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 24px rgba(124,252,0,.7))')}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={150} height={190} style={{ objectFit: 'contain', width: '100%', height: 'auto', mixBlendMode: 'screen' }} priority />
      </div>

      {parts.map(p => <div key={p.id} style={{ position: 'absolute', left: p.x - 14, top: p.y - 14, fontSize: ri(20, 30), pointerEvents: 'none', zIndex: 26, lineHeight: 1, animation: 'burstP 1s ease-out forwards' }}>{p.e}</div>)}
      {bubbles.map(b => <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.sz, height: b.sz, borderRadius: '50%', background: b.c, opacity: .78, pointerEvents: 'none', zIndex: 21, animation: 'riseB 1.9s ease-out forwards' }} />)}

      {!win && <div style={{ position: 'absolute', bottom: 13, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.32)', fontSize: 11, pointerEvents: 'none', zIndex: 31, whiteSpace: 'nowrap' }}>🦕 ¡Toca los dinosaurios! — ¡Cuidado con el T-Rex! 🦖</div>}

      {win && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,12,3,.92)', backdropFilter: 'blur(14px)', animation: 'fadeW .8s' }}>
          <div style={{ fontSize: 96, animation: 'wBounce .5s infinite alternate', marginBottom: 6 }}>🦖</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#7CFC00', textShadow: '0 0 36px rgba(100,255,0,.95)', marginBottom: 6 }}>¡RAWR!!!</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,.9)', marginBottom: 4, textAlign: 'center' }}>Domaste a todos los dinosaurios</div>
          <div style={{ fontSize: 14, color: 'rgba(124,252,0,.7)', marginBottom: 28, textAlign: 'center' }}>Pack 1 · Dinos del Espacio completado 🦕</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 40, filter: 'drop-shadow(0 0 10px #FFD700)', animation: `starPop .4s ${i * .1}s ease-out both` }}>⭐</span>)}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={() => { sRef.current = 0; wFired.current = false; cRef.current = 0; setScore(0); setWin(false); }} style={{ background: 'linear-gradient(135deg,#7CFC00,#228B22)', border: 'none', borderRadius: 50, padding: '14px 32px', fontSize: 18, fontWeight: 800, color: '#000', cursor: 'pointer' }}>🔄 ¡Otra vez!</button>
            <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.25)', borderRadius: 50, padding: '14px 32px', fontSize: 18, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🏠 Inicio</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tw0{0%,100%{opacity:.15}50%{opacity:.9}} @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.08}} @keyframes tw2{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes tFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-16px)}}
        @keyframes dA0{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-14px) rotate(4deg)}}
        @keyframes dA1{0%,100%{transform:translateX(0) scaleX(1)}50%{transform:translateX(0) scaleX(-1) translateX(0)}}
        @keyframes dA2{0%,100%{transform:scale(1)}50%{transform:scale(1.08) rotate(5deg)}}
        @keyframes dA3{0%,100%{transform:translateY(0)}25%{transform:translateY(-8px) rotate(6deg)}75%{transform:translateY(-4px) rotate(-6deg)}}
        @keyframes dA4{0%,100%{transform:translateX(0) translateY(0)}33%{transform:translateX(6px) translateY(-6px)}66%{transform:translateX(-6px) translateY(-3px)}}
        @keyframes fObjA{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(15deg)}}
        @keyframes ringOut{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.5);opacity:0}}
        @keyframes burstP{0%{opacity:1;transform:scale(.25) translateY(0) rotate(0deg)}100%{opacity:0;transform:scale(2) translateY(-90px) rotate(200deg)}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0)}100%{opacity:0;transform:translateY(-160px) scale(.1)}}
        @keyframes lavaIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeW{from{opacity:0}to{opacity:1}} @keyframes wBounce{from{transform:scale(1) rotate(-10deg)}to{transform:scale(1.22) rotate(10deg)}}
        @keyframes starPop{0%{transform:scale(0) rotate(-40deg)}60%{transform:scale(1.4) rotate(12deg)}100%{transform:scale(1) rotate(0deg)}}
      `}</style>
    </div>
  );
}
