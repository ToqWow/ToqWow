'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══════ AUDIO ENGINE ══════ */
let AC: AudioContext | null = null;
const ac = () => { if (!AC) AC = new (window.AudioContext || (window as any).webkitAudioContext)(); return AC; };
const osc = (f: number, d = 0.3, v = 0.25, t: OscillatorType = 'sine', detune = 0) => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; o.detune.value = detune; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const sweep = (f1: number, f2: number, d = 0.4, v = 0.25) => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d); g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const chord = (fs: number[], gap = 80, d = 0.4, v = 0.2) => fs.forEach((f, i) => setTimeout(() => osc(f, d, v), i * gap));
const S = {
  planet: (f: number) => { osc(f, 0.3, 0.25); osc(f * 1.5, 0.2, 0.1, 'sine', 10); },
  star:   () => sweep(880, 1320, 0.25, 0.2),
  moon:   () => chord([528, 660, 792, 880], 70, 0.5, 0.2),
  toqwow: () => chord([523, 659, 784, 1047, 1319, 1568, 2093], 80, 0.7, 0.18),
  comet:  () => sweep(1200, 200, 0.5, 0.3),
  black:  () => { osc(40, 1.5, 0.4, 'sawtooth'); setTimeout(() => osc(80, 0.8, 0.2, 'square'), 300); },
  ufo:    () => { sweep(300, 600, 0.2, 0.2); setTimeout(() => sweep(600, 300, 0.2, 0.2), 220); },
  rocket: () => osc(660, 0.4, 0.3, 'square'),
  galaxy: () => chord([262, 330, 392, 523, 659], 90, 0.8, 0.18),
  alien:  () => { sweep(440, 220, 0.15, 0.2); setTimeout(() => sweep(220, 440, 0.15, 0.2), 160); setTimeout(() => sweep(440, 220, 0.15, 0.2), 320); },
  nova:   () => chord([880, 660, 440, 220], 50, 0.9, 0.28),
  meteor: () => osc(150, 0.6, 0.35, 'sawtooth'),
  sat:    () => osc(370, 0.3, 0.22, 'triangle'),
  nebula: () => chord([330, 415, 494, 622], 110, 0.6, 0.18),
  portal: () => { for (let i = 0; i < 5; i++) setTimeout(() => osc(200 + i * 100, 0.3, 0.15), i * 60); },
  win:    () => { chord([523, 659, 784, 1047, 1319], 100, 0.6, 0.2); setTimeout(() => chord([784, 988, 1175, 1568], 80, 0.8, 0.22), 600); },
};
const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

/* ══════ DATOS MUNDO 0 ══════ */
const PLANETS = [
  { x: 8,  y: 10, sz: 64, bg: 'radial-gradient(circle at 32% 28%,#ff9a9e,#e74c3c 65%,#7b1c1c)', gl: 'rgba(231,76,60,.75)',   pts: 2, f: 330, rings: true,  name: 'Volcánico' },
  { x: 73, y: 6,  sz: 54, bg: 'radial-gradient(circle at 38% 32%,#a8f0e0,#27ae60 58%,#145a32)', gl: 'rgba(39,174,96,.75)',   pts: 2, f: 440, rings: false, name: 'Esmeralda' },
  { x: 88, y: 42, sz: 42, bg: 'radial-gradient(circle at 33% 28%,#ffe8c0,#f39c12 58%,#b7770d)', gl: 'rgba(243,156,18,.75)',  pts: 2, f: 550, rings: false, name: 'Dorado' },
  { x: 2,  y: 44, sz: 48, bg: 'radial-gradient(circle at 38% 28%,#e8d0f5,#8e44ad 58%,#5b2c6f)', gl: 'rgba(142,68,173,.75)', pts: 2, f: 392, rings: true,  name: 'Amatista' },
  { x: 55, y: 2,  sz: 36, bg: 'radial-gradient(circle at 33% 33%,#b0d8f5,#2980b9 58%,#1a4a72)', gl: 'rgba(41,128,185,.75)', pts: 2, f: 494, rings: false, name: 'Zafiro' },
  { x: 28, y: 5,  sz: 30, bg: 'radial-gradient(circle at 38% 28%,#f8d0f5,#c84fc8 58%,#8a1a8a)', gl: 'rgba(200,79,200,.75)', pts: 2, f: 587, rings: false, name: 'Rosa' },
  { x: 62, y: 50, sz: 38, bg: 'radial-gradient(circle at 33% 28%,#d0f8e0,#16a085 58%,#0d6655)', gl: 'rgba(22,160,133,.75)', pts: 2, f: 659, rings: false, name: 'Turquesa' },
  { x: 42, y: 72, sz: 28, bg: 'radial-gradient(circle at 35% 30%,#ffe0b0,#e67e22 58%,#9a5315)', gl: 'rgba(230,126,34,.75)', pts: 2, f: 440, rings: false, name: 'Naranja' },
];

type Spec = { id: string; e: string; pts: number; snd: () => void; vb: number | number[]; anim: string; fx?: string; sz: [number, number] };
const SPECS: Spec[] = [
  { id: 'rocket',  e: '🚀', pts: 4, snd: S.rocket,  vb: 50,              anim: 'rocketA', sz: [36, 52] },
  { id: 'ufo',     e: '🛸', pts: 5, snd: S.ufo,     vb: [30,20,30,20,30], anim: 'ufoA',    fx: 'ufo',    sz: [36, 48] },
  { id: 'comet',   e: '☄️',  pts: 3, snd: S.comet,   vb: 40,              anim: 'cometA',  sz: [30, 44] },
  { id: 'sat',     e: '🛰️',  pts: 3, snd: S.sat,     vb: 30,              anim: 'satA',    sz: [30, 42] },
  { id: 'rainbow', e: '🌈', pts: 2, snd: S.nebula,  vb: 20,              anim: 'rainA',   sz: [34, 50] },
  { id: 'black',   e: '🕳️', pts: 8, snd: S.black,   vb: [80,40,80,40,80,40,150], anim: 'blackA', fx: 'blackhole', sz: [38, 54] },
  { id: 'meteor',  e: '🌑', pts: 4, snd: S.meteor,  vb: [60,30,60],      anim: 'meteorA', sz: [28, 42] },
  { id: 'galaxy',  e: '🌌', pts: 6, snd: S.galaxy,  vb: [50,25,50,25,100], anim: 'galaxyA', fx: 'aurora', sz: [40, 56] },
  { id: 'alien',   e: '👾', pts: 5, snd: S.alien,   vb: [40,20,40],      anim: 'alienA',  fx: 'alien',  sz: [32, 46] },
  { id: 'nova',    e: '💥', pts: 7, snd: S.nova,    vb: [100,50,100,50,200], anim: 'novaA', fx: 'nova', sz: [36, 52] },
  { id: 'nebula',  e: '🌫️', pts: 3, snd: S.nebula,  vb: 25,              anim: 'nebA',    sz: [38, 54] },
  { id: 'portal',  e: '🌀', pts: 6, snd: S.portal,  vb: [60,30,60,30,60], anim: 'portalA', fx: 'portal', sz: [34, 50] },
  { id: 'ice',     e: '🧊', pts: 3, snd: () => sweep(1200,800,0.3,0.2), vb: 20, anim: 'iceA', sz: [28, 40] },
  { id: 'crystal', e: '💎', pts: 4, snd: () => chord([1047,1319,1568],60,0.4,0.2), vb: [30,20,30], anim: 'crystalA', sz: [30, 44] },
  { id: 'fire',    e: '🔥', pts: 3, snd: () => osc(200,0.5,0.3,'sawtooth'), vb: 35, anim: 'fireA', sz: [28, 42] },
  { id: 'thunder', e: '⚡', pts: 4, snd: () => { osc(80,0.1,0.4,'sawtooth'); setTimeout(()=>osc(800,0.2,0.2,'square'),80); }, vb: [80,40,80], anim: 'thunderA', sz: [26, 38] },
  { id: 'sun',     e: '☀️',  pts: 5, snd: () => chord([440,550,660,880],70,0.5,0.22), vb: [50,30,50], anim: 'sunA', fx: 'sun', sz: [38, 54] },
  { id: 'aurora2', e: '🌟', pts: 2, snd: S.star,    vb: 15,              anim: 'starA',   sz: [22, 34] },
];

const r  = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 0;

type Particle = { id: number; x: number; y: number; e: string };
type Bubble   = { id: number; x: number; y: number; c: string; sz: number };
type FObj     = { id: number; x: number; y: number; sz: number; sp: Spec };
type FStar    = { id: number; x: number; y: number; sz: number; e: string };
type Ring     = { id: number; x: number; y: number; sz: number; c: string };
type Flash    = { id: number; bg: string };

const PARTY = ['✨','🌟','💫','⚡','🎉','🌈','💥','🎊','💎','🔮','🪄','🌠','🦋','🌺','🍀','🎈','🎆','🎇','⭐','🌙'];
const BCOLS  = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB','#98FB98','#FFA07A','#FF85A1','#85FFBD'];

export default function Mundo0() {
  const [parts,   setParts]   = useState<Particle[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [fobjs,   setFobjs]   = useState<FObj[]>([]);
  const [fstars,  setFstars]  = useState<FStar[]>([]);
  const [rings,   setRings]   = useState<Ring[]>([]);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [score,   setScore]   = useState(0);
  const [combo,   setCombo]   = useState('');
  const [showC,   setShowC]   = useState(false);
  const [tqAnim,  setTqAnim]  = useState('tFloat');
  const [moon,    setMoon]    = useState(1);
  const [aurora,  setAurora]  = useState(false);
  const [win,     setWin]     = useState(false);
  const [hint,    setHint]    = useState(false);

  const sRef  = useRef(0);
  const cRef  = useRef(0);
  const cT    = useRef<any>(null);
  const iT    = useRef<any>(null);
  const wFired= useRef(false);
  const WIN   = 60;
  const router= useRouter();

  /* ── Flash ── */
  const flash = useCallback((bg: string, ms = 400) => {
    const id = uid++;
    setFlashes(f => [...f, { id, bg }]);
    setTimeout(() => setFlashes(f => f.filter(x => x.id !== id)), ms);
  }, []);

  /* ── Ring ── */
  const ring = useCallback((x: number, y: number, sz: number, c: string) => {
    const id = uid++;
    setRings(rr => [...rr, { id, x, y, sz, c }]);
    setTimeout(() => setRings(rr => rr.filter(r => r.id !== id)), 650);
  }, []);

  /* ── Burst ── */
  const burst = useCallback((x: number, y: number, n = 10) => {
    const np: Particle[] = Array.from({ length: n }, () => ({ id: uid++, x, y, e: PARTY[ri(0, PARTY.length)] }));
    setParts(p => [...p, ...np]);
    setTimeout(() => setParts(p => p.filter(b => !np.find(n => n.id === b.id))), 1000);
    const nb: Bubble[] = Array.from({ length: 7 }, () => ({ id: uid++, x: x + r(-40, 40), y: y + r(-15, 15), c: BCOLS[ri(0, BCOLS.length)], sz: r(5, 18) }));
    setBubbles(b => [...b, ...nb]);
    setTimeout(() => setBubbles(b => b.filter(bb => !nb.find(n => n.id === bb.id))), 1900);
  }, []);

  /* ── Score ── */
  const addScore = useCallback((pts: number, x: number, y: number, snd: () => void, vb: number | number[] = 25, fx?: string) => {
    burst(x, y, pts > 4 ? 16 : 10);
    ring(x, y, 60, BCOLS[ri(0, BCOLS.length)]);
    snd(); vib(vb);
    cRef.current++;
    if (cT.current) clearTimeout(cT.current);
    cT.current = setTimeout(() => { cRef.current = 0; }, 1700);
    const mul = cRef.current > 5 ? 3 : cRef.current > 3 ? 2 : cRef.current > 1 ? 1.5 : 1;
    const got = Math.round(pts * mul);
    sRef.current = Math.min(sRef.current + got, WIN);
    setScore(sRef.current);
    if (cRef.current > 1) { setCombo(cRef.current > 6 ? `🔥🔥🔥 x${cRef.current} MEGA!` : cRef.current > 3 ? `🔥 x${cRef.current} COMBO!` : `✨ x${cRef.current}`); setShowC(true); setTimeout(() => setShowC(false), 1100); }

    /* Special FX */
    if (fx === 'blackhole') { flash('rgba(0,0,0,.8)', 500); for (let i = 0; i < 8; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 5), i * 40); }
    if (fx === 'nova')      { flash('rgba(255,220,60,.5)', 600); for (let i = 0; i < 24; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 5), i * 55); }
    if (fx === 'aurora')    { setAurora(true); setTimeout(() => setAurora(false), 2500); }
    if (fx === 'ufo')       { for (let i = 0; i < 8; i++) setTimeout(() => burst(x + r(-120, 120), y + r(-80, 80), 6), i * 70); }
    if (fx === 'alien')     { flash('rgba(0,255,120,.18)', 350); }
    if (fx === 'portal')    { flash('rgba(138,43,226,.35)', 500); setAurora(true); setTimeout(() => setAurora(false), 1500); }
    if (fx === 'sun')       { flash('rgba(255,200,0,.3)', 400); }

    /* Reset idle */
    if (iT.current) clearTimeout(iT.current);
    setHint(false);
    iT.current = setTimeout(() => setHint(true), 8000);

    /* Win */
    if (sRef.current >= WIN && !wFired.current) {
      wFired.current = true;
      setTqAnim('tqDance');
      S.win(); vib([100, 50, 100, 50, 100, 50, 250]);
      for (let i = 0; i < 40; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 7), i * 70);
      setTimeout(() => setWin(true), 2200);
    }
  }, [burst, ring, flash]);

  /* ── Spawn objects ── */
  const spawnObj = useCallback(() => {
    const sp = SPECS[ri(0, SPECS.length)];
    const sz = ri(sp.sz[0], sp.sz[1]);
    setFobjs(fo => [...fo, { id: uid++, x: r(4, 86), y: r(6, 72), sz, sp }]);
  }, []);
  const clickObj = useCallback((id: number, x: number, y: number, fo: FObj) => {
    addScore(fo.sp.pts, x, y, fo.sp.snd, fo.sp.vb, fo.sp.fx);
    ring(x, y, fo.sz * 2.2, 'rgba(255,255,255,.7)');
    setFobjs(f => f.filter(o => o.id !== id));
    setTimeout(spawnObj, r(2500, 6000));
  }, [addScore, ring, spawnObj]);

  /* ── Spawn stars ── */
  const spawnStar = useCallback(() => {
    const sz = ri(20, 38);
    setFstars(fs => [...fs, { id: uid++, x: r(4, 90), y: r(4, 80), sz, e: ['⭐', '🌟', '💫', '✨', '🌠', '🌙', '☀️', '💥'][ri(0, 8)] }]);
  }, []);
  const clickStar = useCallback((id: number, x: number, y: number) => {
    addScore(1, x, y, S.star, 15);
    setFstars(fs => fs.filter(s => s.id !== id));
    setTimeout(spawnStar, r(1200, 3500));
  }, [addScore, spawnStar]);

  useEffect(() => {
    for (let i = 0; i < 7; i++) setTimeout(spawnStar, i * 500);
    for (let i = 0; i < 4; i++) setTimeout(spawnObj, i * 1600 + 600);
    const i1 = setInterval(() => { if (Math.random() < .5) spawnStar(); }, 3500);
    const i2 = setInterval(() => { if (Math.random() < .65) spawnObj(); }, 5500);
    iT.current = setTimeout(() => setHint(true), 8000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [spawnStar, spawnObj]);

  const filled = Math.min(5, Math.floor(sRef.current / (WIN / 5)));

  return (
    <div id="w" onClick={e => { if ((e.target as HTMLElement).id === 'w') addScore(1, e.nativeEvent.offsetX, e.nativeEvent.offsetY, () => osc(ri(350, 750), 0.2, 0.12), 12); }}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', cursor: 'default', fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(180deg,#04051a 0%,#080d3a 30%,#093058 65%,#074a55 100%)' }}>

      {/* Aurora */}
      {aurora && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, background: 'linear-gradient(180deg,rgba(0,255,160,.1) 0%,rgba(80,0,255,.07) 40%,transparent 75%)', animation: 'auroraIn 2.5s ease-in-out forwards' }} />}

      {/* Flashes */}
      {flashes.map(f => <div key={f.id} style={{ position: 'absolute', inset: 0, background: f.bg, pointerEvents: 'none', zIndex: 45 }} />)}

      {/* Nebulosas de fondo */}
      {[{ l: 5, t: 10, c: 'rgba(100,40,220,.07)' }, { l: 60, t: 25, c: 'rgba(0,180,200,.05)' }, { l: 15, t: 55, c: 'rgba(255,80,150,.04)' }, { l: 75, t: 60, c: 'rgba(80,200,100,.04)' }].map((n, i) => (
        <div key={i} style={{ position: 'absolute', left: `${n.l}%`, top: `${n.t}%`, width: 280, height: 180, borderRadius: '50%', background: n.c, filter: 'blur(40px)', pointerEvents: 'none' }} />
      ))}

      {/* Estrellas de fondo */}
      {Array.from({ length: 110 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', pointerEvents: 'none', width: i % 5 === 0 ? `${r(2, 4.5)}px` : `${r(0.8, 2.5)}px`, height: i % 5 === 0 ? `${r(2, 4.5)}px` : `${r(0.8, 2.5)}px`, background: i % 6 === 0 ? BCOLS[i % BCOLS.length] : 'white', opacity: r(.12, .9), top: `${r(0, 92)}%`, left: `${r(0, 100)}%`, animation: `tw${i % 4} ${r(1.5, 5)}s ${r(0, 4)}s infinite` }} />
      ))}

      {/* Score */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7, zIndex: 30 }}>
        {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 26, transition: 'transform .35s', transform: i === filled ? 'scale(1.65)' : 'scale(1)', filter: i <= filled ? 'drop-shadow(0 0 8px #FFD700)' : 'none' }}>{i <= filled ? '⭐' : '☆'}</span>)}
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: 'rgba(255,255,255,.4)', zIndex: 30 }}>{sRef.current}/{WIN}</div>
      <button onClick={() => router.push('/')} style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 50, padding: '6px 14px', fontSize: 13, color: 'white', cursor: 'pointer', zIndex: 30 }}>← Inicio</button>
      {showC && <div style={{ position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)', fontSize: 24, fontWeight: 900, color: '#FFD700', whiteSpace: 'nowrap', textShadow: '0 0 16px rgba(255,200,0,.9)', zIndex: 30, pointerEvents: 'none' }}>{combo}</div>}

      {/* Planetas con anillos */}
      {PLANETS.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, zIndex: 6 }}>
          {p.rings && <div style={{ position: 'absolute', top: '50%', left: '50%', width: p.sz * 1.9, height: p.sz * .38, marginLeft: -p.sz * .95, marginTop: -p.sz * .19, borderRadius: '50%', border: '3.5px solid rgba(255,255,255,.22)', transform: 'rotateX(62deg)', pointerEvents: 'none', boxShadow: '0 0 8px rgba(255,255,255,.1)' }} />}
          <div
            onClick={e => { e.stopPropagation(); const el = e.currentTarget.parentElement!; addScore(p.pts, el.offsetLeft + p.sz / 2, el.offsetTop + p.sz / 2, () => S.planet(p.f), 35); ring(el.offsetLeft + p.sz / 2, el.offsetTop + p.sz / 2, p.sz * 1.1, p.gl); }}
            style={{ width: p.sz, height: p.sz, borderRadius: '50%', background: p.bg, cursor: 'pointer', transition: 'transform .15s', animation: `pBob${i % 4} ${3.5 + i * .35}s ${i * .3}s ease-in-out infinite`, boxShadow: `inset -${p.sz * .16}px -${p.sz * .16}px ${p.sz * .28}px rgba(0,0,0,.55),0 0 ${p.sz * .65}px ${p.gl},0 0 ${p.sz * 1.4}px ${p.gl.replace('.75', '.2')}` }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.18)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title={p.name}
          />
        </div>
      ))}

      {/* Luna */}
      <div onClick={e => { e.stopPropagation(); setMoon(1.25); setTimeout(() => setMoon(1), 300); addScore(3, e.currentTarget.offsetLeft + 28, e.currentTarget.offsetTop + 28, S.moon, 45); ring(e.currentTarget.offsetLeft + 28, e.currentTarget.offsetTop + 28, 58, 'rgba(255,220,80,.8)'); for (let i = 0; i < 5; i++) setTimeout(() => burst(e.currentTarget.offsetLeft + r(-60, 60), e.currentTarget.offsetTop + r(-40, 40), 5), i * 70); }}
        style={{ position: 'absolute', right: '12%', top: '13%', width: 56, height: 56, borderRadius: '50%', cursor: 'pointer', zIndex: 7, background: 'radial-gradient(circle at 33% 33%,#fffde7,#ffd54f 58%,#ffb300)', boxShadow: 'inset -9px -9px 18px rgba(0,0,0,.35),0 0 32px rgba(255,210,60,.7)', transform: `scale(${moon})`, transition: 'transform .22s', animation: 'moonPulse 4s ease-in-out infinite' }} />

      {/* Estrellas flotantes */}
      {fstars.map(fs => (
        <div key={fs.id} onClick={e => { e.stopPropagation(); clickStar(fs.id, e.currentTarget.offsetLeft + fs.sz / 2, e.currentTarget.offsetTop + fs.sz / 2); }}
          style={{ position: 'absolute', left: `${fs.x}%`, top: `${fs.y}%`, fontSize: fs.sz, cursor: 'pointer', zIndex: 13, lineHeight: 1, transition: 'transform .12s', animation: `starF ${r(2, 4)}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.5) rotate(20deg)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        >{fs.e}</div>
      ))}

      {/* Objetos especiales */}
      {fobjs.map(fo => (
        <div key={fo.id} onClick={e => { e.stopPropagation(); clickObj(fo.id, e.currentTarget.offsetLeft + fo.sz / 2, e.currentTarget.offsetTop + fo.sz / 2, fo); }}
          style={{ position: 'absolute', left: `${fo.x}%`, top: `${fo.y}%`, fontSize: fo.sz, cursor: 'pointer', zIndex: 14, lineHeight: 1, transition: 'transform .12s', animation: `${fo.sp.anim} ${r(3, 6)}s ease-in-out infinite` }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.38)'; e.currentTarget.style.filter = 'drop-shadow(0 0 14px gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = ''; }}
          title={fo.sp.id}
        >{fo.sp.e}</div>
      ))}

      {/* Anillos */}
      {rings.map(rr => <div key={rr.id} style={{ position: 'absolute', left: rr.x - rr.sz / 2, top: rr.y - rr.sz / 2, width: rr.sz, height: rr.sz, borderRadius: '50%', border: `2.5px solid ${rr.c}`, pointerEvents: 'none', zIndex: 22, animation: 'ringOut .65s ease-out forwards' }} />)}

      {/* Toqwow */}
      <div
        onClick={e => { e.stopPropagation(); addScore(6, window.innerWidth / 2, window.innerHeight * .65, S.toqwow, [55, 30, 55, 30, 110], 'nova'); for (let i = 0; i < 16; i++) setTimeout(() => burst(r(0, window.innerWidth), r(0, window.innerHeight), 7), i * 55); }}
        style={{ position: 'absolute', bottom: 48, left: '50%', width: 'min(168px,29vw)', cursor: 'pointer', zIndex: 16, filter: 'drop-shadow(0 0 26px rgba(184,169,255,.85))', transform: 'translateX(-50%)', animation: `${tqAnim} 3.2s ease-in-out infinite`, transition: 'filter .2s' }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 44px rgba(184,169,255,1))')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'drop-shadow(0 0 26px rgba(184,169,255,.85))')}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={168} height={212} style={{ objectFit: 'contain', width: '100%', height: 'auto', mixBlendMode: 'screen' }} priority />
      </div>

      {hint && !win && <div style={{ position: 'absolute', bottom: 228, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,.93)', borderRadius: 22, padding: '10px 22px', fontSize: 15, fontWeight: 700, color: '#4422aa', whiteSpace: 'nowrap', zIndex: 17, boxShadow: '0 4px 28px rgba(0,0,0,.28)', animation: 'hintPop .4s ease-out' }}>👆 ¡Toca los planetas y las estrellas!</div>}

      {parts.map(p => <div key={p.id} style={{ position: 'absolute', left: p.x - 14, top: p.y - 14, fontSize: ri(20, 32), pointerEvents: 'none', zIndex: 26, lineHeight: 1, animation: 'burstP 1s ease-out forwards' }}>{p.e}</div>)}
      {bubbles.map(b => <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y, width: b.sz, height: b.sz, borderRadius: '50%', background: b.c, opacity: .78, pointerEvents: 'none', zIndex: 21, animation: 'riseB 1.9s ease-out forwards' }} />)}

      {!win && <div style={{ position: 'absolute', bottom: 13, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.32)', fontSize: 11, pointerEvents: 'none', zIndex: 31, whiteSpace: 'nowrap', animation: 'hPulse 3s ease-in-out infinite' }}>🌟 ¡Toca todo lo que veas! — Toqwow te espera 🐨</div>}

      {win && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,5,26,.9)', backdropFilter: 'blur(14px)', animation: 'fadeW .8s ease-out' }}>
          <div style={{ fontSize: 96, animation: 'wBounce .5s ease-in-out infinite alternate', marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#FFD700', textShadow: '0 0 36px rgba(255,200,0,.95)', marginBottom: 6, textAlign: 'center' }}>¡INCREÍBLE!</div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,.92)', marginBottom: 4, textAlign: 'center' }}>Conquistaste el Planeta Tiqui</div>
          <div style={{ fontSize: 15, color: 'rgba(184,169,255,.8)', marginBottom: 30, textAlign: 'center' }}>Sistema Tiqui · Mundo 0 completado 🌌</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 42, filter: 'drop-shadow(0 0 10px #FFD700)', animation: `starPop .4s ${i * .1}s ease-out both` }}>⭐</span>)}
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button onClick={() => { sRef.current = 0; wFired.current = false; cRef.current = 0; setScore(0); setWin(false); setTqAnim('tFloat'); }} style={{ background: 'linear-gradient(135deg,#B8A9FF,#7C6AE8)', border: 'none', borderRadius: 50, padding: '15px 34px', fontSize: 18, fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 0 32px rgba(184,169,255,.8)' }}>🔄 ¡Otra vez!</button>
            <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.11)', border: '2px solid rgba(255,255,255,.28)', borderRadius: 50, padding: '15px 34px', fontSize: 18, fontWeight: 800, color: 'white', cursor: 'pointer' }}>🏠 Inicio</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tw0{0%,100%{opacity:.15}50%{opacity:.95}} @keyframes tw1{0%,100%{opacity:.75}50%{opacity:.08}} @keyframes tw2{0%,100%{opacity:.45}33%{opacity:.95}66%{opacity:.08}} @keyframes tw3{0%,100%{opacity:.6}50%{opacity:.1}}
        @keyframes tFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-18px)}}
        @keyframes tqDance{0%{transform:translateX(-50%) rotate(-12deg) scale(1.18)}100%{transform:translateX(-50%) rotate(12deg) scale(1.18)}}
        @keyframes pBob0{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes pBob1{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-6px) rotate(5deg)}} @keyframes pBob2{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}} @keyframes pBob3{0%,100%{transform:translateY(0)}25%{transform:translateY(-5px)}75%{transform:translateY(-3px)}}
        @keyframes moonPulse{0%,100%{box-shadow:inset -9px -9px 18px rgba(0,0,0,.35),0 0 32px rgba(255,210,60,.7)}50%{box-shadow:inset -9px -9px 18px rgba(0,0,0,.35),0 0 52px rgba(255,230,80,1)}}
        @keyframes starF{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-10px) rotate(15deg)}}
        @keyframes rocketA{0%,100%{transform:translateY(0) rotate(-12deg)}50%{transform:translateY(-18px) rotate(12deg)}}
        @keyframes ufoA{0%,100%{transform:translateX(0)}25%{transform:translateX(10px) rotate(5deg)}75%{transform:translateX(-10px) rotate(-5deg)}}
        @keyframes cometA{0%{transform:translate(0,0) rotate(-35deg);opacity:1}100%{transform:translate(60px,45px) rotate(-35deg);opacity:0}}
        @keyframes satA{0%,100%{transform:translateX(0) rotate(0deg)}50%{transform:translateX(25px) rotate(360deg)}}
        @keyframes rainA{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.85}}
        @keyframes blackA{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.08) rotate(180deg)}}
        @keyframes meteorA{0%{transform:translate(0,0) rotate(50deg)}100%{transform:translate(70px,70px) rotate(50deg);opacity:0}}
        @keyframes galaxyA{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(25deg) scale(1.1)}}
        @keyframes alienA{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.12)}}
        @keyframes novaA{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.18);filter:brightness(1.6)}}
        @keyframes nebA{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.15);opacity:1}}
        @keyframes portalA{0%{transform:rotate(0deg) scale(1)}100%{transform:rotate(360deg) scale(1)}}
        @keyframes iceA{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(15deg)}}
        @keyframes crystalA{0%,100%{transform:scale(1) rotate(0deg);filter:brightness(1)}50%{transform:scale(1.1) rotate(10deg);filter:brightness(1.5)}}
        @keyframes fireA{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1.12) translateY(-6px)}}
        @keyframes thunderA{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
        @keyframes sunA{0%,100%{transform:scale(1) rotate(0deg);filter:brightness(1)}50%{transform:scale(1.1) rotate(180deg);filter:brightness(1.4)}}
        @keyframes starA{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.3) rotate(72deg)}}
        @keyframes ringOut{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.5);opacity:0}}
        @keyframes burstP{0%{opacity:1;transform:scale(.25) translateY(0) rotate(0deg)}100%{opacity:0;transform:scale(2) translateY(-90px) rotate(200deg)}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-160px) scale(.1)}}
        @keyframes auroraIn{0%{opacity:0}30%{opacity:1}80%{opacity:1}100%{opacity:0}}
        @keyframes hintPop{0%{opacity:0;transform:translateX(-50%) translateY(12px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes hPulse{0%,100%{opacity:.28}50%{opacity:.75}}
        @keyframes fadeW{from{opacity:0}to{opacity:1}} @keyframes wBounce{from{transform:scale(1) rotate(-10deg)}to{transform:scale(1.22) rotate(10deg)}}
        @keyframes starPop{0%{transform:scale(0) rotate(-40deg)}60%{transform:scale(1.4) rotate(12deg)}100%{transform:scale(1) rotate(0deg)}}
      `}</style>
    </div>
  );
}
