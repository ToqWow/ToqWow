'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.35, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

type Hotspot = { x: number; y: number; };
type Zona = { indice: number; nombre: string; archivo: string; thumb: string; hotspots: Hotspot[]; };

const ZONA_WIDTH = 2752;
const ZONA_HEIGHT = 1536;

const ZONAS: Zona[] = [
  { indice: 1, nombre: 'Puerta de Musgo', archivo: 'zona_01_puerta_musgo.webp', thumb: 'thumb_01_puerta_musgo.webp', hotspots: [{x:963,y:845},{x:1514,y:922}] },
  { indice: 2, nombre: 'Arboleda de las Luciérnagas', archivo: 'zona_02_arboleda_luciernagas.webp', thumb: 'thumb_02_arboleda_luciernagas.webp', hotspots: [{x:1651,y:691},{x:1981,y:891},{x:1238,y:998}] },
  { indice: 3, nombre: 'Aldea de los Hongos', archivo: 'zona_03_aldea_hongos.webp', thumb: 'thumb_03_aldea_hongos.webp', hotspots: [{x:826,y:845},{x:1376,y:768},{x:1926,y:845},{x:2339,y:768}] },
  { indice: 4, nombre: 'Puente de Raíces', archivo: 'zona_04_puente_raices.webp', thumb: 'thumb_04_puente_raices.webp', hotspots: [{x:1238,y:922},{x:1651,y:998}] },
  { indice: 5, nombre: 'Arroyo Brillante', archivo: 'zona_05_arroyo_brillante.webp', thumb: 'thumb_05_arroyo_brillante.webp', hotspots: [{x:1101,y:998},{x:1651,y:922},{x:2064,y:845}] },
  { indice: 6, nombre: 'Jardín de Rocío', archivo: 'zona_06_jardin_rocio.webp', thumb: 'thumb_06_jardin_rocio.webp', hotspots: [{x:963,y:998},{x:1514,y:922},{x:1926,y:998}] },
  { indice: 7, nombre: 'Mercado de Luz', archivo: 'zona_07_mercado_luz.webp', thumb: 'thumb_07_mercado_luz.webp', hotspots: [{x:826,y:614},{x:1514,y:645},{x:2147,y:691}] },
  { indice: 8, nombre: 'Roquedal de Musgo', archivo: 'zona_08_roquedal_musgo.webp', thumb: 'thumb_08_roquedal_musgo.webp', hotspots: [{x:1101,y:845},{x:1651,y:768},{x:2064,y:922}] },
  { indice: 9, nombre: 'Boca de la Cueva', archivo: 'zona_09_boca_cueva.webp', thumb: 'thumb_09_boca_cueva.webp', hotspots: [{x:1238,y:845},{x:1789,y:768}] },
  { indice: 10, nombre: 'Mirador de la Luna', archivo: 'zona_10_mirador_luna.webp', thumb: 'thumb_10_mirador_luna.webp', hotspots: [{x:1238,y:691},{x:1871,y:768}] },
];

const TOTAL_HOTSPOTS = ZONAS.reduce((acc, z) => acc + z.hotspots.length, 0);

type ActiveBurst = { id: number; x: number; y: number; zonaIdx: number; };

export default function Mundo1() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [portalNudge, setPortalNudge] = useState(false);
  const burstId = useRef(0);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && window.localStorage.getItem('toqwow_mundo1_tutorial_visto');
    if (seen) setShowGuide(false);
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try { window.localStorage.setItem('toqwow_mundo1_tutorial_visto', '1'); } catch {}
  }, []);

  const activarHotspot = useCallback((zonaIdx: number, hIdx: number, x: number, y: number) => {
    const key = `${zonaIdx}-${hIdx}`;
    setCollected(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    const id = ++burstId.current;
    setBursts(prev => [...prev, { id, x, y, zonaIdx }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
    melody([523, 659, 784]);
    vib(20);
    if (showGuide) dismissGuide();
  }, [showGuide, dismissGuide]);

  const zonaCompleta = useCallback((zi: number) => {
    return ZONAS[zi].hotspots.every((_, hi) => collected.has(`${zi}-${hi}`));
  }, [collected]);

  const progreso = collected.size;
  const mundoCompleto = progreso === TOTAL_HOTSPOTS;
  const zonasCompletas = ZONAS.filter((_, zi) => zonaCompleta(zi)).length;

  const abrirMapaConSonido = useCallback(() => {
    setShowMap(true);
    melody([392, 523, 659], 90, 0.3, 0.15);
    vib(15);
  }, []);

  const irAZona = useCallback((zi: number) => {
    setShowMap(false);
    const el = scrollRef.current;
    if (!el) return;
    const target = el.children[zi] as HTMLElement;
    target?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
  }, []);

  const intentarPortal = useCallback(() => {
    if (mundoCompleto) {
      note(880, 0.4, 0.25); setTimeout(() => note(1046, 0.5, 0.25), 200);
      setTimeout(() => router.push('/mundo/2'), 500);
    } else {
      setPortalNudge(true);
      note(220, 0.3, 0.2, 'triangle');
      setTimeout(() => setPortalNudge(false), 700);
    }
  }, [mundoCompleto, router]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1030', overflow: 'hidden', touchAction: 'none' }}>
      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', zIndex: 60, background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(10px)', isolation: 'isolate' }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 50, padding: '7px 16px', fontSize: 13, color: 'white', cursor: 'pointer' }}>← Inicio</button>
        <button onClick={abrirMapaConSonido} style={{ background: 'rgba(255, 200, 90, .18)', border: '1px solid rgba(255,200,90,.5)', borderRadius: 50, padding: '7px 18px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          🗺️ Mapa del Bosque ({zonasCompletas}/10)
        </button>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', minWidth: 50, textAlign: 'right' }}>✨{progreso}/{TOTAL_HOTSPOTS}</div>
      </div>

      {/* SCROLL HORIZONTAL DE ZONAS */}
      <div
        ref={scrollRef}
        className="mundo1-scroll"
        style={{
          position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', flexDirection: 'row', WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
        }}
      >
        {ZONAS.map((zona, zi) => (
          <div key={zona.indice} style={{ position: 'relative', flex: `0 0 auto`, height: '100%', aspectRatio: `${ZONA_WIDTH} / ${ZONA_HEIGHT}` }}>
            <Image
              src={`/assets/mundo1/${zona.archivo}`}
              alt={zona.nombre}
              fill
              priority={zi < 2}
              sizes="100vh"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />

            {/* Tronco-mapa en la entrada (Zona 1) */}
            {zi === 0 && (
              <button
                onClick={abrirMapaConSonido}
                aria-label="Abrir mapa del bosque"
                style={{
                  position: 'absolute', left: '22%', top: '68%', transform: 'translate(-50%,-50%)',
                  width: '9%', aspectRatio: '1/1', borderRadius: '50%', border: '3px solid rgba(255,215,120,.8)',
                  background: 'radial-gradient(circle, rgba(255,215,120,.35), rgba(255,215,120,.05))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2vh',
                  cursor: 'pointer', zIndex: 22, animation: 'mapPulse 2s ease-in-out infinite',
                }}
              >🗺️</button>
            )}

            {/* Personajes anfitriones: Toqwow + Tizi + Coti en la Arboleda (Zona 2) */}
            {zi === 1 && (
              <>
                <img src="/assets/mundo1/char_tizi_v2.png" alt="Tizi" style={{
                  position: 'absolute', left: '38%', top: '58%', width: '9%', zIndex: 18,
                  animation: 'charBounce 2.4s ease-in-out infinite', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                }} />
                <img src="/assets/mundo1/char_coti_v2.png" alt="Coti" style={{
                  position: 'absolute', left: '47%', top: '60%', width: '8.5%', zIndex: 17,
                  animation: 'charBounce 2.6s ease-in-out infinite .3s', filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                }} />
              </>
            )}

            {zona.hotspots.map((h, hi) => {
              const key = `${zi}-${hi}`;
              const done = collected.has(key);
              const leftPct = (h.x / ZONA_WIDTH) * 100;
              const topPct = (h.y / ZONA_HEIGHT) * 100;
              return (
                <button
                  key={hi}
                  aria-label={`Punto interactivo ${hi + 1} de ${zona.nombre}`}
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    activarHotspot(zi, hi, rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }}
                  style={{
                    position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                    transform: 'translate(-50%,-50%)', width: '5%', aspectRatio: '1/1',
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    zIndex: 20,
                  }}
                >
                  <img
                    src="/assets/mundo1/hotspot_icon_v2.png"
                    alt=""
                    style={{
                      width: '100%', height: '100%', display: done ? 'none' : 'block',
                      animation: 'hotspotPulse 1.6s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 8px rgba(180,150,255,.7))',
                    }}
                  />
                </button>
              );
            })}

            {/* Guia luciernaga: solo en la primera zona con hotspots (Zona 2, indice 1), primera visita */}
            {zi === 1 && showGuide && (
              <img
                src="/assets/mundo1/guia_luciernaga_v2.png"
                alt="Luciérnaga guía"
                style={{
                  position: 'absolute',
                  left: `${(zona.hotspots[0].x / ZONA_WIDTH) * 100 - 6}%`,
                  top: `${(zona.hotspots[0].y / ZONA_HEIGHT) * 100 - 10}%`,
                  width: '7%', zIndex: 25, pointerEvents: 'none',
                  animation: 'guideFloat 2.2s ease-in-out infinite',
                }}
              />
            )}

            {/* Toqwow como companero flotante, presente en todas las zonas */}
            <img src="/assets/mundo1/char_toqwow_v2.png" alt="Toqwow" style={{
              position: 'absolute', left: '8%', bottom: '6%', width: '11%', zIndex: 19,
              animation: 'charBounce 2.2s ease-in-out infinite .15s', filter: 'drop-shadow(0 10px 12px rgba(0,0,0,.45))',
            }} />

            {/* Portal en Zona 10: gated por progreso */}
            {zi === 9 && (
              <button
                onClick={intentarPortal}
                aria-label="Pasar al siguiente mundo"
                style={{
                  position: 'absolute', left: '68%', top: '58%', transform: 'translate(-50%,-50%)',
                  width: '12%', aspectRatio: '1/1', borderRadius: '50%', border: 'none', background: 'transparent',
                  cursor: 'pointer', zIndex: 21,
                  filter: mundoCompleto ? 'brightness(1.5) saturate(1.3)' : 'brightness(.55) saturate(.6) grayscale(.3)',
                  transition: 'filter .4s',
                  animation: portalNudge ? 'nudgeShake .4s ease-in-out' : mundoCompleto ? 'portalReady 1.8s ease-in-out infinite' : 'none',
                }}
              >
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,220,150,.5), rgba(150,100,255,.15))' }} />
              </button>
            )}

            {/* Bursts de recompensa */}
            {bursts.filter(b => b.zonaIdx === zi).map(b => (
              <div key={b.id} style={{
                position: 'fixed', left: b.x, top: b.y, transform: 'translate(-50%,-50%)',
                fontSize: 34, pointerEvents: 'none', zIndex: 70, animation: 'burstUp .9s ease-out forwards',
              }}>✨</div>
            ))}
          </div>
        ))}
      </div>

      {/* Indicador de scroll sutil */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(20,10,40,.4)', padding: '4px 12px', borderRadius: 20 }}>
        ⟵ Deslizá para explorar el bosque ⟶
      </div>

      {/* OVERLAY: Mapa del Bosque */}
      {showMap && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,5,20,.88)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5vh 4vw' }}>
          <div style={{
            background: 'linear-gradient(160deg, #e8d3a3, #d4b878)', borderRadius: 24, padding: '4vh 3vw',
            maxWidth: 720, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.5)', border: '4px solid #8a6a3a',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#4a3418', marginBottom: 6 }}>
              🗺️ Mapa del Bosque de las Luciérnagas
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#6a4f28', marginBottom: 18 }}>
              Tocá cada luz escondida en el bosque para completar el mapa
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {ZONAS.map((zona, zi) => {
                const completa = zonaCompleta(zi);
                const parcial = !completa && zona.hotspots.some((_, hi) => collected.has(`${zi}-${hi}`));
                return (
                  <button
                    key={zi}
                    onClick={() => irAZona(zi)}
                    style={{
                      position: 'relative', border: '3px solid #8a6a3a', borderRadius: 14, padding: 0,
                      overflow: 'hidden', cursor: 'pointer', aspectRatio: '1/1',
                      filter: completa ? 'none' : parcial ? 'saturate(.7) brightness(.85)' : 'grayscale(.6) brightness(.6)',
                    }}
                  >
                    <img src={`/assets/mundo1/map/${zona.thumb}`} alt={zona.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {completa && (
                      <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 16, filter: 'drop-shadow(0 1px 2px black)' }}>⭐</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 9, textAlign: 'center', color: 'white', background: 'rgba(0,0,0,.45)', padding: '2px 0' }}>{zi + 1}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button onClick={() => setShowMap(false)} style={{ background: '#8a6a3a', border: 'none', borderRadius: 50, padding: '8px 26px', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mundo1-scroll::-webkit-scrollbar { display: none; }
        .mundo1-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes hotspotPulse { 0%,100%{ transform: scale(1); opacity: 1; } 50%{ transform: scale(1.18); opacity: .75; } }
        @keyframes guideFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-14px); } }
        @keyframes burstUp { 0%{ opacity: 1; transform: translate(-50%,-50%) scale(.5); } 100%{ opacity: 0; transform: translate(-50%,-160%) scale(1.6); } }
        @keyframes charBounce { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-6%); } }
        @keyframes mapPulse { 0%,100%{ transform: translate(-50%,-50%) scale(1); } 50%{ transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes portalReady { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.08); } }
        @keyframes nudgeShake { 0%,100%{ transform: translate(-50%,-50%) rotate(0); } 25%{ transform: translate(-50%,-50%) rotate(-6deg); } 75%{ transform: translate(-50%,-50%) rotate(6deg); } }
        html, body { height: 100dvh; overscroll-behavior: none; }
      `}</style>
    </div>
  );
}
