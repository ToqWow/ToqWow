'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let AC: AudioContext | null = null;
const ac = () => { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); return AC; };
const osc = (f: number, d = 0.35, v = 0.24, t: OscillatorType = 'sine') => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {} };
const sweep = (f1: number, f2: number, d = 0.4, v = 0.24) => { try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {} };
const chord = (fs: number[], gap = 80, d = 0.4, v = 0.2) => fs.forEach((f, i) => setTimeout(() => osc(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

const CREATURES = [
  { e: '🦋', nm: 'Mariposa',  x: 18, y: 18, sz: 60, pts: 2, c: '#FF85C2', snd: () => { osc(880, 0.3, 0.2); setTimeout(() => osc(1100, 0.25, 0.15), 120); }, vb: 18, magic: false },
  { e: '🐸', nm: 'Rana',      x: 58, y: 14, sz: 66, pts: 3, c: '#7CFC00', snd: () => { osc(200, 0.35, 0.3, 'square'); setTimeout(() => osc(250, 0.25, 0.18, 'square'), 160); }, vb: 38, magic: false },
  { e: '🦄', nm: 'Unicornio', x: 78, y: 28, sz: 72, pts: 7, c: '#FF69B4', snd: () => chord([523, 659, 784, 1047, 1319, 1568], 70, 0.6, 0.2), vb: [55, 30, 55, 30], magic: true },
  { e: '🦊', nm: 'Zorro',     x: 42, y: 8,  sz: 64, pts: 4, c: '#FF8C00', snd: () => { osc(440, 0.4, 0.28, 'sawtooth'); setTimeout(() => osc(330, 0.3, 0.18), 180); }, vb: 42, magic: false },
  { e: '🐛', nm: 'Oruga',     x: 6,  y: 44, sz: 56, pts: 2, c: '#98FB98', snd: () => osc(300, 0.35, 0.22, 'triangle'), vb: 18, magic: false },
  { e: '🍄', nm: 'Seta',      x: 68, y: 54, sz: 62, pts: 3, c: '#FF4500', snd: () => { osc(330, 0.5, 0.26); setTimeout(() => sweep(330, 660, 0.3, 0.15), 200); }, vb: 30, magic: false },
  { e: '🌸', nm: 'Flor',      x: 28, y: 55, sz: 58, pts: 2, c: '#FFB7C5', snd: () => osc(660, 0.4, 0.2), vb: 18, magic: false },
  { e: '🦝', nm: 'Mapache',   x: 88, y: 42, sz: 60, pts: 3, c: '#808080', snd: () => { osc(250, 0.4, 0.26, 'triangle'); setTimeout(() => osc(200, 0.3, 0.18), 180); }, vb: 35, magic: false },
  { e: '🌺', nm: 'Rosa',      x: 50, y: 62, sz: 54, pts: 2, c: '#FF6B81', snd: () => osc(740, 0.4, 0.2), vb: 16, magic: false },
  { e: '🐝', nm: 'Abeja',     x: 14, y: 28, sz: 52, pts: 2, c: '#FFD700', snd: () => { osc(220, 0.3, 0.2); osc(280, 0.3, 0.15, 'sine'); }, vb: 20, magic: false },
  { e: '🦚', nm: 'Pavo Real', x: 4,  y: 58, sz: 66, pts: 5, c: '#00CED1', snd: () => chord([440, 550, 660, 880, 1100], 80, 0.55, 0.2), vb: [45, 25, 45], magic: true },
  { e: '🍀', nm: 'Trébol',    x: 36, y: 36, sz: 50, pts: 2, c: '#32CD32', snd: () => osc(528, 0.35, 0.2), vb: 14, magic: false },
  { e: '🌻', nm: 'Girasol',   x: 82, y: 12, sz: 60, pts: 3, c: '#FFD700', snd: () => { osc(440, 0.4, 0.24); setTimeout(() => osc(550, 0.3, 0.16), 150); }, vb: 25, magic: false },
  { e: '🐞', nm: 'Mariquita', x: 56, y: 36, sz: 52, pts: 2, c: '#FF0000', snd: () => osc(660, 0.3, 0.2), vb: 16, magic: false },
  { e: '🧚', nm: 'Hada',      x: 72, y: 72, sz: 58, pts: 5, c: '#DDA0DD', snd: () => chord([784, 1047, 1319, 1568], 65, 0.55, 0.2), vb: [40, 20, 40, 20], magic: true },
  { e: '🌊', nm: 'Ola',       x: 22, y: 72, sz: 56, pts: 2, c: '#00BFFF', snd: () => sweep(300, 600, 0.4, 0.22), vb: 18, magic: false },
  { e: '🦜', nm: 'Loro',      x: 46, y: 28, sz: 58, pts: 3, c: '#32CD32', snd: () => { sweep(440, 880, 0.2, 0.22); setTimeout(() => sweep(880, 440, 0.2, 0.18), 220); }, vb: 28, magic: false },
  { e: '🍇', nm: 'Uvas',      x: 90, y: 68, sz: 50, pts: 2, c: '#9B59B6', snd: () => osc(396, 0.35, 0.2), vb: 14, magic: false },
];

const FLOATS = [
  { e: '🌺', pts: 1 }, { e: '🍀', pts: 2 }, { e: '💫', pts: 1 }, { e: '🌸', pts: 1 },
  { e: '🌟', pts: 1 }, { e: '🦋', pts: 2 }, { e: '💎', pts: 3 }, { e: '✨', pts: 1 },
  { e: '🍄', pts: 2 }, { e: '🌻', pts: 1 },
];

const r = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 0;
type P = { id: number; x: number; y: number; e: string };
type B = { id: number; x: number; y: number; c: string; sz: number };
type FO = { id: number; x: number; y: number; sz: number; e: string; pts: number };
type Ring = { id: number; x: number; y: number; sz: number; c: string };

const PARTY = ['🍀', '🌺', '🌻', '✨', '💫', '🍃', '🌿', '🪄', '🦋', '🌸', '🌟', '💐'];
const BCOLS = ['#7CFC00', '#FF85C2', '#FF8C00', '#FFD700', '#00CED1', '#FF69B4', '#98FB98', '#DDA0DD'];

export default function Mundo2() {
  const [parts, setParts] = useState<P[]>([]);
  const [bubbles, setBubbles] = useState<B[]>([]);
  const [fobjs, setFobjs] = useState<FO[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState('');
  const [showC, setShowC] = useState(false);
  const [win, setWin] = useState(false);
  const [magicFlash, setMagicFlash] = useState('');
  const [creatS, setCreatS] = useState<Record<number, number>>({});

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

  const addScore = useCallback((pts: number, x: number, y: number, snd: () => void, vb: number | number[] = 18, magic = false) => {
    burst(x, y, pts > 4 ? 16 : 10);
    ring(x, y, 65, BCOLS[ri(0, BCOLS.length)]);
    snd(); vib(vb);
    cRef.current++;
    if (cT.current) clearTimeout(cT.current);
    cT.current = setTimeout(() => { cRef.current = 0; }, 1700);
    const mul = cRef.current > 5 ? 3 : cRef.current > 2 ? 2 : 1;
    sRef.current = Math.min(sRef.current + Math.round(pts * mul), WIN);
    setScore(sRef.current);
    if (cRef.current > 1) { setCombo(cRef.current > 5 ? `🦄 x${cRef.current} MAGIA!` : `✨ x${cRef.current}`); setShowC(true); setTimeout(() => setShowC(false), 1000); }
    if (magic) { setMagicFlash('rgba(255,100,200,.25)'); setTimeout(() => setMagicFlash(''), 500); for (let i = 0; i < 12; i++) setTimeout(() => burst(r(x - 120, x + 120), r(y - 80, y + 80), 6), i * 60); }
    if (sRef.current >= WIN && !wFired.current) { wFired.current = true; chord([523, 659, 784, 1047, 1319, 1568, 2093], 80, 0.8, 0.2); vib([100, 50, 100, 50, 100, 50, 250]); for (let i = 0; i < 40; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 7), i * 60); setTimeout(() => setWin(true), 2400); }
  }, [burst, ring]);

  const spawnFloat = useCallback(() => {
    const fo = FLOATS[ri(0, FLOATS.length)];
    setFobjs(f => [...f, { id: uid++, x: r(4, 88), y: r(6, 78), sz: ri(22, 40), e: fo.e, pts: fo.pts }]);
  }, []);

  useEffect(() => {
    for (let i = 0; i < 6; i++) setTimeout(spawnFloat, i * 700 + 300);
    const iv = setInterval(() => { if (Math.random() < .55) spawnFloat(); }, 3800);
    return () => clearInterval(iv);
  }, [spawnFloat]);

  const filled = Math.min(5, Math.floor(sRef.current / (WIN / 5)));

  return (
    <div id="w" onClick={e => { if ((e.target as HTMLElement).id === 'w') addScore(1, e.nativeEvent.offsetX, e.nativeEvent.offsetY, () => osc(ri(400, 900), 0.2, 0.1)); }}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', cursor: 'default', fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(180deg,#030a03 0%,#0a1f06 30%,#122e08 60%,#060f03 100%)' }}>

      {magicFlash && <div style={{ position: 'absolute', inset: 0, background: magicFlash, pointerEvents: 'none', zIndex: 45 }} />}

      {/* Luciérnagas de fondo */}
      {Array.from({ length: 70 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: `${r(2, 5.5)}px`, height: `${r(2, 5.5)}px`, background: i % 4 === 0 ? '#7CFC00' : i % 4 === 1 ? '#FFD700' : i % 4 === 2 ? '#FF85C2' : '#00CED1', opacity: r(.08, .75), top: `${r(0, 92)}%`, left: `${r(0, 100)}%`, boxShadow: i % 3 === 0 ? `0 0 6px currentColor` : 'none', animation: `luci${i % 5} ${r(1.5, 4.5)}s ${r(0, 3.5)}s infinite` }} />
      ))}

      {/* Niebla mágica */}
      {[{ l: 0, t: 45, c: 'rgba(0,180,80,.05)' }, { l: 40, t: 60, c: 'rgba(180,80,200,.04)' }, { l: 70, t: 40, c: 'rgba(0,200,200,.04)' }].map((n, i) => (
        <div key={i} style={{ position: 'absolute', left: `${n.l}%`, top: `${n.t}%`, width: 320, height: 200, borderRadius: '50%', background: n.c, filter: 'blur(50px)', pointerEvents: 'none' }} />
      ))}

      {/* Suelo con hierba */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 80, background: 'linear-gradient(180deg,transparent,#0d2208 40%,#060f03)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 58, width: '100%', display: 'flex', justifyContent: 'space-around', pointerEvents: 'none', zIndex: 3 }}>
        {['🌲', '🌳', '🌲', '🌴', '🌲', '🌳', '🌲', '🌴', '🌲'].map((t, i) => (
          <span key={i} style={{ fontSize: `${ri(40, 68)}px`, filter: 'brightness(.2) saturate(.5)', marginBottom: -8 }}>{t}</span>
        ))}
      </div>

      {/* Score */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7, zIndex: 30 }}>
        {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 26, transition: 'transform .3s', transform: i === filled ? 'scale(1.6)' : 'scale(1)', filter: i <= filled ? 'drop-shadow(0 0 8px #FFD700)' : 'none' }}>{i <= filled ? '⭐' : '☆'}</span>)}
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: 'rgba(255,255,255,.38)', zIndex: 30 }}>{sRef.current}/{WIN}</div>
      <button onClick={() => router.push('/')} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 50, padding: '6px 14px', fontSize: 13, color: 'white', cursor: 'pointer', zIndex: 30 }}>← Inicio</button>
      {showC && <div style={{ position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', fontSize: 24, fontWeight: 900, color: '#7CFC00', whiteSpace: 'nowrap', textShadow: '0 0 16px rgba(100,255,100,.9)', zIndex: 30, pointerEvents: 'none' }}>{combo}</div>}

      {/* Criaturas */}
      {CREATURES.map((c, i) => (
        <div key={i}
          onClick={e => { e.stopPropagation(); const el = e.currentTarget; setCreatS(s => ({ ...s, [i]: 1.28 })); setTimeout(() => setCreatS(s => ({ ...s, [i]: 1 })), 260); addScore(c.pts, el.offsetLeft + c.sz / 2, el.offsetTop + c.sz / 2, c.snd, c.vb, c.magic); ring(el.offsetLeft + c.sz / 2, el.offsetTop + c.sz / 2, c.sz * 1.1, c.c); }}
          style={{ position: 'absolute', left: `${c.x}%`, top: `${c.y}%`, fontSize: c.sz, cursor: 'pointer', zIndex: 10, lineHeight: 1, filter: `drop-shadow(0 0 10px ${c.c})`, transform: `scale(${creatS[i] || 1})`, transition: 'transform .2s', animation: `cA${i % 6} ${3 + i * .22}s ${i * .18}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.filter = `drop-shadow(0 0 24px ${c.c})`; e.currentTarget.style.transform = 'scale(1.24)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = `drop-shadow(0 0 10px ${c.c})`; e.currentTarget.style.transform = `scale(${creatS[i] || 1})`; }}
          title={c.nm}
        >{c.e}</div>
      ))}

      {/* Objetos flotantes */}
      {fobjs.map(fo => (
        <div key={fo.id}
          onClick={e => { e.stopPropagation(); addScore(fo.pts, e.currentTarget.offsetLeft + fo.sz / 2, e.currentTarget.offsetTop + fo.sz / 2, () => osc(660, 0.2, 0.18)); setFobjs(f => f.filter(o => o.id !== fo.id)); setTimeout(spawnFloat, r(1800, 4200)); }}
          style={{ position: 'absolute', left: `${fo.x}%`, top: `${fo.y}%`, fontSize: fo.sz, cursor: 'pointer', zIndex: 13, lineHeight: 1, transition: 'transform .12s', animation: `fA ${r(2.5, 5)}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.48) rotate(15deg)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        >{fo.e}</div>
      ))}

      {rings.map(rr => <div key={rr.id} style={{ position: 'absolute', left: rr.x - rr.sz / 2, top: rr.y - rr.sz / 2, width: rr.sz, height: rr.sz, borderRadius: '50%', border: `2.5px solid ${rr.c}`, pointerEvents: 'none', zIndex: 22, animation: 'ringOut .65s ease-out forwards' }} />)}

      {/* Toqwow */}
      <div onClick={e => { e.stopPropagation(); addScore(6, window.innerWidth / 2, window.innerHeight * .65, () => chord([523, 659, 784, 1047, 1319], 75, 0.7, 0.22), [55, 28, 55, 28, 110], true); for (let i = 0; i < 18; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 8), i * 55); }}
        style={{ position: 'absolute', bottom: 88, left: '50%', width: 'min(150px,26vw)', cursor: 'pointer', zIndex: 16, filter: 'drop-shadow(0 0 24px rgba(255,100,200,.7))', transform: 'translateX(-50%)', animation: 'tFloat 3s ease-in-out infinite', transition: 'filter .2s' }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 42px rgba(255,100,200,1))')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 24px rgba(255,100,200,.7))')}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={150} height={190} style={{ objectFit: 'contain', width: '100%', height: 'auto', mixBlendMode: 'screen' }} priority />
      </div>

      {parts.map(p => <div key={p.id} style={{ position: 'absolute', left: p.x - 14, top: p.y - 14, fontSize: ri(20, 30), pointerEvents: 'none', zIndex: 26, lineHeight: 1, animation: 'burstP 1s ease-out forwards' }}>{p.e}</div>)}
      {bubbles.map(b => <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.sz, height: b.sz, borderRadius: '50%', background: b.c, opacity: .78, pointerEvents: 'none', zIndex: 21, animation: 'riseB 1.9s ease-out forwards' }} />)}

      {!win && <div style={{ position: 'absolute', bottom: 13, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.32)', fontSize: 11, pointerEvents: 'none', zIndex: 31, whiteSpace: 'nowrap' }}>🌿 ¡Toca las criaturas del bosque! — ¡El unicornio es especial! 🦄</div>}

      {win && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,10,3,.92)', backdropFilter: 'blur(14px)', animation: 'fadeW .8s' }}>
          <div style={{ fontSize: 96, animation: 'wBounce .5s infinite alternate', marginBottom: 6 }}>🦄</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#FF85C2', textShadow: '0 0 36px rgba(255,100,200,.95)', marginBottom: 6 }}>¡MÁGICO!</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,.9)', marginBottom: 4, textAlign: 'center' }}>Exploraste el Bosque Encantado</div>
          <div style={{ fontSize: 14, color: 'rgba(124,252,0,.7)', marginBottom: 28, textAlign: 'center' }}>Pack 2 · Bosque Encantado completado 🌲</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 40, filter: 'drop-shadow(0 0 10px #FFD700)', animation: `starPop .4s ${i * .1}s ease-out both` }}>⭐</span>)}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={() => { sRef.current = 0; wFired.current = false; cRef.current = 0; setScore(0); setWin(false); }} style={{ background: 'linear-gradient(135deg,#FF85C2,#9B59B6)', border: 'none', borderRadius: 50, padding: '14px 32px', fontSize: 18, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🔄 ¡Otra vez!</button>
            <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.25)', borderRadius: 50, padding: '14px 32px', fontSize: 18, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🏠 Inicio</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-16px)}}
        @keyframes cA0{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-14px) rotate(5deg)}}
        @keyframes cA1{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.1) rotate(12deg)}}
        @keyframes cA2{0%,100%{transform:translateX(0)}25%{transform:translateX(10px) rotate(8deg)}75%{transform:translateX(-10px) rotate(-8deg)}}
        @keyframes cA3{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.08)}}
        @keyframes cA4{0%,100%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes cA5{0%,100%{transform:translateY(0) translateX(0)}33%{transform:translateY(-8px) translateX(6px)}66%{transform:translateY(-4px) translateX(-6px)}}
        @keyframes fA{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(18deg)}}
        @keyframes luci0{0%,100%{opacity:.08;transform:translate(0,0)}50%{opacity:.85;transform:translate(5px,5px)}}
        @keyframes luci1{0%,100%{opacity:.75}50%{opacity:.06}}
        @keyframes luci2{0%,100%{opacity:.4}33%{opacity:.9}66%{opacity:.1}}
        @keyframes luci3{0%,100%{opacity:.5;transform:translateY(0)}50%{opacity:.9;transform:translateY(-8px)}}
        @keyframes luci4{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:.8;transform:scale(1.8)}}
        @keyframes ringOut{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.5);opacity:0}}
        @keyframes burstP{0%{opacity:1;transform:scale(.25) translateY(0) rotate(0deg)}100%{opacity:0;transform:scale(2) translateY(-90px) rotate(200deg)}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0)}100%{opacity:0;transform:translateY(-160px) scale(.1)}}
        @keyframes fadeW{from{opacity:0}to{opacity:1}} @keyframes wBounce{from{transform:scale(1) rotate(-10deg)}to{transform:scale(1.22) rotate(10deg)}}
        @keyframes starPop{0%{transform:scale(0) rotate(-40deg)}60%{transform:scale(1.4) rotate(12deg)}100%{transform:scale(1) rotate(0deg)}}
      `}</style>
    </div>
  );
}
