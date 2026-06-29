'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{
      width: '100dvw', height: '100dvh',
      background: 'linear-gradient(135deg, #7C6AE8 0%, #00C9C0 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'white',
    }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🌍</div>
      <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, fontFamily: 'system-ui' }}>ToqWow</h1>
      <p style={{ opacity: 0.8, marginTop: 8, fontSize: 18 }}>366 mundos por descubrir</p>
      <p style={{ fontSize: 11, opacity: 0.4, marginTop: 40 }}>Fase 0 — Fundacion activa</p>
    </div>
  );
}
