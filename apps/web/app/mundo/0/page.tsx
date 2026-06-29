'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

const EMOJIS = ['✨','🌟','💫','⚡','🎉','🌈','💥','🎊','💎','🔮','🪄','🌠','🦋','🌺'];
const COLS = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB','#98FB98','#FFA07A'];
const FLOAT_EMOJIS = ['⭐','🌟','💫','✨','🌠'];

const PLANETS = [
  { x:9,  y:12, size:58, bg:'radial-gradient(circle at 35% 30%,#ff9a9e,#c0392b 70%,#7b241c)', glow:'rgba(255,100,100,.6)', pts:2 },
  { x:74, y:8,  size:48, bg:'radial-gradient(circle at 40% 35%,#a8edea,#2ecc71 60%,#1a8a4a)', glow:'rgba(46,204,113,.6)',  pts:2 },
  { x:87, y:44, size:38, bg:'radial-gradient(circle at 35% 30%,#ffecd2,#f39c12 60%,#d68910)', glow:'rgba(243,156,18,.6)',  pts:2 },
  { x:3,  y:46, size:44, bg:'radial-gradient(circle at 40% 30%,#d7bde2,#8e44ad 60%,#5b2c6f)', glow:'rgba(142,68,173,.6)', pts:2 },
  { x:57, y:3,  size:32, bg:'radial-gradient(circle at 35% 35%,#aed6f1,#2980b9 60%,#1a5276)', glow:'rgba(41,128,185,.6)', pts:2 },
  { x:30, y:6,  size:24, bg:'radial-gradient(circle at 40% 30%,#f8c8f8,#c84fc8 60%,#8a1a8a)', glow:'rgba(200,80,200,.5)', pts:2 },
];

const r  = (a:number,b:number) => a + Math.random()*(b-a);
const ri = (a:number,b:number) => Math.floor(r(a,b));
let uid = 0;

type Particle  = { id:number; x:number; y:number; emoji:string };
type Bubble    = { id:number; x:number; y:number; color:string; size:number };
type FloatStar = { id:number; x:number; y:number; size:number; emoji:string };

export default function Mundo0() {
  const [particles,   setParticles]   = useState<Particle[]>([]);
  const [bubbles,     setBubbles]     = useState<Bubble[]>([]);
  const [floatStars,  setFloatStars]  = useState<FloatStar[]>([]);
  const [score,       setScore]       = useState(0);
  const [comboText,   setComboText]   = useState('');
  const [showCombo,   setShowCombo]   = useState(false);
  const [toqwowScale, setToqwowScale] = useState(1);
  const [moonScale,   setMoonScale]   = useState(1);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const addBurst = useCallback((x:number, y:number) => {
    const id = uid++;
    setParticles(p => [...p, { id, x, y, emoji: EMOJIS[ri(0,EMOJIS.length)] }]);
    setTimeout(() => setParticles(p => p.filter(b => b.id !== id)), 900);

    const newBubs: Bubble[] = Array.from({length:6}, () => ({
      id: uid++, x: x+r(-35,35), y: y+r(-10,15),
      color: COLS[ri(0,COLS.length)], size: r(5,17),
    }));
    setBubbles(b => [...b, ...newBubs]);
    setTimeout(() => setBubbles(b => b.filter(bb => !newBubs.find(nb => nb.id===bb.id))), 1800);
  }, []);

  const addScore = useCallback((pts:number, x:number, y:number) => {
    addBurst(x, y);
    comboRef.current += 1;
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => { comboRef.current = 0; }, 1600);
    const actual = pts * (comboRef.current > 2 ? 2 : 1);
    scoreRef.current += actual;
    setScore(scoreRef.current);
    if (comboRef.current > 2) {
      setComboText(comboRef.current > 4 ? `🔥 COMBO x${comboRef.current}!` : `✨ x${comboRef.current}`);
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 900);
    }
  }, [addBurst]);

  const spawnStar = useCallback(() => {
    const id = uid++;
    setFloatStars(fs => [...fs, {
      id, x:r(5,88), y:r(5,78), size:ri(22,36),
      emoji: FLOAT_EMOJIS[ri(0,FLOAT_EMOJIS.length)],
    }]);
  }, []);

  const clickStar = useCallback((id:number, x:number, y:number) => {
    addScore(1, x, y);
    setFloatStars(fs => fs.filter(s => s.id !== id));
    setTimeout(spawnStar, r(2000,4500));
  }, [addScore, spawnStar]);

  useEffect(() => {
    for (let i=0; i<5; i++) setTimeout(spawnStar, i*700);
    const iv = setInterval(() => { if (Math.random()<.4) spawnStar(); }, 4500);
    return () => clearInterval(iv);
  }, [spawnStar]);

  const filled = Math.min(5, Math.floor(scoreRef.current/7));

  return (
    <div
      id="world"
      onClick={e => {
        if ((e.target as HTMLElement).id === 'world')
          addScore(1, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      }}
      style={{
        width:'100vw', height:'100vh', overflow:'hidden', position:'relative',
        background:'linear-gradient(180deg,#060a1f 0%,#0d1a4a 38%,#0a3565 68%,#0a5070 100%)',
        cursor:'default', fontFamily:'system-ui,sans-serif',
      }}
    >
      {/* Estrellas de fondo estáticas */}
      {Array.from({length:90}).map((_,i) => (
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', pointerEvents:'none',
          width:  i%6===0 ? `${r(2,4)}px` : `${r(1,2.5)}px`,
          height: i%6===0 ? `${r(2,4)}px` : `${r(1,2.5)}px`,
          background: i%7===0 ? COLS[i%COLS.length] : 'white',
          opacity: r(.15,.85),
          top:`${r(0,90)}%`, left:`${r(0,100)}%`,
        }}/>
      ))}

      {/* Score */}
      <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:30 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize:22 }}>{i<=filled?'⭐':'☆'}</span>
        ))}
      </div>

      {/* Combo */}
      {showCombo && (
        <div style={{
          position:'absolute', top:50, left:'50%', transform:'translateX(-50%)',
          fontSize:22, fontWeight:900, color:'#FFD700', whiteSpace:'nowrap',
          textShadow:'0 0 10px rgba(255,200,0,.8)', zIndex:30, pointerEvents:'none',
        }}>{comboText}</div>
      )}

      {/* Planetas */}
      {PLANETS.map((p,i) => (
        <div key={i}
          onClick={e => { e.stopPropagation(); addScore(p.pts, e.currentTarget.offsetLeft+p.size/2, e.currentTarget.offsetTop+p.size/2); }}
          style={{
            position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:'50%',
            background:p.bg, cursor:'pointer', transition:'transform .15s',
            boxShadow:`inset -${p.size*.15}px -${p.size*.15}px ${p.size*.25}px rgba(0,0,0,.4),0 0 ${p.size*.55}px ${p.glow}`,
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.15)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        />
      ))}

      {/* Luna */}
      <div
        onClick={e => {
          e.stopPropagation();
          setMoonScale(1.18); setTimeout(()=>setMoonScale(1),250);
          addScore(3, e.currentTarget.offsetLeft+27, e.currentTarget.offsetTop+27);
        }}
        style={{
          position:'absolute', right:'14%', top:'15%',
          width:54, height:54, borderRadius:'50%', cursor:'pointer',
          background:'radial-gradient(circle at 35% 35%,#fffde7,#ffd54f 60%,#ffb300)',
          boxShadow:'inset -8px -8px 16px rgba(0,0,0,.3),0 0 28px rgba(255,200,50,.55)',
          transform:`scale(${moonScale})`, transition:'transform .2s',
        }}
      />

      {/* Estrellas flotantes clickeables — texto plano para evitar cuadraditos */}
      {floatStars.map(fs => (
        <div key={fs.id}
          onClick={e => { e.stopPropagation(); clickStar(fs.id, e.currentTarget.offsetLeft+fs.size/2, e.currentTarget.offsetTop+fs.size/2); }}
          style={{
            position:'absolute', left:`${fs.x}%`, top:`${fs.y}%`,
            fontSize:fs.size, cursor:'pointer', zIndex:12,
            transition:'transform .12s', lineHeight:1,
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.4)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        >{fs.emoji}</div>
      ))}

      {/* TOQWOW — imagen real, mix-blend-mode screen elimina el fondo */}
      <div
        onClick={e => {
          e.stopPropagation();
          setToqwowScale(1.2); setTimeout(()=>setToqwowScale(1),300);
          const rect = e.currentTarget.getBoundingClientRect();
          addScore(5, window.innerWidth/2, window.innerHeight*.65);
          for(let i=0;i<10;i++) setTimeout(()=>addBurst(r(window.innerWidth*.1,window.innerWidth*.9), r(window.innerHeight*.15,window.innerHeight*.75)),i*70);
        }}
        style={{
          position:'absolute', bottom:50, left:'50%',
          transform:`translateX(-50%) scale(${toqwowScale})`,
          width:'min(160px,28vw)', cursor:'pointer', zIndex:15,
          filter:'drop-shadow(0 0 24px rgba(184,169,255,.8))',
          animation:'tFloat 3.2s ease-in-out infinite',
          transition:'transform .2s,filter .2s',
        }}
        onMouseEnter={e=>(e.currentTarget.style.filter='drop-shadow(0 0 36px rgba(184,169,255,1))')}
        onMouseLeave={e=>(e.currentTarget.style.filter='drop-shadow(0 0 24px rgba(184,169,255,.8))')}
      >
        <Image
          src="/toqwow-mascota.png"
          alt="Toqwow"
          width={160} height={200}
          style={{ objectFit:'contain', width:'100%', height:'auto', mixBlendMode:'screen' }}
          priority
        />
      </div>

      {/* Partículas */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:p.x-13, top:p.y-13,
          fontSize:26, pointerEvents:'none', zIndex:25, lineHeight:1,
          animation:'bAnim .9s ease-out forwards',
        }}>{p.emoji}</div>
      ))}

      {/* Burbujas */}
      {bubbles.map(b => (
        <div key={b.id} style={{
          position:'absolute', left:b.x, top:b.y,
          width:b.size, height:b.size, borderRadius:'50%',
          background:b.color, opacity:.7,
          pointerEvents:'none', zIndex:20,
          animation:'rAnim 1.8s ease-out forwards',
        }}/>
      ))}

      {/* Hint */}
      <div style={{
        position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
        color:'rgba(255,255,255,.38)', fontSize:11, pointerEvents:'none',
        zIndex:30, whiteSpace:'nowrap',
      }}>🌟 ¡Toca todo lo que veas!</div>

      <style>{`
        @keyframes tFloat { 0%,100%{transform:translateX(-50%) translateY(0) scale(1)} 50%{transform:translateX(-50%) translateY(-14px) scale(1)} }
        @keyframes bAnim  { 0%{opacity:1;transform:scale(.4) translateY(0)} 100%{opacity:0;transform:scale(1.6) translateY(-70px)} }
        @keyframes rAnim  { 0%{opacity:.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-130px) scale(.2)} }
      `}</style>
    </div>
  );
}
