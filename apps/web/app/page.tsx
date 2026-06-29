'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const stars = [
    { left: 8,  top: 6,  size: 3, color: '#FFD700' },
    { left: 22, top: 14, size: 2, color: '#fff' },
    { left: 38, top: 7,  size: 2, color: '#00D4C8' },
    { left: 55, top: 3,  size: 3, color: '#fff' },
    { left: 68, top: 11, size: 2, color: '#FFB3D1' },
    { left: 80, top: 5,  size: 3, color: '#FFD700' },
    { left: 92, top: 16, size: 2, color: '#fff' },
    { left: 96, top: 4,  size: 2, color: '#00D4C8' },
    { left: 4,  top: 28, size: 2, color: '#fff' },
    { left: 14, top: 45, size: 2, color: '#FFD700' },
    { left: 90, top: 38, size: 2, color: '#FFB3D1' },
    { left: 94, top: 55, size: 3, color: '#fff' },
    { left: 6,  top: 65, size: 2, color: '#FFD700' },
    { left: 10, top: 80, size: 2, color: '#fff' },
    { left: 87, top: 75, size: 2, color: '#00D4C8' },
    { left: 93, top: 88, size: 2, color: '#FFB3D1' },
    { left: 28, top: 93, size: 2, color: '#fff' },
    { left: 72, top: 91, size: 2, color: '#FFD700' },
    { left: 48, top: 88, size: 3, color: '#FFB3D1' },
    { left: 62, top: 22, size: 2, color: '#fff' },
  ];

  return (
    <div style={{
      width: '100dvw',
      height: '100dvh',
      /* Degradado que imita exactamente el fondo del logo */
      background: 'linear-gradient(175deg, #0a0835 0%, #1a1270 30%, #0d5fa0 62%, #00b8a8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Estrellitas */}
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: s.color,
          opacity: 0.55 + (i % 4) * 0.12,
          top: `${s.top}%`,
          left: `${s.left}%`,
          boxShadow: s.size === 3 ? `0 0 4px ${s.color}` : 'none',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Halo de luz detrás de la mascota */}
      <div style={{
        position: 'absolute',
        width: 340,
        height: 340,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,200,0.18) 0%, rgba(80,60,220,0.12) 50%, transparent 75%)',
        filter: 'blur(32px)',
        pointerEvents: 'none',
      }} />

      {/* Mascota con mix-blend-mode: screen para eliminar el fondo */}
      <div style={{
        position: 'relative',
        width: 'min(380px, 85vw)',
        aspectRatio: '4/5',
        marginBottom: 28,
      }}>
        <Image
          src="/toqwow-mascota.png"
          alt="ToqWow Koalosauro Estelar"
          fill
          style={{
            objectFit: 'contain',
            /* screen funde los píxeles oscuros del borde con el fondo oscuro */
            mixBlendMode: 'screen',
            filter: 'drop-shadow(0 0 20px rgba(0,210,200,0.55)) drop-shadow(0 0 50px rgba(100,80,255,0.35))',
          }}
          priority
        />
      </div>

      {/* Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 50,
        padding: '13px 30px',
        fontSize: 'clamp(13px, 3vw, 16px)',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: 0.6,
        cursor: 'default',
      }}>
        🌍 366 mundos por descubrir
      </div>

      <p style={{
        position: 'absolute',
        bottom: 16,
        fontSize: 11,
        opacity: 0.28,
        margin: 0,
        color: 'white',
        letterSpacing: 0.4,
        textAlign: 'center',
        padding: '0 16px',
      }}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>
    </div>
  );
}
