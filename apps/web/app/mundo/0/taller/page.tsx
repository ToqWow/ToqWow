'use client';
import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ---- Audio synth (mismo patrón liviano usado en el resto de zonas nuevas) ----
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.3, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

const BG = '/assets/redesign/taller/fondo.webp';
const CHAR_BASE = '/assets/redesign/personajes';
const ROPA_BASE = '/assets/redesign/taller';

// ---- Elenco (falta char_toqwow.png del rediseño, se agrega cuando esté) ----
type Tipo = 'biped' | 'cuadrupedo';
type Personaje = { id: string; nombre: string; archivo: string; tipo: Tipo };
const PERSONAJES: Personaje[] = [
  { id: 'tizi', nombre: 'Tizi', archivo: 'char_tizi.png', tipo: 'biped' },
  { id: 'zoe', nombre: 'Zoe', archivo: 'char_zoe.png', tipo: 'biped' },
  { id: 'coti', nombre: 'Coti', archivo: 'char_coti.png', tipo: 'biped' },
  { id: 'puli', nombre: 'Puli', archivo: 'char_puli.png', tipo: 'biped' },
  { id: 'tito', nombre: 'Tito', archivo: 'char_tito.png', tipo: 'biped' },
  { id: 'luta', nombre: 'Luta', archivo: 'char_luta.png', tipo: 'biped' },
  { id: 'michi', nombre: 'Michi', archivo: 'char_michi.png', tipo: 'cuadrupedo' },
  { id: 'vago', nombre: 'Vago', archivo: 'char_vago.png', tipo: 'cuadrupedo' },
  { id: 'copo', nombre: 'Copo de Nieve', archivo: 'char_copo.png', tipo: 'cuadrupedo' },
];

// ---- Prendas: cada una pertenece a una categoría (tab) y a una "zona" de anclaje sobre el personaje ----
type Categoria = 'accesorios' | 'ropa' | 'zapatos';
type Zona = 'cabeza' | 'cara' | 'cuello' | 'espalda' | 'cintura' | 'torso' | 'pies';
type Prenda = { id: string; archivo: string; carpeta: string; categoria: Categoria; zona: Zona; tipos: Tipo[] };

const accesorios: Prenda[] = [
  { id: 'sombrero_sol', archivo: 'sombrero_sol.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'gorro_lana', archivo: 'gorro_lana.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'gorra', archivo: 'gorra.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'corona_flores', archivo: 'corona_flores.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'mono_clip', archivo: 'mono_clip.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'auriculares', archivo: 'auriculares.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
  { id: 'lentes_redondos', archivo: 'lentes_redondos.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cara', tipos: ['biped', 'cuadrupedo'] },
  { id: 'lentes_corazon', archivo: 'lentes_corazon.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cara', tipos: ['biped', 'cuadrupedo'] },
  { id: 'bufanda', archivo: 'bufanda.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cuello', tipos: ['biped', 'cuadrupedo'] },
  { id: 'mochila', archivo: 'mochila.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'espalda', tipos: ['biped', 'cuadrupedo'] },
  { id: 'cinto', archivo: 'cinto.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cintura', tipos: ['biped', 'cuadrupedo'] },
  { id: 'hebilla_flor', archivo: 'hebilla_flor.png', carpeta: 'accesorios', categoria: 'accesorios', zona: 'cabeza', tipos: ['biped', 'cuadrupedo'] },
];

const ropaBipedArchivos = [
  'remera_rayada', 'vestido_lunares', 'jardinera_denim', 'short_verde', 'jean_azul', 'pollera_rosa', 'hoodie_naranja', 'vestido_floral', 'jardinera_rosa_mono',
  'impermeable', 'tutu', 'chaleco_inflable', 'camisa_cuadros', 'cargo_pants', 'pijama_enterito', 'capa_superheroe', 'malla_bano', 'campera_inflable', 'jardinera_tiradores',
];
const vestidosPrincesa = [
  'rosa_capas_tul', 'azul_con_capa', 'amarillo_mangas_abullonadas', 'morado_estrellas_lunas',
  'rojo_terciopelo_corona', 'verde_esmeralda_sirena', 'blanco_dorado_plumas', 'coral_perlas', 'menta_encaje', 'naranja_abertura', 'negro_plata', 'lavanda_mariposa', 'dorado_un_hombro',
];
const ropaQuadArchivos = ['chaleco_salvavidas', 'capa_arnes', 'bandana', 'collar_mono', 'sweater_rayado', 'chaleco_verde', 'tutu', 'capa_murcielago'];

const ropa: Prenda[] = [
  ...ropaBipedArchivos.map(id => ({ id, archivo: `${id}.png`, carpeta: 'ropa-biped', categoria: 'ropa' as Categoria, zona: 'torso' as Zona, tipos: ['biped'] as Tipo[] })),
  ...vestidosPrincesa.map(id => ({ id, archivo: `${id}.png`, carpeta: 'vestidos-princesa', categoria: 'ropa' as Categoria, zona: 'torso' as Zona, tipos: ['biped'] as Tipo[] })),
  ...ropaQuadArchivos.map(id => ({ id: `q_${id}`, archivo: `${id}.png`, carpeta: 'ropa-quad', categoria: 'ropa' as Categoria, zona: 'torso' as Zona, tipos: ['cuadrupedo'] as Tipo[] })),
];

const zapatosArchivos = ['zapatillas_luces', 'bota_pato', 'sandalia_arcoiris', 'chatita_mono', 'zapatilla_bota_roja', 'bota_vaquero', 'pantuflas_conejo', 'bota_nieve', 'zapato_charol'];
const zapatos: Prenda[] = zapatosArchivos.map(id => ({ id, archivo: `${id}.png`, carpeta: 'zapatos', categoria: 'zapatos', zona: 'pies', tipos: ['biped', 'cuadrupedo'] }));

const TODAS_LAS_PRENDAS: Prenda[] = [...accesorios, ...ropa, ...zapatos];

// Anclaje de cada zona sobre el "wrapper" del personaje (% del ancho/alto del wrapper)
const ANCLAJE: Record<Zona, { top: string; left: string; width: string }> = {
  cabeza: { top: '-6%', left: '50%', width: '58%' },
  cara: { top: '20%', left: '50%', width: '42%' },
  cuello: { top: '32%', left: '50%', width: '50%' },
  espalda: { top: '28%', left: '82%', width: '38%' },
  cintura: { top: '56%', left: '50%', width: '62%' },
  torso: { top: '30%', left: '50%', width: '88%' },
  pies: { top: '92%', left: '50%', width: '65%' },
};

const TABS: { id: Categoria; emoji: string }[] = [
  { id: 'accesorios', emoji: '🎀' },
  { id: 'ropa', emoji: '👕' },
  { id: 'zapatos', emoji: '👟' },
];

type Arrastrando = { prenda: Prenda; x: number; y: number };

export default function TallerPage() {
  const router = useRouter();
  const [personajeId, setPersonajeId] = useState('tizi');
  const [tab, setTab] = useState<Categoria>('accesorios');
  const [equipado, setEquipado] = useState<Record<string, Partial<Record<Zona, Prenda>>>>({});
  const [arrastrando, setArrastrando] = useState<Arrastrando | null>(null);
  const [bounce, setBounce] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ startX: number; startY: number } | null>(null);

  const personaje = PERSONAJES.find(p => p.id === personajeId)!;
  const equipadoActual = equipado[personajeId] || {};

  const itemsCategoria = TODAS_LAS_PRENDAS.filter(p => p.categoria === tab && p.tipos.includes(personaje.tipo));
  const equipadoIds = new Set(Object.values(equipadoActual).filter(Boolean).map(p => p!.id));
  const trayItems = itemsCategoria.filter(p => !equipadoIds.has(p.id));

  const onPersonajeSwitch = (id: string) => {
    setPersonajeId(id);
    note(659, 0.15, 0.15);
  };

  const onTrayPointerDown = (prenda: Prenda) => (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragInfo.current = { startX: e.clientX, startY: e.clientY };
    setArrastrando({ prenda, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onContainerPointerMove = (e: React.PointerEvent) => {
    if (!arrastrando) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setArrastrando(prev => prev && ({ ...prev, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }));
  };

  const onContainerPointerUp = (e: React.PointerEvent) => {
    if (!arrastrando) return;
    const charRect = charRef.current?.getBoundingClientRect();
    const dentro = charRect &&
      e.clientX > charRect.left - charRect.width * 0.3 && e.clientX < charRect.right + charRect.width * 0.3 &&
      e.clientY > charRect.top - charRect.height * 0.3 && e.clientY < charRect.bottom + charRect.height * 0.15;

    if (dentro) {
      const { prenda } = arrastrando;
      setEquipado(prev => ({ ...prev, [personajeId]: { ...prev[personajeId], [prenda.zona]: prenda } }));
      melody([523, 659, 784, 1046], 90, 0.24, 0.2);
      vib([15, 10, 20]);
      setBounce(true);
      setTimeout(() => setBounce(false), 280);
    }
    setArrastrando(null);
    dragInfo.current = null;
  };

  const quitarPrenda = (zona: Zona) => () => {
    const item = equipadoActual[zona];
    if (!item) return;
    setEquipado(prev => {
      const next = { ...prev[personajeId] };
      delete next[zona];
      return { ...prev, [personajeId]: next };
    });
    melody([392, 349], 100, 0.2, 0.16);
    vib(10);
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#3a2418', position: 'relative', touchAction: 'none' }}>
      <button
        onClick={() => router.push('/mundo/0/aldea')}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 80, width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,10,40,.75)', color: 'white', border: 'none', fontSize: 18 }}
      >←</button>

      <div style={{ position: 'absolute', top: 10, left: 58, zIndex: 80, background: 'rgba(20,10,40,.75)', borderRadius: 20, padding: '5px 12px', color: 'white', fontWeight: 700, fontSize: 13, border: '2px solid rgba(255,255,255,.4)' }}>
        👗 El Taller de Vestuario
      </div>

      {/* Selector de personaje */}
      <div style={{
        position: 'absolute', top: 56, left: 0, right: 0, zIndex: 70, display: 'flex', gap: 8,
        justifyContent: 'center', flexWrap: 'wrap', padding: '0 8px',
      }}>
        {PERSONAJES.map(p => (
          <button key={p.id} onClick={() => onPersonajeSwitch(p.id)}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: p.id === personajeId ? '3px solid #ffd76a' : '2px solid rgba(255,255,255,.5)',
              background: 'rgba(20,10,40,.55)', padding: 0, overflow: 'hidden', flexShrink: 0,
            }}>
            <img src={`${CHAR_BASE}/${p.archivo}`} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </button>
        ))}
      </div>

      {/* Tabs de categoría */}
      <div style={{ position: 'absolute', top: 56, right: 10, zIndex: 70, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); note(587, 0.12, 0.14); }}
            style={{
              width: 42, height: 42, borderRadius: 12, fontSize: 20,
              background: tab === t.id ? 'rgba(255,215,106,.35)' : 'rgba(20,10,40,.55)',
              border: tab === t.id ? '2px solid #ffd76a' : '2px solid rgba(255,255,255,.35)', color: 'white',
            }}>{t.emoji}</button>
        ))}
      </div>

      <div style={{ position: 'absolute', inset: 0 }}
        ref={containerRef}
        onPointerMove={onContainerPointerMove}
        onPointerUp={onContainerPointerUp}
        onPointerCancel={() => { setArrastrando(null); dragInfo.current = null; }}
      >
        <Image src={BG} alt="El Taller de Vestuario" fill priority style={{ objectFit: 'cover', objectPosition: 'center' }} />

        {/* Personaje + prendas equipadas */}
        <div ref={charRef} style={{
          position: 'absolute', left: '50%', top: '60%', width: '24%',
          transform: `translate(-50%,-50%) scale(${bounce ? 1.08 : 1})`,
          transition: 'transform .22s cubic-bezier(.34,1.56,.64,1)', zIndex: 30,
        }}>
          <img src={`${CHAR_BASE}/${personaje.archivo}`} alt={personaje.nombre} draggable={false}
            style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 10px 12px rgba(0,0,0,.4))' }} />
          {(Object.keys(ANCLAJE) as Zona[]).map(zona => {
            const item = equipadoActual[zona];
            if (!item) return null;
            const a = ANCLAJE[zona];
            return (
              <img key={zona} src={`${ROPA_BASE}/${item.carpeta}/${item.archivo}`} alt={item.id} draggable={false}
                onPointerDown={(e) => { e.stopPropagation(); quitarPrenda(zona)(); }}
                style={{
                  position: 'absolute', top: a.top, left: a.left, width: a.width,
                  transform: 'translate(-50%,0)', zIndex: zona === 'torso' ? 25 : 35, cursor: 'pointer', touchAction: 'none',
                  filter: 'drop-shadow(0 4px 5px rgba(0,0,0,.3))',
                }} />
            );
          })}
        </div>

        {/* Prenda siendo arrastrada */}
        {arrastrando && (
          <img src={`${ROPA_BASE}/${arrastrando.prenda.carpeta}/${arrastrando.prenda.archivo}`} alt="" draggable={false}
            style={{
              position: 'absolute', left: `${arrastrando.x}%`, top: `${arrastrando.y}%`, width: '18%',
              transform: 'translate(-50%,-50%) scale(1.12)', zIndex: 90, pointerEvents: 'none',
              filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.45))',
            }} />
        )}

        {/* Bandeja de prendas de la categoría activa */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60,
          background: 'rgba(20,10,20,.55)', backdropFilter: 'blur(6px)',
          padding: '10px 10px 14px', display: 'flex', gap: 10, overflowX: 'auto',
        }}>
          {trayItems.map(prenda => (
            <img key={prenda.id} src={`${ROPA_BASE}/${prenda.carpeta}/${prenda.archivo}`} alt={prenda.id} draggable={false}
              onPointerDown={onTrayPointerDown(prenda)}
              style={{
                width: 64, height: 64, objectFit: 'contain', flexShrink: 0, cursor: 'grab', touchAction: 'none',
                background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 4,
              }} />
          ))}
          {trayItems.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, padding: '20px 8px' }}>¡Ya probaste todo acá! 🎉</div>
          )}
        </div>
      </div>
    </div>
  );
}
