'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const stars = [
    [12,8],[25,22],[38,5],[55,15],[70,8],[82,20],[92,6],
    [8,45],[18,70],[30,85],[45,92],[60,78],[75,88],[88,65],[95,80],
    [50,35],[65,50],[80,40],[35,55],[20,40],
  ];

  return (
    <div style={{
      width: '100dvw',
      height: '100dvh',
      background: 'linear-gradient(160deg, #3B2DB5 0%, #7C6AE8 45%, #00C9C0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {stars.map(([left, top], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 3 : 2,
          height: i % 3 === 0 ? 3 : 2,
          borderRadius: '50%',
          background: 'white',
          opacity: 0.3 + (i % 4) * 0.1,
          top: `${top}%`,
          left: `${left}%`,
        }} />
      ))}

      {/* Logo oficial — mascota + texto + slogan todo en uno */}
      <div style={{
        position: 'relative',
        width: 320,
        height: 400,
        filter: 'drop-shadow(0 8px 48px rgba(124,106,232,0.8))',
        marginBottom: 32,
      }}>
        <Image
          src="/toqwow-mascota.png"
          alt="ToqWow — Toca, Descubre, Juega"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      {/* Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 50,
        padding: '12px 28px',
        fontSize: 15,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: 0.5,
      }}>
        🌍 366 mundos por descubrir
      </div>

      <p style={{
        position: 'absolute',
        bottom: 20,
        fontSize: 11,
        opacity: 0.35,
        margin: 0,
        letterSpacing: 0.5,
      }}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>
    </div>
  );
}
