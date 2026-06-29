'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      width: '100dvw', height: '100dvh',
      background: 'linear-gradient(160deg, #3B2DB5 0%, #7C6AE8 40%, #00C9C0 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Mascota oficial */}
      <div style={{
        position: 'relative',
        width: 280, height: 350,
        marginBottom: 8,
        filter: 'drop-shadow(0 0 40px rgba(184,169,255,0.7))',
      }}>
        <Image
          src="/toqwow-mascota.png"
          alt="Toqwow Koalosauro Estelar"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      {/* Logo ToqWow multicolor */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1 }}>
          <span style={{ color: 'white' }}>Toq</span>
          <span style={{ color: '#FFD700' }}>W</span>
          <span style={{ color: '#00D4C8' }}>o</span>
          <span style={{ color: '#FFB3D1' }}>w</span>
        </span>
      </div>

      {/* Slogan */}
      <div style={{
        fontSize: 13, fontWeight: 700, letterSpacing: 4,
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        marginBottom: 24,
      }}>
        ¡TOCA · DESCUBRE · JUEGA!
      </div>

      {/* Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 50,
        padding: '10px 24px',
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 16,
      }}>
        🌍 366 mundos por descubrir
      </div>

      <p style={{ fontSize: 11, opacity: 0.4, marginTop: 12 }}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>
    </div>
  );
}
