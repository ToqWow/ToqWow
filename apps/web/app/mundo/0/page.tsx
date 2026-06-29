'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

const EMOJIS = ['✨','🌟','💫','⚡','🎉','🌈','💥','🎊','💎','🔮','🪄','🌠','🦋','🌺'];
const COLS = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB','#98FB98','#FFA07A'];

const PLANETS = [
  { x:9, y:12, size:58, bg:'radial-gradient(circle at 35% 30%,#ff9a9e,#c0392b 70%,#7b241c)', glow:'rgba(255,100,100,.6)', pts:2 },
  { x:74, y:8, size:48, bg:'radial-gradient(circle at 40% 35%,#a8edea,#2ecc71 60%,#1a8a4a)', glow:'rgba(46,204,113,.6)', pts:2 },
  { x:87, y:44, size:38, bg:'radial-gradient(circle at 35% 30%,#ffecd2,#f39c12 60%,#d68910)', glow:'rgba(243,156,18,.6)', pts:2 },
  { x:3, y:46, size:44, bg:'radial-gradient(circle at 40% 30%,#d7bde2,#8e44ad 60%,#5b2c6f)', glow:'rgba(142,68,173,.6)', pts:2 },
  { x:57, y:3, size:32, bg:'radial-gradient(circle at 35% 35%,#aed6f1,#2980b9 60%,#1a5276)', glow:'rgba(41,128,185,.6)', pts:2 },
];

const r = (a:number,b:number) => a + Math.random()*(b-a);
const ri = (a:number,b:number) => Math.floor(r(a,b));

type Particle = { id:number; x:number; y:number; emoji:string; key:number };
type Bubble = { id:number; x:number; y:number; color:string; size:number; key:number };
type FloatStar = { id:number; x:number; y:number; size:number; emoji:string; key:number };

let uid = 0;

export default function Mundo0() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [floatStars, setFloatStars] = useState<FloatStar[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowBig, setToqwowBig] = useState(false);
  const [moonSpin, setMoonSpin] = useState(false);
  const comboRef = useRef(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const scoreRef = useRef(0);

  const addBurst = useCallback((x:number, y:number) => {
    const id = uid++;
    setParticles(p => [...p, { id, x, y, emoji: EMOJIS[ri(0,EMOJIS.length)], key: id }]);
    setTimeout(() => setParticles(p => p.filter(b => b.id !== id)), 900);

    const newBubbles = Array.from({length:6}, (_,i) => {
      const bid = uid++;
      return { id:bid, x:x+r(-35,35), y:y+r(-10,15), color:COLS[ri(0,8)], size:r(5,17), key:bid };
    });
    setBubbles(b => [...b, ...newBubbles]);
    setTimeout(() => setBubbles(b => b.filter(bb => !newBubbles.find(nb=>nb.id===bb.id))), 1800);
  }, []);

  const addScore = useCallback((pts:number, x:number, y:number) => {
    addBurst(x, y);
    comboRef.current += 1;
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => { comboRef.current = 0; }, 1600);
    const actual = pts * (comboRef.current > 2 ? 2 : 1);
    scoreRef.current += actual;
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    if (comboRef.current > 2) {
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 900);
    }
  }, [addBurst]);

  const spawnFloatStar = useCallback(() => {
    const id = uid++;
    setFloatStars(fs => [...fs, {
      id, x:r(5,88), y:r(5,82),
      size:ri(20,34),
      emoji:['⭐','🌟','💫','✨','🌠'][ri(0,5)],
      key:id
    }]);
  }, []);

  const removeFloatStar = useCallback((id:number, x:number, y:number) => {
    addScore(1, x, y);
    setFloatStars(fs => fs.filter(s => s.id !== id));
    setTimeout(spawnFloatStar, r(2500,5000));
  }, [addScore, spawnFloatStar]);

  useEffect(() => {
    for (let i=0; i<5; i++) setTimeout(spawnFloatStar, i*700);
    const interval = setInterval(() => {
      if (Math.random() < 0.4) spawnFloatStar();
    }, 4500);
    return () => clearInterval(interval);
  }, [spawnFloatStar]);

  const filled = Math.min(5, Math.floor(scoreRef.current / 7));

  return (
    <div
      onClick={e => {
        const t = e.target as HTMLElement;
        if (t.id === 'world') {
          const rect = t.getBoundingClientRect();
          addScore(1, e.clientX - rect.left, e.clientY - rect.top);
        }
      }}
      id="world"
      style={{
        width:'100vw', height:'100vh',
        background:'linear-gradient(180deg,#060a1f 0%,#0d1a4a 38%,#0a3565 68%,#0a5070 100%)',
        position:'relative', overflow:'hidden', cursor:'default',
      }}
    >
      {/* Estrellas de fondo */}
      {Array.from({length:80}).map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          width: i%6===0 ? r(2,4) : r(1,2.5),
          height: i%6===0 ? r(2,4) : r(1,2.5),
          borderRadius:'50%',
          background: i%7===0 ? COLS[i%8] : 'white',
          opacity: r(0.15,0.85),
          top:`${r(0,90)}%`, left:`${r(0,100)}%`,
          pointerEvents:'none',
        }}/>
      ))}

      {/* Score */}
      <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6, zIndex:30 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize:22, transition:'transform .3s', transform: i===filled?'scale(1.5)':'scale(1)' }}>
            {i<=filled?'⭐':'☆'}
          </span>
        ))}
      </div>

      {/* Combo */}
      {showCombo && (
        <div style={{
          position:'absolute', top:50, left:'50%', transform:'translateX(-50%)',
          fontSize:24, fontWeight:900, color:'#FFD700', fontFamily:'system-ui',
          textShadow:'0 0 12px rgba(255,200,0,.8)', zIndex:30, whiteSpace:'nowrap',
          animation:'none',
        }}>
          {comboRef.current>4?`🔥 COMBO x${comboRef.current}!`:`✨ x${comboRef.current}`}
        </div>
      )}

      {/* Planetas */}
      {PLANETS.map((p, i) => (
        <div
          key={i}
          onClick={e => { e.stopPropagation(); addScore(p.pts, e.currentTarget.offsetLeft+p.size/2, e.currentTarget.offsetTop+p.size/2); }}
          style={{
            position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:'50%',
            background:p.bg,
            boxShadow:`inset -${p.size*.15}px -${p.size*.15}px ${p.size*.25}px rgba(0,0,0,.4),0 0 ${p.size*.5}px ${p.glow}`,
            cursor:'pointer', transition:'transform .15s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.13)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        />
      ))}

      {/* Luna */}
      <div
        onClick={e => {
          e.stopPropagation();
          setMoonSpin(true);
          setTimeout(()=>setMoonSpin(false),400);
          addScore(3, e.currentTarget.offsetLeft+26, e.currentTarget.offsetTop+26);
        }}
        style={{
          position:'absolute', right:'14%', top:'16%',
          width:54, height:54, borderRadius:'50%',
          background:'radial-gradient(circle at 35% 35%,#fffde7,#ffd54f 60%,#ffb300)',
          boxShadow:'inset -8px -8px 16px rgba(0,0,0,.3),0 0 24px rgba(255,200,50,.5)',
          cursor:'pointer',
          transform: moonSpin ? 'scale(1.15) rotate(15deg)' : 'scale(1)',
          transition:'transform .2s',
        }}
      />

      {/* Estrellas flotantes clickeables */}
      {floatStars.map(fs => (
        <div
          key={fs.key}
          onClick={e => { e.stopPropagation(); removeFloatStar(fs.id, e.currentTarget.offsetLeft+fs.size/2, e.currentTarget.offsetTop+fs.size/2); }}
          style={{
            position:'absolute', left:`${fs.x}%`, top:`${fs.y}%`,
            fontSize:fs.size, cursor:'pointer', zIndex:12,
            transition:'transform .12s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.4)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        >
          {fs.emoji}
        </div>
      ))}

      {/* TOQWOW — imagen real */}
      <div
        onClick={e => {
          e.stopPropagation();
          setToqwowBig(true);
          setTimeout(()=>setToqwowBig(false),300);
          const rect = e.currentTarget.getBoundingClientRect();
          const wr = document.getElementById('world')!.getBoundingClientRect();
          addScore(5, rect.left-wr.left+rect.width/2, rect.top-wr.top+rect.height/2);
          for(let i=0;i<10;i++) setTimeout(()=>{
            const wx=r(window.innerWidth*.1,window.innerWidth*.9);
            const wy=r(window.innerHeight*.2,window.innerHeight*.75);
            addBurst(wx,wy);
          },i*70);
        }}
        style={{
          position:'absolute', bottom:52, left:'50%',
          transform: toqwowBig
            ? 'translateX(-50%) translateY(0) scale(1.18)'
            : 'translateX(-50%) translateY(0) scale(1)',
          width:'min(160px,30vw)', cursor:'pointer', zIndex:15,
          filter:'drop-shadow(0 0 20px rgba(184,169,255,.75))',
          animation:'toqwowFloat 3.2s ease-in-out infinite',
          transition:'transform .2s, filter .2s',
        }}
      >
        <Image
          src="/toqwow-mascota.png"
          alt="Toqwow"
          width={160}
          height={200}
          style={{ objectFit:'contain', width:'100%', height:'auto', mixBlendMode:'screen' }}
          priority
        />
      </div>

      {/* Partículas burst */}
      {particles.map(p => (
        <div key={p.key} style={{
          position:'absolute', left:p.x-13, top:p.y-13,
          fontSize:26, pointerEvents:'none', zIndex:25,
          animation:'burstAnim .9s ease-out forwards',
        }}>{p.emoji}</div>
      ))}

      {/* Burbujas */}
      {bubbles.map(b => (
        <div key={b.key} style={{
          position:'absolute', left:b.x, top:b.y,
          width:b.size, height:b.size, borderRadius:'50%',
          background:b.color, opacity:.7,
          pointerEvents:'none', zIndex:20,
          animation:'riseAnim 1.8s ease-out forwards',
        }}/>
      ))}

      {/* Hint */}
      <div style={{
        position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
        color:'rgba(255,255,255,.4)', fontSize:11, fontFamily:'system-ui',
        pointerEvents:'none', zIndex:30, whiteSpace:'nowrap',
      }}>
        🌟 ¡Toca todo lo que veas!
      </div>

      <style>{`
        @keyframes toqwowFloat { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-14px)} }
        @keyframes burstAnim { 0%{opacity:1;transform:scale(.4) translateY(0)} 100%{opacity:0;transform:scale(1.6) translateY(-70px)} }
        @keyframes riseAnim { 0%{opacity:.8;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-130px) scale(.2)} }
      `}</style>
    </div>
  );
}
