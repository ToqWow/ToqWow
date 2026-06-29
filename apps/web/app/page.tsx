'use client';
import { useEffect, useState } from 'react';

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
      {/* Estrellas decorativas */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() * 4 + 2,
          height: Math.random() * 4 + 2,
          borderRadius: '50%',
          background: 'white',
          opacity: Math.random() * 0.6 + 0.2,
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
        }} />
      ))}

      {/* Mascota placeholder con emojis hasta tener imagen real */}
      <div style={{
        position: 'relative',
        marginBottom: 24,
      }}>
        {/* Aura brillante */}
        <div style={{
          position: 'absolute', inset: -20,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,169,255,0.4) 0%, transparent 70%)',
          animation: 'pulse 2s infinite',
        }} />
        {/* Cuerpo del Koalosauro */}
        <div style={{
          width: 180, height: 180,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #B8A9FF 0%, #9B8AFF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 90,
          boxShadow: '0 0 40px rgba(184,169,255,0.6), 0 8px 32px rgba(0,0,0,0.3)',
          border: '4px solid rgba(255,255,255,0.3)',
        }}>
          🐨
        </div>
        {/* Antenitas */}
        <div style={{ position: 'absolute', top: -16, left: 55, fontSize: 20 }}>⭐</div>
        <div style={{ position: 'absolute', top: -16, right: 55, fontSize: 20, filter: 'hue-rotate(180deg)' }}>⭐</div>
      </div>

      {/* Logo ToqWow estilo marca */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1 }}>
          <span style={{ color: 'white' }}>Toq</span>
          <span style={{ color: '#FFD700' }}>W</span>
          <span style={{ color: '#00D4C8' }}>o</span>
          <span style={{ color: '#FFB3D1' }}>w</span>
        </span>
      </div>

      {/* Slogan */}
      <div style={{
        fontSize: 14, fontWeight: 700, letterSpacing: 4,
        color: 'rgba(255,255,255,0.85)',
        textTransform: 'uppercase',
        marginBottom: 32,
      }}>
        ¡TOCA · DESCUBRE · JUEGA!
      </div>

      {/* Badge coming soon */}
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

      <p style={{ fontSize: 11, opacity: 0.4, marginTop: 16 }}>
        © ToqWow · Marca Registrada · Todos los derechos reservados
      </p>
    </div>
  );
}
