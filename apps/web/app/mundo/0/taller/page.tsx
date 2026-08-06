'use client';
import { useRouter } from 'next/navigation';

export default function TallerPage() {
  const router = useRouter();
  return (
    <div style={{ width: '100vw', height: '100dvh', background: 'linear-gradient(180deg,#1a1030,#2a1f4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: 56 }}>👗</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>El Taller de Vestuario</div>
        <div style={{ fontSize: 14, opacity: .75, marginTop: 6 }}>¡Muy pronto vas a poder jugar acá!</div>
        <button onClick={() => router.push('/mundo/0/aldea')} style={{ marginTop: 24, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '8px 20px', color: 'white', fontSize: 14, fontWeight: 600 }}>← Volver a la Aldea</button>
      </div>
    </div>
  );
}
