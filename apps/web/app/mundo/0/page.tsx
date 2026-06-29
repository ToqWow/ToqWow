'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

/* ─── Sonidos web sintetizados (sin archivos externos) ─── */
let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}
function playPop(freq = 440, vol = 0.3) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, c.currentTime + 0.1);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.start(); o.stop(c.currentTime + 0.3);
  } catch {}
}
function playChime(freqs: number[]) {
  freqs.forEach((f, i) => setTimeout(() => playPop(f, 0.25), i * 120));
}
function playWin() {
  playChime([523, 659, 784, 1047, 1319]);
}
function vibrate(ms: number | number[]) {
  try { navigator.vibrate?.(ms); } catch {}
}

/* ─── Constantes ─── */
const EMOJIS  = ['✨','🌟','💫','⚡','🎉','🌈','💥','🎊','💎','🔮','🪄','🌠','🦋','🌺'];
const COLS    = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB','#98FB98','#FFA07A'];
const FSTARS  = ['⭐','🌟','💫','✨','🌠'];

const PLANETS = [
  { x:9,  y:11, sz:58, bg:'radial-gradient(circle at 35% 30%,#ff9a9e,#c0392b 70%,#7b241c)', gl:'rgba(255,100,100,.6)', pts:2, freq:330 },
  { x:74, y:7,  sz:48, bg:'radial-gradient(circle at 40% 35%,#a8edea,#2ecc71 60%,#1a8a4a)', gl:'rgba(46,204,113,.6)',  pts:2, freq:440 },
  { x:87, y:44, sz:38, bg:'radial-gradient(circle at 35% 30%,#ffecd2,#f39c12 60%,#d68910)', gl:'rgba(243,156,18,.6)',  pts:2, freq:550 },
  { x:3,  y:46, sz:44, bg:'radial-gradient(circle at 40% 30%,#d7bde2,#8e44ad 60%,#5b2c6f)', gl:'rgba(142,68,173,.6)', pts:2, freq:392 },
  { x:57, y:3,  sz:32, bg:'radial-gradient(circle at 35% 35%,#aed6f1,#2980b9 60%,#1a5276)', gl:'rgba(41,128,185,.6)', pts:2, freq:494 },
  { x:30, y:6,  sz:26, bg:'radial-gradient(circle at 40% 30%,#f8c8f8,#c84fc8 60%,#8a1a8a)', gl:'rgba(200,80,200,.5)', pts:2, freq:587 },
];

const OBJECTS = [
  { id:'rocket', emoji:'🚀', label:'cohete', pts:4, freq:660, vib:50 },
  { id:'ufo',    emoji:'🛸', label:'ovni',   pts:4, freq:220, vib:[30,20,30] },
  { id:'comet',  emoji:'☄️', label:'cometa', pts:3, freq:440, vib:40 },
  { id:'sat',    emoji:'🛰️', label:'satélite',pts:3, freq:370, vib:30 },
  { id:'cloud',  emoji:'🌈', label:'arco',   pts:2, freq:528, vib:20 },
  { id:'black',  emoji:'🕳️', label:'agujero',pts:5, freq:110, vib:[50,30,50,30,50] },
];

const r  = (a:number,b:number) => a + Math.random()*(b-a);
const ri = (a:number,b:number) => Math.floor(r(a,b));
let uid = 0;

type Particle  = { id:number; x:number; y:number; emoji:string };
type Bubble    = { id:number; x:number; y:number; color:string; sz:number };
type FloatStar = { id:number; x:number; y:number; sz:number; emoji:string };
type FloatObj  = { id:number; x:number; y:number; sz:number; obj: typeof OBJECTS[0] };

export default function Mundo0() {
  const [particles,  setParticles]  = useState<Particle[]>([]);
  const [bubbles,    setBubbles]    = useState<Bubble[]>([]);
  const [fstars,     setFstars]     = useState<FloatStar[]>([]);
  const [fobjs,      setFobjs]      = useState<FloatObj[]>([]);
  const [score,      setScore]      = useState(0);
  const [comboTxt,   setComboTxt]   = useState('');
  const [showCombo,  setShowCombo]  = useState(false);
  const [tqScale,    setTqScale]    = useState(1);
  const [moonScale,  setMoonScale]  = useState(1);
  const [win,        setWin]        = useState(false);
  const [hint,       setHint]       = useState('🌟 ¡Toca todo lo que veas!');
  const [tqHint,     setTqHint]     = useState(false); // Toqwow señala algo
  const [tqDance,    setTqDance]    = useState(false);

  const scoreRef  = useRef(0);
  const comboRef  = useRef(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const idleTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const winFired   = useRef(false);

  /* ─── Burst ─── */
  const addBurst = useCallback((x:number, y:number, freq=440) => {
    const id = uid++;
    setParticles(p => [...p, { id, x, y, emoji: EMOJIS[ri(0,EMOJIS.length)] }]);
    setTimeout(() => setParticles(p => p.filter(b => b.id !== id)), 900);
    const newB: Bubble[] = Array.from({length:6}, () => ({
      id:uid++, x:x+r(-35,35), y:y+r(-10,15), color:COLS[ri(0,COLS.length)], sz:r(5,17),
    }));
    setBubbles(b => [...b, ...newB]);
    setTimeout(() => setBubbles(b => b.filter(bb => !newB.find(n=>n.id===bb.id))), 1800);
    playPop(freq);
    vibrate(25);
  }, []);

  /* ─── Score ─── */
  const addScore = useCallback((pts:number, x:number, y:number, freq=440, vib:number|number[]=25) => {
    addBurst(x, y, freq);
    vibrate(vib);
    comboRef.current += 1;
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => { comboRef.current = 0; }, 1600);
    const actual = pts * (comboRef.current > 2 ? 2 : 1);
    scoreRef.current = Math.min(scoreRef.current + actual, 35);
    setScore(scoreRef.current);
    if (comboRef.current > 2) {
      setComboTxt(comboRef.current > 4 ? `🔥 COMBO x${comboRef.current}!` : `✨ x${comboRef.current}`);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 900);
    }
    // Reset idle timer
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setTqHint(false);
    idleTimer.current = setTimeout(() => setTqHint(true), 8000);
    // Win condition
    if (scoreRef.current >= 35 && !winFired.current) {
      winFired.current = true;
      setTimeout(() => {
        setTqDance(true);
        playWin();
        vibrate([100,50,100,50,200]);
        setTimeout(() => setWin(true), 1200);
      }, 300);
    }
  }, [addBurst]);

  /* ─── Estrellas flotantes ─── */
  const spawnStar = useCallback(() => {
    setFstars(fs => [...fs, { id:uid++, x:r(5,88), y:r(5,78), sz:ri(22,36), emoji:FSTARS[ri(0,FSTARS.length)] }]);
  }, []);
  const clickStar = useCallback((id:number, x:number, y:number) => {
    addScore(1, x, y, 660, 20);
    setFstars(fs => fs.filter(s => s.id !== id));
    setTimeout(spawnStar, r(2000,4500));
  }, [addScore, spawnStar]);

  /* ─── Objetos especiales flotantes ─── */
  const spawnObj = useCallback(() => {
    const obj = OBJECTS[ri(0,OBJECTS.length)];
    setFobjs(fo => [...fo, { id:uid++, x:r(5,85), y:r(8,70), sz:ri(28,44), obj }]);
  }, []);
  const clickObj = useCallback((id:number, x:number, y:number, obj:typeof OBJECTS[0]) => {
    addScore(obj.pts, x, y, obj.freq, obj.vib as any);
    setFobjs(fo => fo.filter(o => o.id !== id));
    setTimeout(spawnObj, r(4000,8000));
  }, [addScore, spawnObj]);

  useEffect(() => {
    for (let i=0; i<5; i++) setTimeout(spawnStar, i*700);
    for (let i=0; i<2; i++) setTimeout(spawnObj, i*2000 + 1000);
    const iv1 = setInterval(() => { if (Math.random()<.4) spawnStar(); }, 4500);
    const iv2 = setInterval(() => { if (Math.random()<.5) spawnObj(); }, 7000);
    idleTimer.current = setTimeout(() => setTqHint(true), 8000);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [spawnStar, spawnObj]);

  const filled = Math.min(5, Math.floor(scoreRef.current / 7));

  return (
    <div
      id="world"
      onClick={e => {
        if ((e.target as HTMLElement).id === 'world')
          addScore(1, e.nativeEvent.offsetX, e.nativeEvent.offsetY, 440, 15);
      }}
      style={{
        width:'100vw', height:'100vh', overflow:'hidden', position:'relative',
        background:'linear-gradient(180deg,#060a1f 0%,#0d1a4a 38%,#0a3565 68%,#0a5070 100%)',
        cursor:'default', fontFamily:'system-ui,sans-serif',
      }}
    >
      {/* Fondo de estrellas */}
      {Array.from({length:90}).map((_,i) => (
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', pointerEvents:'none',
          width: i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          height:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          background:i%7===0?COLS[i%COLS.length]:'white',
          opacity:r(.15,.85), top:`${r(0,90)}%`, left:`${r(0,100)}%`,
        }}/>
      ))}

      {/* Score bar */}
      <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:30 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize:24, transition:'transform .3s', transform:i===filled?'scale(1.5)':'scale(1)' }}>
            {i<=filled?'⭐':'☆'}
          </span>
        ))}
      </div>

      {/* Combo */}
      {showCombo && (
        <div style={{ position:'absolute', top:52, left:'50%', transform:'translateX(-50%)', fontSize:22, fontWeight:900, color:'#FFD700', whiteSpace:'nowrap', textShadow:'0 0 10px rgba(255,200,0,.8)', zIndex:30, pointerEvents:'none' }}>
          {comboTxt}
        </div>
      )}

      {/* Planetas */}
      {PLANETS.map((p,i) => (
        <div key={i}
          onClick={e => { e.stopPropagation(); addScore(p.pts, e.currentTarget.offsetLeft+p.sz/2, e.currentTarget.offsetTop+p.sz/2, p.freq, 35); }}
          style={{ position:'absolute', left:`${p.x}%`, top:`${p.y}%`, width:p.sz, height:p.sz, borderRadius:'50%', background:p.bg, cursor:'pointer', transition:'transform .15s', boxShadow:`inset -${p.sz*.15}px -${p.sz*.15}px ${p.sz*.25}px rgba(0,0,0,.4),0 0 ${p.sz*.55}px ${p.gl}` }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.15)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        />
      ))}

      {/* Luna */}
      <div
        onClick={e => { e.stopPropagation(); setMoonScale(1.2); setTimeout(()=>setMoonScale(1),250); addScore(3, e.currentTarget.offsetLeft+27, e.currentTarget.offsetTop+27, 528, 40); }}
        style={{ position:'absolute', right:'14%', top:'15%', width:54, height:54, borderRadius:'50%', cursor:'pointer', background:'radial-gradient(circle at 35% 35%,#fffde7,#ffd54f 60%,#ffb300)', boxShadow:'inset -8px -8px 16px rgba(0,0,0,.3),0 0 28px rgba(255,200,50,.55)', transform:`scale(${moonScale})`, transition:'transform .2s' }}
      />

      {/* Estrellas flotantes */}
      {fstars.map(fs => (
        <div key={fs.id}
          onClick={e => { e.stopPropagation(); clickStar(fs.id, e.currentTarget.offsetLeft+fs.sz/2, e.currentTarget.offsetTop+fs.sz/2); }}
          style={{ position:'absolute', left:`${fs.x}%`, top:`${fs.y}%`, fontSize:fs.sz, cursor:'pointer', zIndex:12, lineHeight:1, transition:'transform .12s' }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.4)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        >{fs.emoji}</div>
      ))}

      {/* Objetos especiales */}
      {fobjs.map(fo => (
        <div key={fo.id}
          onClick={e => { e.stopPropagation(); clickObj(fo.id, e.currentTarget.offsetLeft+fo.sz/2, e.currentTarget.offsetTop+fo.sz/2, fo.obj); }}
          style={{ position:'absolute', left:`${fo.x}%`, top:`${fo.y}%`, fontSize:fo.sz, cursor:'pointer', zIndex:13, lineHeight:1, transition:'transform .12s', animation:'objFloat 4s ease-in-out infinite' }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.3)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
          title={fo.obj.label}
        >{fo.obj.emoji}</div>
      ))}

      {/* TOQWOW */}
      <div
        onClick={e => {
          e.stopPropagation();
          setTqScale(1.22); setTimeout(()=>setTqScale(1),300);
          addScore(5, window.innerWidth/2, window.innerHeight*.65, 880, [40,20,40,20,80]);
          for(let i=0;i<12;i++) setTimeout(()=>addBurst(r(window.innerWidth*.05,window.innerWidth*.95),r(window.innerHeight*.1,window.innerHeight*.8),ri(300,900)),i*60);
        }}
        style={{
          position:'absolute', bottom:50, left:'50%',
          width:'min(160px,28vw)', cursor:'pointer', zIndex:15,
          filter:'drop-shadow(0 0 24px rgba(184,169,255,.8))',
          transform:`translateX(-50%) scale(${tqScale})`,
          animation: tqDance ? 'tqDanceAnim .3s ease-in-out infinite' : 'tFloat 3.2s ease-in-out infinite',
          transition:'filter .2s',
        }}
        onMouseEnter={e=>(e.currentTarget.style.filter='drop-shadow(0 0 36px rgba(184,169,255,1))')}
        onMouseLeave={e=>(e.currentTarget.style.filter='drop-shadow(0 0 24px rgba(184,169,255,.8))')}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={160} height={200}
          style={{ objectFit:'contain', width:'100%', height:'auto', mixBlendMode:'screen' }} priority />
      </div>

      {/* Toqwow hint bubble — señala algo después de 8 seg */}
      {tqHint && !win && (
        <div style={{ position:'absolute', bottom:220, left:'50%', transform:'translateX(-50%)', background:'rgba(255,255,255,.92)', borderRadius:20, padding:'8px 16px', fontSize:14, fontWeight:600, color:'#5533aa', whiteSpace:'nowrap', zIndex:16, boxShadow:'0 4px 20px rgba(0,0,0,.2)', animation:'hintBubble .4s ease-out' }}>
          👆 ¡Toca los planetas!
        </div>
      )}

      {/* Partículas */}
      {particles.map(p => (
        <div key={p.id} style={{ position:'absolute', left:p.x-13, top:p.y-13, fontSize:26, pointerEvents:'none', zIndex:25, lineHeight:1, animation:'bAnim .9s ease-out forwards' }}>{p.emoji}</div>
      ))}

      {/* Burbujas */}
      {bubbles.map(b => (
        <div key={b.id} style={{ position:'absolute', left:b.x, top:b.y, width:b.sz, height:b.sz, borderRadius:'50%', background:b.color, opacity:.7, pointerEvents:'none', zIndex:20, animation:'rAnim 1.8s ease-out forwards' }}/>
      ))}

      {/* Hint abajo */}
      {!win && (
        <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,.38)', fontSize:11, pointerEvents:'none', zIndex:30, whiteSpace:'nowrap' }}>
          🌟 ¡Toca todo lo que veas!
        </div>
      )}

      {/* WIN SCREEN */}
      {win && (
        <div style={{
          position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          background:'rgba(10,8,50,.85)', backdropFilter:'blur(8px)',
          animation:'fadeIn .6s ease-out',
        }}>
          <div style={{ fontSize:80, animation:'winBounce 0.6s ease-in-out infinite alternate', marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:42, fontWeight:900, color:'#FFD700', textShadow:'0 0 24px rgba(255,200,0,.8)', marginBottom:8 }}>¡Lo lograste!</div>
          <div style={{ fontSize:18, color:'rgba(255,255,255,.85)', marginBottom:32 }}>Exploraste el Planeta Tiqui 🌍</div>
          <div style={{ display:'flex', gap:8, marginBottom:32 }}>
            {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:36}}>⭐</span>)}
          </div>
          <button
            onClick={() => { scoreRef.current=0; winFired.current=false; setScore(0); setWin(false); setTqDance(false); comboRef.current=0; }}
            style={{ background:'linear-gradient(135deg,#B8A9FF,#7C6AE8)', border:'none', borderRadius:50, padding:'14px 36px', fontSize:18, fontWeight:700, color:'white', cursor:'pointer', boxShadow:'0 0 24px rgba(184,169,255,.6)' }}
          >
            🚀 ¡Jugar de nuevo!
          </button>
        </div>
      )}

      <style>{`
        @keyframes tFloat    { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-14px)} }
        @keyframes tqDanceAnim{ 0%{transform:translateX(-50%) rotate(-8deg) scale(1.1)} 100%{transform:translateX(-50%) rotate(8deg) scale(1.1)} }
        @keyframes bAnim     { 0%{opacity:1;transform:scale(.4) translateY(0)} 100%{opacity:0;transform:scale(1.6) translateY(-70px)} }
        @keyframes rAnim     { 0%{opacity:.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-130px) scale(.2)} }
        @keyframes objFloat  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-10px) rotate(5deg)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes winBounce { from{transform:scale(1) rotate(-5deg)} to{transform:scale(1.15) rotate(5deg)} }
        @keyframes hintBubble{ from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </div>
  );
}
