'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      width: '100dvw',
      height: '100dvh',
      background: 'linear-gradient(180deg, #1a1a6e 0%, #2d1b8e 20%, #00b4d8 70%, #00c9b1 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Estrellitas igual que el logo */}
      {[
        [10,5,3],[20,12,2],[35,8,2],[50,4,3],[65,10,2],[78,6,3],[90,14,2],[95,3,2],
        [5,25,2],[15,40,2],[88,35,2],[93,50,3],[8,60,2],[12,78,2],[85,72,2],[92,85,2],
        [30,92,2],[50,95,3],[70,90,2],[40,50,2],[60,30,2],[25,65,2],[75,55,2],
      ].map(([left, top, size], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: i % 4 === 0 ? '#FFD700' : i % 4 === 1 ? '#00D4C8' : i % 4 === 2 ? '#FFB3D1' : 'white',
          opacity: 0.5 + (i % 3) * 0.2,
          top: `${top}%`,
          left: `${left}%`,
          boxShadow: size === 3 ? `0 0 4px currentColor` : 'none',
        }} />
      ))}

      {/* Mascota sin fondo rectangular — usa mix-blend-mode para fusionar */}
      <div style={{
        position: 'relative',
        width: 360,
        height: 420,
        marginBottom: 20,
      }}>
        <Image
          src="/toqwow-mascota.png"
          alt="ToqWow Koalosauro Estelar"
          fill
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 30px rgba(0,212,200,0.5)) drop-shadow(0 0 60px rgba(124,106,232,0.4))',
          }}
          priority
        />
      </div>

      {/* Badge 366 mundos */}
      <div style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 50,
        padding: '12px 28px',
        fontSize: 15,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: 0.5,
        fontFamily: 'system-ui, sans-serif',
      }}>
        🌍 366 mundos por descubrir
      </div>

      <p style={{
        position: 'absolute',
        bottom: 18,
        fontSize: 11,
        opacity: 0.3,
        margin: 0,
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: 0.5,
      }}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>
    </div>
  );
}
