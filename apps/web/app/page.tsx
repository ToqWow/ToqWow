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
      background: 'linear-gradient(180deg, #0d0a4a 0%, #1a1080 25%, #0066aa 60%, #00b8a0 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Estrellitas de colores como en el logo */}
      {[
        [10,5,3,'#FFD700'],[20,12,2,'white'],[35,8,2,'#00D4C8'],[50,4,3,'white'],[65,10,2,'#FFB3D1'],
        [78,6,3,'#FFD700'],[90,14,2,'white'],[95,3,2,'#00D4C8'],[5,25,2,'white'],[15,40,2,'#FFD700'],
        [88,35,2,'#FFB3D1'],[93,50,3,'white'],[8,60,2,'#FFD700'],[12,78,2,'white'],
        [85,72,2,'#00D4C8'],[92,85,2,'#FFB3D1'],[30,92,2,'white'],[70,90,2,'#FFD700'],
        [25,65,2,'#00D4C8'],[75,55,2,'white'],[45,85,3,'#FFB3D1'],[60,20,2,'white'],
      ].map(([left, top, size, color], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size as number,
          height: size as number,
          borderRadius: '50%',
          background: color as string,
          opacity: 0.6 + (i % 3) * 0.15,
          top: `${top}%`,
          left: `${left}%`,
        }} />
      ))}

      {/* Mascota con overlay radial para fundir bordes */}
      <div style={{
        position: 'relative',
        width: 380,
        height: 440,
        marginBottom: 24,
      }}>
        {/* La imagen */}
        <Image
          src="/toqwow-mascota.png"
          alt="ToqWow Koalosauro Estelar"
          fill
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 24px rgba(0,180,210,0.6)) drop-shadow(0 0 48px rgba(80,60,200,0.4))',
          }}
          priority
        />
        {/* Overlay que funde las esquinas con el fondo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at top left, #0d0a4a 0%, transparent 35%),
            radial-gradient(ellipse at top right, #0d0a4a 0%, transparent 35%),
            radial-gradient(ellipse at bottom left, #00b8a0 0%, transparent 35%),
            radial-gradient(ellipse at bottom right, #00b8a0 0%, transparent 35%)
          `,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
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
