'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const COLS = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB'];

const MUNDOS = [
  { id:0, emoji:'🌍', nombre:'Planeta Tiqui', free:true,  color:'#00D4C8', glow:'rgba(0,212,200,.7)' },
  { id:1, emoji:'🦕', nombre:'Dinos del Espacio', free:false, color:'#7C6AE8', glow:'rgba(124,106,232,.7)' },
  { id:2, emoji:'🌲', nombre:'Bosque Encantado', free:false, color:'#2ecc71', glow:'rgba(46,204,113,.7)' },
  { id:3, emoji:'☁️', nombre:'Ciudad de Nubes', free:false, color:'#87CEEB', glow:'rgba(135,206,235,.7)' },
  { id:4, emoji:'🐠', nombre:'Océano de Cristal', free:false, color:'#0088cc', glow:'rgba(0,136,204,.7)' },
  { id:5, emoji:'⚽', nombre:'Deportes Cósmicos', free:false, color:'#f39c12', glow:'rgba(243,156,18,.7)' },
];

const r = (a:number,b:number) => a + Math.random()*(b-a);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number|null>(null);
  const [toqwowScale, setToqwowScale] = useState(1);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      width:'100dvw', minHeight:'100dvh',
      background:'linear-gradient(175deg,#0a0835 0%,#1a1270 28%,#0d5fa0 62%,#00b8a8 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      overflow:'hidden', position:'relative', fontFamily:'system-ui,sans-serif',
      paddingBottom:40,
    }}>

      {/* Estrellitas */}
      {Array.from({length:60}).map((_,i) => (
        <div key={i} style={{
          position:'fixed', borderRadius:'50%', pointerEvents:'none',
          width: i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          height:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          background: i%5===0?COLS[i%6]:'white',
          opacity:r(.2,.8), top:`${r(0,100)}%`, left:`${r(0,100)}%`,
          animation:`tw${i%3} ${r(2,5)}s ${r(0,4)}s infinite`,
        }}/>
      ))}

      {/* Mascota + CTA principal */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:32, marginBottom:8 }}>
        <div
          onClick={() => { setToqwowScale(1.15); setTimeout(()=>setToqwowScale(1),300); router.push('/mundo/0'); }}
          style={{
            width:'min(200px,40vw)', cursor:'pointer', zIndex:10,
            filter:'drop-shadow(0 0 28px rgba(184,169,255,.85))',
            transform:`scale(${toqwowScale})`,
            animation:'tFloat 3.2s ease-in-out infinite',
            transition:'transform .2s,filter .2s',
          }}
          onMouseEnter={e=>(e.currentTarget.style.filter='drop-shadow(0 0 44px rgba(184,169,255,1))')}
          onMouseLeave={e=>(e.currentTarget.style.filter='drop-shadow(0 0 28px rgba(184,169,255,.85))')}
        >
          <Image src="/toqwow-mascota.png" alt="Toqwow" width={200} height={250}
            style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen'}} priority/>
        </div>

        {/* Botón Jugar Ahora */}
        <button
          onClick={() => router.push('/mundo/0')}
          style={{
            marginTop:8, background:'linear-gradient(135deg,#B8A9FF,#7C6AE8)',
            border:'none', borderRadius:50, padding:'16px 44px',
            fontSize:20, fontWeight:800, color:'white', cursor:'pointer',
            boxShadow:'0 0 32px rgba(184,169,255,.7)', letterSpacing:.5,
            animation:'pulseBtn 2s ease-in-out infinite',
          }}
        >
          🚀 ¡Jugar ahora!
        </button>
        <p style={{fontSize:12,color:'rgba(255,255,255,.4)',marginTop:8}}>Gratis — Planeta Tiqui</p>
      </div>

      {/* Título sección mundos */}
      <div style={{width:'100%',textAlign:'center',marginBottom:16,zIndex:5}}>
        <p style={{fontSize:14,color:'rgba(255,255,255,.5)',letterSpacing:3,textTransform:'uppercase'}}>
          Sistema Tiqui — 366 Mundos
        </p>
      </div>

      {/* Grid de mundos */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',
        gap:14, width:'min(92vw,520px)', zIndex:5,
      }}>
        {MUNDOS.map(m => (
          <div
            key={m.id}
            onClick={() => m.free ? router.push(`/mundo/${m.id}`) : null}
            onMouseEnter={() => setHovered(m.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered===m.id
                ? `rgba(255,255,255,.12)`
                : `rgba(255,255,255,.07)`,
              border: m.free
                ? `2px solid ${m.color}`
                : `1px solid rgba(255,255,255,.12)`,
              borderRadius:20, padding:'18px 12px', textAlign:'center',
              cursor: m.free ? 'pointer' : 'default',
              transition:'all .2s',
              transform: hovered===m.id&&m.free ? 'scale(1.05)' : 'scale(1)',
              boxShadow: m.free ? `0 0 20px ${m.glow}` : 'none',
              position:'relative', overflow:'hidden',
            }}
          >
            {/* Lock overlay para mundos pagos */}
            {!m.free && (
              <div style={{
                position:'absolute',inset:0,borderRadius:20,
                background:'rgba(0,0,0,.35)',
                display:'flex',alignItems:'center',justifyContent:'center',
                backdropFilter:'blur(2px)',zIndex:2,
              }}>
                <span style={{fontSize:22}}>🔒</span>
              </div>
            )}
            <div style={{fontSize:38,marginBottom:6}}>{m.emoji}</div>
            <div style={{
              fontSize:13,fontWeight:700,
              color: m.free ? m.color : 'rgba(255,255,255,.5)',
              lineHeight:1.3,
            }}>{m.nombre}</div>
            {m.free && (
              <div style={{
                marginTop:8,background:m.color,borderRadius:50,
                padding:'4px 12px',fontSize:11,fontWeight:700,color:'#fff',
                display:'inline-block',
              }}>GRATIS</div>
            )}
            {!m.free && (
              <div style={{marginTop:8,fontSize:11,color:'rgba(255,255,255,.3)'}}>
                Pack {Math.ceil(m.id/28)} · $3.99
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{fontSize:11,opacity:.25,color:'white',marginTop:32,textAlign:'center',zIndex:5}}>
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
