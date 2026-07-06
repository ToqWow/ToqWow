'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const COLS = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB'];

const MUNDOS = [
  { id:0,  emoji:'🌍', nombre:'Planeta Tiqui',     free:true,  color:'#00D4C8', glow:'rgba(0,212,200,.7)',   desc:'Explora el espacio' },
  { id:1,  emoji:'✨', nombre:'Bosque de las Luciérnagas',  free:true,  color:'#FFD966', glow:'rgba(255,217,102,.7)',   desc:'10 zonas mágicas' },
  { id:2,  emoji:'🌲', nombre:'Bosque Encantado',   free:true,  color:'#98FB98', glow:'rgba(152,251,152,.7)', desc:'Criaturas mágicas' },
  { id:3,  emoji:'☁️', nombre:'Ciudad de Nubes',    free:false, color:'#87CEEB', glow:'rgba(135,206,235,.7)', desc:'Pack 3 · $3.99' },
  { id:4,  emoji:'🐠', nombre:'Océano de Cristal',  free:false, color:'#0088cc', glow:'rgba(0,136,204,.7)',   desc:'Pack 4 · $3.99' },
  { id:5,  emoji:'⚽', nombre:'Deportes Cósmicos',  free:false, color:'#f39c12', glow:'rgba(243,156,18,.7)',  desc:'Pack 5 · $3.99' },
  { id:6,  emoji:'🏕️', nombre:'Granja Mágica',      free:false, color:'#FF8C00', glow:'rgba(255,140,0,.7)',   desc:'Pack 6 · $3.99' },
  { id:7,  emoji:'🔧', nombre:'Taller de Inventos', free:false, color:'#C0C0C0', glow:'rgba(192,192,192,.7)', desc:'Pack 7 · $3.99' },
];

const r = (a:number,b:number) => a + Math.random()*(b-a);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number|null>(null);
  const [tqScale, setTqScale] = useState(1);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      width:'100dvw', minHeight:'100dvh',
      background:'linear-gradient(175deg,#0a0835 0%,#1a1270 28%,#0d5fa0 62%,#00b8a8 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      overflow:'hidden', position:'relative', fontFamily:'system-ui,sans-serif',
      paddingBottom:48,
    }}>

      {/* Estrellitas fijas */}
      {Array.from({length:70}).map((_,i) => (
        <div key={i} style={{
          position:'fixed', borderRadius:'50%', pointerEvents:'none',
          width:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          height:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          background:i%5===0?COLS[i%6]:'white',
          opacity:r(.2,.8), top:`${r(0,100)}%`, left:`${r(0,100)}%`,
          animation:`tw${i%3} ${r(2,5)}s ${r(0,4)}s infinite`,
        }}/>
      ))}

      {/* Hero — Toqwow + CTA */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:28, marginBottom:16 }}>
        <div
          onClick={() => { setTqScale(1.15); setTimeout(()=>setTqScale(1),300); router.push('/mundo/0'); }}
          style={{ width:'min(190px,38vw)', cursor:'pointer', zIndex:10,
            filter:'drop-shadow(0 0 28px rgba(184,169,255,.85))',
            transform:`scale(${tqScale})`,
            animation:'tFloat 3.2s ease-in-out infinite', transition:'transform .2s,filter .2s' }}
          onMouseEnter={e=>(e.currentTarget.style.filter='drop-shadow(0 0 44px rgba(184,169,255,1))')}
          onMouseLeave={e=>(e.currentTarget.style.filter='drop-shadow(0 0 28px rgba(184,169,255,.85))')}
        >
          <Image src="/toqwow-mascota.png" alt="Toqwow" width={190} height={240}
            style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen'}} priority/>
        </div>

        <button onClick={() => router.push('/mundo/0')}
          style={{ marginTop:6, background:'linear-gradient(135deg,#B8A9FF,#7C6AE8)',
            border:'none', borderRadius:50, padding:'15px 42px',
            fontSize:19, fontWeight:800, color:'white', cursor:'pointer',
            boxShadow:'0 0 32px rgba(184,169,255,.7)', letterSpacing:.5,
            animation:'pulseBtn 2s ease-in-out infinite' }}>
          🚀 ¡Jugar ahora!
        </button>
        <p style={{fontSize:12,color:'rgba(255,255,255,.38)',marginTop:6}}>3 mundos gratuitos disponibles</p>
      </div>

      {/* Sección mundos */}
      <div style={{width:'100%',textAlign:'center',marginBottom:14,zIndex:5}}>
        <p style={{fontSize:13,color:'rgba(255,255,255,.45)',letterSpacing:3,textTransform:'uppercase'}}>
          🌌 Sistema Tiqui — 366 Mundos
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))',
        gap:12, width:'min(94vw,560px)', zIndex:5 }}>
        {MUNDOS.map(m => (
          <div key={m.id}
            onClick={() => m.free ? router.push(`/mundo/${m.id}`) : null}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered===m.id&&m.free ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)',
              border: m.free ? `2px solid ${m.color}` : '1px solid rgba(255,255,255,.1)',
              borderRadius:20, padding:'16px 10px', textAlign:'center',
              cursor: m.free ? 'pointer' : 'default', transition:'all .2s',
              transform: hovered===m.id&&m.free ? 'scale(1.06)' : 'scale(1)',
              boxShadow: m.free ? `0 0 18px ${m.glow}` : 'none',
              position:'relative', overflow:'hidden',
            }}
          >
            {!m.free && (
              <div style={{ position:'absolute',inset:0,borderRadius:20,
                background:'rgba(0,0,0,.38)',display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',backdropFilter:'blur(2px)',zIndex:2 }}>
                <span style={{fontSize:24}}>🔒</span>
                <span style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:4}}>{m.desc}</span>
              </div>
            )}
            <div style={{fontSize:36,marginBottom:6}}>{m.emoji}</div>
            <div style={{fontSize:13,fontWeight:700,color:m.free?m.color:'rgba(255,255,255,.45)',lineHeight:1.3}}>{m.nombre}</div>
            {m.free && (
              <div style={{marginTop:8,background:m.color,borderRadius:50,padding:'3px 12px',fontSize:11,fontWeight:700,color:'#000',display:'inline-block',opacity:.9}}>
                {m.id===0?'GRATIS':'GRATIS'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Más mundos */}
      <div style={{marginTop:20,textAlign:'center',zIndex:5}}>
        <p style={{fontSize:13,color:'rgba(255,255,255,.3)'}}>
          + 358 mundos más por descubrir 🌟
        </p>
      </div>

      <p style={{fontSize:11,opacity:.22,color:'white',marginTop:24,textAlign:'center',zIndex:5,padding:'0 16px'}}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.1}}
        @keyframes tw2{0%,100%{opacity:.5}33%{opacity:1}66%{opacity:.1}}
        @keyframes tFloat{0%,100%{transform:scale(1) translateY(0)}50%{transform:scale(1) translateY(-14px)}}
        @keyframes pulseBtn{0%,100%{box-shadow:0 0 32px rgba(184,169,255,.7)}50%{box-shadow:0 0 52px rgba(184,169,255,1)}}
      `}</style>
    </div>
  );
}
