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

// ---- Sistema de voz guiada, adaptado al idioma del dispositivo ----
const IDIOMA_DETECTADO = typeof navigator !== 'undefined' ? (navigator.language || 'es').slice(0, 2).toLowerCase() : 'es';
const LOCALE_VOZ: Record<string, string> = { es: 'es-419', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', id: 'id-ID', sw: 'sw-KE', hi: 'hi-IN' };
const FRASES: Record<string, Record<string, string>> = {
  bienvenida: {
    es: '¡Hola! Soy Toqwow. Arrastrame por el bosque hasta las lucesitas brillantes.',
    en: "Hi! I'm Toqwow. Drag me around the forest to the glowing lights.",
    pt: 'Oi! Eu sou o Toqwow. Me arraste pela floresta até as lucinhas brilhantes.',
  },
  mapa: {
    es: 'Este es el mapa del bosque. Tocá una zona para ir ahí.',
    en: 'This is the forest map. Tap a zone to go there.',
    pt: 'Este é o mapa da floresta. Toque em uma área para ir até lá.',
  },
  zonaCompleta: {
    es: '¡Muy bien! Encontraste todas las luces de esta zona.',
    en: 'Great job! You found all the lights in this zone.',
    pt: 'Muito bem! Você encontrou todas as luzes desta área.',
  },
  portalNoListo: {
    es: 'Todavía faltan luces por encontrar en el bosque.',
    en: 'There are still more lights to find in the forest.',
    pt: 'Ainda faltam luzes para encontrar na floresta.',
  },
  portalListo: {
    es: '¡Lo lograste! Tocá el portal para continuar la aventura.',
    en: 'You did it! Tap the portal to continue the adventure.',
    pt: 'Você conseguiu! Toque no portal para continuar a aventura.',
  },
  nuevoAmigo: {
    es: '¡Un nuevo amigo llegó al bosque!',
    en: 'A new friend arrived in the forest!',
    pt: 'Um novo amigo chegou à floresta!',
  },
  presentacionIntro: {
    es: '¡Hola! Soy Toqwow. Estos son mis amigos del bosque. Elegí con quién querés jugar. Podés cambiar cuando quieras.',
    en: "Hi! I'm Toqwow. These are my forest friends. Pick who you want to play with. You can change anytime.",
    pt: 'Oi! Eu sou o Toqwow. Estes são meus amigos da floresta. Escolha com quem você quer brincar. Você pode trocar quando quiser.',
  },
  zona0: {
    es: 'Tocá el mapa dorado para ver todo el bosque.',
    en: 'Tap the golden map to see the whole forest.',
    pt: 'Toque no mapa dourado para ver toda a floresta.',
  },
  zona1: {
    es: 'Arrastrá a un amigo hasta las lucesitas brillantes para juntarlas.',
    en: 'Drag a friend to the glowing lights to collect them.',
    pt: 'Arraste um amigo até as lucinhas brilhantes para coletá-las.',
  },
  zona2: {
    es: 'Arrastrá a un amigo hasta las puertas de las casitas de hongo.',
    en: 'Drag a friend to the doors of the little mushroom houses.',
    pt: 'Arraste um amigo até as portas das casinhas de cogumelo.',
  },
  zona3: {
    es: 'Cruzá el puente y arrastrá a un amigo cerca de las luces del camino.',
    en: 'Cross the bridge and drag a friend close to the path lights.',
    pt: 'Atravesse a ponte e arraste um amigo perto das luzes do caminho.',
  },
  zona4: {
    es: 'Arrastrá a un amigo hasta el agua para que flote.',
    en: 'Drag a friend into the water so they float.',
    pt: 'Arraste um amigo até a água para que ele flutue.',
  },
  zona5: {
    es: 'Arrastrá a un amigo cerca de las gotitas brillantes en las hojas.',
    en: 'Drag a friend close to the sparkling dewdrops on the leaves.',
    pt: 'Arraste um amigo perto das gotinhas brilhantes nas folhas.',
  },
  zona6: {
    es: 'Arrastrá a un amigo hasta las nubes de luciérnagas de colores.',
    en: 'Drag a friend to the colorful firefly clouds.',
    pt: 'Arraste um amigo até as nuvens coloridas de vaga-lumes.',
  },
  zona7: {
    es: 'Arrastrá a un amigo cerca de las rocas brillantes para descubrir algo.',
    en: 'Drag a friend close to the glowing rocks to discover something.',
    pt: 'Arraste um amigo perto das pedras brilhantes para descobrir algo.',
  },
  zona8: {
    es: 'Arrastrá a un amigo cerca de la entrada brillante de la cueva.',
    en: 'Drag a friend close to the glowing cave entrance.',
    pt: 'Arraste um amigo perto da entrada brilhante da caverna.',
  },
  zona9: {
    es: 'Juntá todas las luces del bosque para abrir el portal.',
    en: 'Collect all the forest lights to open the portal.',
    pt: 'Colete todas as luzes da floresta para abrir o portal.',
  },
};
let mutedGlobal = false;
let idiomaGlobal = IDIOMA_DETECTADO;
const hablar = (clave: string) => {
  if (mutedGlobal) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const dict = FRASES[clave];
  if (!dict) return;
  const texto = dict[idiomaGlobal] || dict['es'];
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = LOCALE_VOZ[idiomaGlobal] || 'es-419';
    u.rate = 0.95; u.pitch = 1.2; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
};
const hablarTexto = (texto: string) => {
  if (mutedGlobal) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = LOCALE_VOZ[idiomaGlobal] || 'es-419';
    u.rate = 0.95; u.pitch = 1.2; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
};

const PROGRESO_TXT = {
  faltanZona: { es: (n: number) => `Todavía faltan ${n} luces en esta zona.`, en: (n: number) => `There are still ${n} lights left in this zone.`, pt: (n: number) => `Ainda faltam ${n} luzes nesta área.` },
  zonaLista: { es: '¡Ya encontraste todas las luces de esta zona! Seguí explorando el bosque.', en: 'You found all the lights in this zone! Keep exploring the forest.', pt: 'Você encontrou todas as luzes desta área! Continue explorando a floresta.' },
  faltanMundo: { es: (n: number) => `Te faltan ${n} luces en todo el bosque para abrir el portal.`, en: (n: number) => `You need ${n} more lights in the whole forest to open the portal.`, pt: (n: number) => `Faltam ${n} luzes em toda a floresta para abrir o portal.` },
  mundoListo: { es: 'Ya juntaste todas las luces. ¡Andá al Mirador de la Luna para pasar al siguiente mundo!', en: "You've collected all the lights. Head to the Moon Overlook to move to the next world!", pt: 'Você já coletou todas as luzes. Vá ao Mirante da Lua para ir ao próximo mundo!' },
};

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

const ICONO_ZONA = ['🗺️', '✨', '🚪', '🌉', '💧', '🔍', '🎈', '🪨', '💎', '🌙'];
const ZONA_WOW_COLOR: Record<number, string> = {
  0: 'rgba(255,220,120,.55)', 1: 'rgba(180,150,255,.5)', 2: 'rgba(255,180,120,.5)',
  3: 'rgba(150,220,255,.5)', 5: 'rgba(255,230,180,.55)', 6: 'rgba(255,150,200,.5)', 8: 'rgba(140,230,220,.5)',
};

type ActiveBurst = { id: number; x: number; y: number; zonaIdx: number; tipo?: 'sparkle' | 'splash'; emoji?: string; };

export default function Mundo1() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [bursts, setBursts] = useState<ActiveBurst[]>([]);
  const [trail, setTrail] = useState<{ id: number; x: number; y: number }[]>([]);
  const trailId = useRef(0);
  const lastTrailT = useRef<Record<string, number>>({});
  const [showGuide, setShowGuide] = useState(true);
  const [mostrarPresentacion, setMostrarPresentacion] = useState(false);
  const [presentacionIdx, setPresentacionIdx] = useState(0);
  const [personajeActivo, setPersonajeActivo] = useState<string>('toqwow');
  const [showMap, setShowMap] = useState(false);
  const [portalNudge, setPortalNudge] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idioma, setIdioma] = useState<string>(IDIOMA_DETECTADO);
  const burstId = useRef(0);

  useEffect(() => { mutedGlobal = muted; }, [muted]);
  useEffect(() => { idiomaGlobal = idioma; }, [idioma]);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem('toqwow_idioma');
      if (guardado) setIdioma(guardado);
    } catch {}
  }, []);

  const elegirIdioma = useCallback((id: string) => {
    setIdioma(id);
    try { window.localStorage.setItem('toqwow_idioma', id); } catch {}
    note(659, 0.15, 0.15);
  }, []);

  // Roster de amigos adicionales, convocables desde la bandeja inferior
  const AMIGOS_EXTRA = [
    { id: 'zoe', src: 'char_zoe.png', nombre: 'Zoe' },
    { id: 'puli', src: 'char_puli.png', nombre: 'Puli' },
    { id: 'tito', src: 'char_tito.png', nombre: 'Tito' },
    { id: 'luta', src: 'char_luta.png', nombre: 'Luta' },
    { id: 'copo', src: 'char_copo.png', nombre: 'Copo de Nieve' },
    { id: 'vago', src: 'char_vago_v2.png', nombre: 'Vago' },
    { id: 'michi', src: 'char_michi_v2.png', nombre: 'Michi' },
  ];
  // Roster completo (10) para la presentacion inicial y referencia general
  const TODOS_PERSONAJES = [
    { id: 'toqwow', src: 'char_toqwow_v3.png', nombre: 'Toqwow' },
    { id: 'tizi', src: 'char_tizi_v3.png', nombre: 'Tizi' },
    { id: 'coti', src: 'char_coti_v3.png', nombre: 'Coti' },
    ...AMIGOS_EXTRA,
  ];
  const [amigosEnJuego, setAmigosEnJuego] = useState<Record<string, number>>({}); // id -> zonaIdx donde esta parado
  const [zonaVisible, setZonaVisible] = useState(0);

  const detectarZonaVisible = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const zw = el.scrollWidth / ZONAS.length;
    return Math.round(el.scrollLeft / zw);
  }, []);

  const zonasExplicadasRef = useRef<Set<number>>(new Set());
  const [cartelZona, setCartelZona] = useState<number | null>(null);
  const [cartelAyuda, setCartelAyuda] = useState<string | null>(null);
  const cartelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pedirAyuda = useCallback((zi: number) => {
    const faltanZona = ZONAS[zi].hotspots.filter((_, hi) => !collected.has(`${zi}-${hi}`)).length;
    const faltanMundo = TOTAL_HOTSPOTS - collected.size;
    const idx = (['es', 'en', 'pt'].includes(idioma) ? idioma : 'es') as 'es' | 'en' | 'pt';
    const parte1 = faltanZona > 0 ? PROGRESO_TXT.faltanZona[idx](faltanZona) : PROGRESO_TXT.zonaLista[idx];
    const parte2 = faltanMundo > 0 ? PROGRESO_TXT.faltanMundo[idx](faltanMundo) : PROGRESO_TXT.mundoListo[idx];
    const texto = `${parte1} ${parte2}`;
    setCartelZona(null);
    setCartelAyuda(texto);
    hablarTexto(texto);
    note(659, 0.15, 0.15);
    if (cartelTimeoutRef.current) clearTimeout(cartelTimeoutRef.current);
    cartelTimeoutRef.current = setTimeout(() => setCartelAyuda(null), 5500);
  }, [collected, idioma]);

  const mostrarCartelZona = useCallback((zi: number) => {
    if (zonasExplicadasRef.current.has(zi)) return;
    zonasExplicadasRef.current.add(zi);
    setCartelZona(zi);
    hablar(`zona${zi}`);
    if (cartelTimeoutRef.current) clearTimeout(cartelTimeoutRef.current);
    cartelTimeoutRef.current = setTimeout(() => setCartelZona(null), 4200);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || mostrarPresentacion) return;
    let debounce: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const nueva = detectarZonaVisible();
        setZonaVisible(nueva);
        mostrarCartelZona(nueva);
      }, 350);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Mostrar cartel de la Zona 0 apenas se carga el mundo (o apenas se cierra la presentacion)
    const t = setTimeout(() => mostrarCartelZona(0), 1200);
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(debounce); clearTimeout(t); };
  }, [detectarZonaVisible, mostrarCartelZona, mostrarPresentacion]);

  const convocarAmigo = useCallback((id: string) => {
    setAmigosEnJuego(prev => ({ ...prev, [id]: zonaVisible }));
    hablar('nuevoAmigo');
    melody([440, 554, 659], 90, 0.25, 0.16);
    vib(15);
  }, [zonaVisible]);

  // ---- Sistema transversal de arrastre: fisica de inercia + squash&stretch + reacciones ----
  type DragInfo = { key: string; startClientX: number; startClientY: number; startX: number; startY: number; lastX: number; lastY: number; lastT: number; vx: number; vy: number; };
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [squash, setSquash] = useState<Record<string, 'grab' | 'drop' | null>>({});
  const [floating, setFloating] = useState<Record<string, boolean>>({});
  const dragState = useRef<DragInfo | null>(null);
  const rafRef = useRef<Record<string, number>>({});
  const lastRunSoundT = useRef<Record<string, number>>({});
  const runStepAlto = useRef<Record<string, boolean>>({});

  const clearCoast = (key: string) => {
    if (rafRef.current[key]) { cancelAnimationFrame(rafRef.current[key]); delete rafRef.current[key]; }
  };

  const startDrag = useCallback((key: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    clearCoast(key);
    const current = dragPos[key] || { x: 0, y: 0 };
    const now = performance.now();
    dragState.current = { key, startClientX: e.clientX, startClientY: e.clientY, startX: current.x, startY: current.y, lastX: e.clientX, lastY: e.clientY, lastT: now, vx: 0, vy: 0 };
    setSquash(prev => ({ ...prev, [key]: 'grab' }));
    setPersonajeActivo(key.slice(0, key.lastIndexOf('-')));
    note(660, 0.15, 0.15); vib(10);
  }, [dragPos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const now = performance.now();
    const dt = Math.max(now - ds.lastT, 1);
    ds.vx = (e.clientX - ds.lastX) / dt;
    ds.vy = (e.clientY - ds.lastY) / dt;
    ds.lastX = e.clientX; ds.lastY = e.clientY; ds.lastT = now;
    const dx = e.clientX - ds.startClientX;
    const dy = e.clientY - ds.startClientY;
    setDragPos(prev => ({ ...prev, [ds.key]: { x: ds.startX + dx, y: ds.startY + dy } }));

    // Sonido de "carrera" mientras se mueve el personaje arrastrado (sintetizado, tipo saltito 8-bit)
    const movimientoReal = Math.abs(ds.vx) + Math.abs(ds.vy) > 0.03;
    if (movimientoReal) {
      const lastRun = lastRunSoundT.current[ds.key] || 0;
      if (now - lastRun > 150) {
        lastRunSoundT.current[ds.key] = now;
        const alto = !runStepAlto.current[ds.key];
        runStepAlto.current[ds.key] = alto;
        note(alto ? 520 : 415, 0.09, 0.05, 'square');
      }
    }

    // Zona 1 "Puerta de Musgo": rastro de florcitas al pasar bajo el arco
    const zoneOfKey = parseInt(ds.key.split('-').pop() || '-1', 10);
    if (zoneOfKey === 0) {
      const lastT = lastTrailT.current[ds.key] || 0;
      if (now - lastT > 90) {
        lastTrailT.current[ds.key] = now;
        const id = ++trailId.current;
        setTrail(prev => [...prev.slice(-14), { id, x: e.clientX, y: e.clientY }]);
        setTimeout(() => setTrail(prev => prev.filter(t => t.id !== id)), 750);
      }
    }
  }, []);

  const coast = useCallback((key: string, vx: number, vy: number) => {
    let velX = vx * 16, velY = vy * 16;
    const friction = 0.9;
    const step = () => {
      velX *= friction; velY *= friction;
      setDragPos(prev => {
        const cur = prev[key] || { x: 0, y: 0 };
        return { ...prev, [key]: { x: cur.x + velX, y: cur.y + velY } };
      });
      if (Math.abs(velX) > 0.3 || Math.abs(velY) > 0.3) {
        rafRef.current[key] = requestAnimationFrame(step);
      } else {
        delete rafRef.current[key];
      }
    };
    rafRef.current[key] = requestAnimationFrame(step);
  }, []);

  // Puntos de reaccion tematica por zona (reutilizan coordenadas de los hotspots como anclas de objetos clave)
  const PUNTOS_REACCION: Record<number, { x: number; y: number; tipo: string; emoji: string; sonido: () => void }[]> = {
    1: [{ x: 1651, y: 691, tipo: 'corona', emoji: '✨', sonido: () => melody([659, 784, 988, 1175], 70, 0.3, 0.16) }],
    2: [
      { x: 826, y: 845, tipo: 'puerta', emoji: '🚪', sonido: () => { note(392, 0.1, 0.15); setTimeout(() => note(523, 0.15, 0.15), 90); } },
      { x: 1376, y: 768, tipo: 'puerta', emoji: '🚪', sonido: () => { note(392, 0.1, 0.15); setTimeout(() => note(523, 0.15, 0.15), 90); } },
      { x: 1926, y: 845, tipo: 'puerta', emoji: '🚪', sonido: () => { note(392, 0.1, 0.15); setTimeout(() => note(523, 0.15, 0.15), 90); } },
      { x: 2339, y: 768, tipo: 'puerta', emoji: '🚪', sonido: () => { note(392, 0.1, 0.15); setTimeout(() => note(523, 0.15, 0.15), 90); } },
    ],
    3: [{ x: 1450, y: 1050, tipo: 'secreto', emoji: '🧚', sonido: () => melody([784, 988, 1175, 1568], 90, 0.3, 0.18) }],
    5: [
      { x: 963, y: 998, tipo: 'lupa', emoji: '🔍', sonido: () => note(880, 0.2, 0.15) },
      { x: 1514, y: 922, tipo: 'lupa', emoji: '🔍', sonido: () => note(880, 0.2, 0.15) },
      { x: 1926, y: 998, tipo: 'lupa', emoji: '🔍', sonido: () => note(880, 0.2, 0.15) },
    ],
    7: [
      { x: 1101, y: 845, tipo: 'rumble', emoji: '💨', sonido: () => note(90, 0.3, 0.25, 'sawtooth') },
      { x: 1651, y: 768, tipo: 'rumble', emoji: '💨', sonido: () => note(90, 0.3, 0.25, 'sawtooth') },
      { x: 2064, y: 922, tipo: 'rumble', emoji: '💨', sonido: () => note(90, 0.3, 0.25, 'sawtooth') },
    ],
    8: [
      { x: 1238, y: 845, tipo: 'eco', emoji: '💫', sonido: () => melody([523, 659, 784], 100, 0.35, 0.18) },
      { x: 1789, y: 768, tipo: 'eco', emoji: '💫', sonido: () => melody([523, 659, 784], 100, 0.35, 0.18) },
    ],
  };
  const RADIO_REACCION = 220; // px en coordenadas nativas de la zona (2752x1536)
  const RADIO_HOTSPOT = 210; // px en coordenadas nativas — mismo criterio que los puntos tematicos
  const [rumbleZona, setRumbleZona] = useState<number | null>(null);

  // Reacciones de personalidad: que hace CADA personaje al soltarlo en CADA zona (segun el GDD)
  const REACCIONES_PERSONAJE: Record<string, { emoji: string; sonido: () => void }> = {
    '0-copo': { emoji: '💤', sonido: () => { note(220, 0.3, 0.15); setTimeout(() => note(196, 0.3, 0.12), 250); } },
    '0-vago': { emoji: '💤', sonido: () => { note(196, 0.3, 0.15); setTimeout(() => note(174, 0.3, 0.12), 250); } },
    '0-michi': { emoji: '😻', sonido: () => melody([784, 880, 784], 90, 0.25, 0.15) },
    '1-puli': { emoji: '📝', sonido: () => melody([988, 1046, 1108], 60, 0.15, 0.12) },
    '1-tito': { emoji: '😋', sonido: () => { note(392, 0.15, 0.18); setTimeout(() => note(330, 0.2, 0.15), 130); } },
    '2-zoe': { emoji: '🎉', sonido: () => melody([659, 784, 988], 80, 0.3, 0.2) },
    '2-luta': { emoji: '🤷', sonido: () => note(330, 0.15, 0.12) },
    '3-vago': { emoji: '🌉', sonido: () => { note(220, 0.15, 0.18, 'triangle'); setTimeout(() => note(196, 0.15, 0.15, 'triangle'), 100); } },
    '5-puli': { emoji: '🔍', sonido: () => melody([880, 1046], 90, 0.2, 0.16) },
    '5-copo': { emoji: '🤧', sonido: () => { note(440, 0.08, 0.15); setTimeout(() => note(220, 0.15, 0.15), 90); } },
    '6-michi': { emoji: '🐾', sonido: () => melody([523, 587, 523], 90, 0.2, 0.14) },
    '6-tito': { emoji: '💫', sonido: () => note(660, 0.4, 0.15) },
    '7-luta': { emoji: '💪', sonido: () => melody([392, 523, 659], 100, 0.3, 0.2) },
    '7-vago': { emoji: '😵', sonido: () => { note(180, 0.3, 0.2, 'sawtooth'); setTimeout(() => note(150, 0.3, 0.15), 200); } },
    '8-michi': { emoji: '❓', sonido: () => note(587, 0.15, 0.12) },
    '8-vago': { emoji: '❓', sonido: () => note(523, 0.15, 0.12) },
    '8-zoe': { emoji: '🦸', sonido: () => melody([523, 659, 784, 1046], 90, 0.35, 0.2) },
  };
  const CELEBRACION_PERSONAJE: Record<string, string> = {
    toqwow: '🌟', tizi: '🎀', coti: '👓', zoe: '🎉', puli: '📚', tito: '💃', luta: '💪', copo: '🐾', vago: '🐕', michi: '😻',
  };

  const chequearPuntosTematicos = useCallback((zi: number, e: React.PointerEvent) => {
    const puntos = PUNTOS_REACCION[zi];
    if (!puntos) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = target.closest('[data-zona-container]') as HTMLElement | null;
    if (!container) return;
    const contRect = container.getBoundingClientRect();
    const relX = (rect.left + rect.width / 2 - contRect.left) / contRect.width;
    const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
    const nativeX = relX * ZONA_WIDTH;
    const nativeY = relY * ZONA_HEIGHT;
    for (const punto of puntos) {
      const dist = Math.hypot(nativeX - punto.x, nativeY - punto.y);
      if (dist < RADIO_REACCION) {
        const id = ++burstId.current;
        const px = contRect.left + (punto.x / ZONA_WIDTH) * contRect.width;
        const py = contRect.top + (punto.y / ZONA_HEIGHT) * contRect.height;
        setBursts(prev => [...prev, { id, x: px, y: py, zonaIdx: zi, tipo: 'sparkle', emoji: punto.emoji }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        punto.sonido();
        vib(punto.tipo === 'rumble' ? [10, 30, 10] : 15);
        if (punto.tipo === 'rumble') {
          setRumbleZona(zi);
          setTimeout(() => setRumbleZona(null), 350);
        }
        break;
      }
    }
  }, []);

  const chequearReaccion = useCallback((zi: number, key: string, e: React.PointerEvent) => {
    const charId = key.slice(0, key.lastIndexOf('-'));
    if (zi === 4) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const container = target.closest('[data-zona-container]') as HTMLElement | null;
      if (!container) return;
      const contRect = container.getBoundingClientRect();
      const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
      const enAgua = relY > 0.42;

      // Michi se resiste al agua: reaccion propia en vez de flotar
      if (charId === 'michi' && enAgua) {
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji: '💨' }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        note(311, 0.2, 0.2, 'sawtooth');
        vib([10, 10, 10]);
        return;
      }

      const yaFlotando = !!floating[key];
      setFloating(prev => ({ ...prev, [key]: enAgua }));
      if (enAgua && !yaFlotando) {
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'splash' }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        melody([392, 330, 262], 110, 0.35, 0.2);
        vib([15, 20, 15, 30]);
      } else if (!enAgua && yaFlotando) {
        note(440, 0.15, 0.15);
      }
      return;
    }

    // Reaccion de personalidad especifica (personaje + zona), si esta definida
    const reaccionPersonal = REACCIONES_PERSONAJE[`${zi}-${charId}`];
    if (reaccionPersonal) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const id = ++burstId.current;
      setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji: reaccionPersonal.emoji }]);
      setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
      reaccionPersonal.sonido();
      vib(15);
      return;
    }

    // Celebracion especial en el Mirador (Zona 10) si el mundo ya esta completo
    if (zi === 9 && collected.size === TOTAL_HOTSPOTS) {
      const emoji = CELEBRACION_PERSONAJE[charId];
      if (emoji) {
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const id = ++burstId.current;
        setBursts(prev => [...prev, { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, zonaIdx: zi, tipo: 'sparkle', emoji }]);
        setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
        melody([659, 784, 988, 1318], 80, 0.3, 0.2);
        vib([15, 15, 15, 40]);
        return;
      }
    }

    chequearPuntosTematicos(zi, e);
  }, [floating, chequearPuntosTematicos, collected]);

  const squashTransform = (key: string) => {
    const sq = squash[key];
    if (sq === 'grab') return 'scale(0.88,1.12)';
    if (sq === 'drop') return 'scale(1.15,0.85)';
    return 'scale(1,1)';
  };


  // Presentacion inicial: Toqwow nombra a los 10 personajes disponibles desde el dia 1,
  // una sola vez por dispositivo. El nino puede cambiar de personaje activo en cualquier
  // zona despues (bandeja + Tizi/Coti/Toqwow siempre presentes).
  useEffect(() => {
    const yaPresentado = typeof window !== 'undefined' && window.localStorage.getItem('toqwow_personajes_presentados');
    setMostrarPresentacion(!yaPresentado);
  }, []);

  useEffect(() => {
    if (!mostrarPresentacion) return;
    if (presentacionIdx === 0) {
      const t0 = setTimeout(() => hablarTexto(FRASES.presentacionIntro[idiomaGlobal] || FRASES.presentacionIntro.es), 500);
      const t1 = setTimeout(() => setPresentacionIdx(1), 3600);
      return () => { clearTimeout(t0); clearTimeout(t1); };
    }
    const i = presentacionIdx - 1;
    if (i >= TODOS_PERSONAJES.length) return;
    const t = setTimeout(() => hablarTexto(TODOS_PERSONAJES[i].nombre), 150);
    const t2 = setTimeout(() => setPresentacionIdx(p => p + 1), 1150);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [mostrarPresentacion, presentacionIdx]);

  const cerrarPresentacion = useCallback((idElegido?: string) => {
    setMostrarPresentacion(false);
    if (idElegido) setPersonajeActivo(idElegido);
    try { window.localStorage.setItem('toqwow_personajes_presentados', '1'); } catch {}
    setTimeout(() => hablar('bienvenida'), 500);
  }, []);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && window.localStorage.getItem('toqwow_mundo1_tutorial_visto');
    if (seen) setShowGuide(false);
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try { window.localStorage.setItem('toqwow_mundo1_tutorial_visto', '1'); } catch {}
  }, []);

  const [zonaCelebrando, setZonaCelebrando] = useState<number | null>(null);
  const [wowZona, setWowZona] = useState<number | null>(null);

  const dispararWow = useCallback((zi: number) => {
    setWowZona(zi);
    const secuencias: Record<number, () => void> = {
      0: () => melody([659, 784, 988, 1318], 110, 0.4, 0.22),
      1: () => { melody([392, 494, 587, 740, 880], 90, 0.35, 0.2); },
      2: () => melody([523, 659, 784, 1046, 1318], 80, 0.3, 0.2),
      3: () => melody([440, 554, 659, 880, 1108], 100, 0.35, 0.22),
      4: () => melody([392, 330, 392, 494, 587], 100, 0.3, 0.2),
      5: () => melody([784, 880, 988, 1174], 120, 0.4, 0.2),
      6: () => melody([659, 830, 988, 1318, 1568], 90, 0.3, 0.22),
      7: () => { note(90, 0.4, 0.25, 'sawtooth'); setTimeout(() => melody([440, 554, 659], 100, 0.3, 0.2), 300); },
      8: () => melody([523, 659, 784, 1046], 130, 0.45, 0.22),
      9: () => melody([659, 784, 988, 1318, 1568, 2093], 100, 0.4, 0.25),
    };
    (secuencias[zi] || secuencias[0])();
    vib([20, 40, 20, 40, 90]);
    setTimeout(() => setWowZona(null), 2600);
  }, []);

  const activarHotspot = useCallback((zonaIdx: number, hIdx: number, x: number, y: number) => {
    const key = `${zonaIdx}-${hIdx}`;
    setCollected(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      const zonaYaCompletaba = ZONAS[zonaIdx].hotspots.every((_, hi) => next.has(`${zonaIdx}-${hi}`));
      const zonaYaEstabaCompleta = ZONAS[zonaIdx].hotspots.every((_, hi) => prev.has(`${zonaIdx}-${hi}`));
      if (zonaYaCompletaba && !zonaYaEstabaCompleta) {
        setTimeout(() => {
          setZonaCelebrando(zonaIdx);
          hablar('zonaCompleta');
          dispararWow(zonaIdx);
          setTimeout(() => setZonaCelebrando(null), 1800);
        }, 200);
      }
      return next;
    });
    const id = ++burstId.current;
    setBursts(prev => [...prev, { id, x, y, zonaIdx, tipo: 'sparkle' }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 900);
    melody([523, 659, 784]);
    vib(20);
    if (showGuide) dismissGuide();
  }, [showGuide, dismissGuide, dispararWow]);

  // Las lucesitas ya no se completan al tocarlas: se completan al soltar un personaje
  // arrastrado cerca (mismo criterio de proximidad que los puntos tematicos). Devuelve
  // true si activo alguna, para que endDrag sepa que hubo match.
  const chequearHotspots = useCallback((zi: number, e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = target.closest('[data-zona-container]') as HTMLElement | null;
    if (!container) return false;
    const contRect = container.getBoundingClientRect();
    const relX = (rect.left + rect.width / 2 - contRect.left) / contRect.width;
    const relY = (rect.top + rect.height / 2 - contRect.top) / contRect.height;
    const nativeX = relX * ZONA_WIDTH;
    const nativeY = relY * ZONA_HEIGHT;
    const zona = ZONAS[zi];
    for (let hi = 0; hi < zona.hotspots.length; hi++) {
      const key = `${zi}-${hi}`;
      if (collected.has(key)) continue;
      const h = zona.hotspots[hi];
      const dist = Math.hypot(nativeX - h.x, nativeY - h.y);
      if (dist < RADIO_HOTSPOT) {
        const px = contRect.left + (h.x / ZONA_WIDTH) * contRect.width;
        const py = contRect.top + (h.y / ZONA_HEIGHT) * contRect.height;
        activarHotspot(zi, hi, px, py);
        return true;
      }
    }
    return false;
  }, [collected, activarHotspot]);

  const endDrag = useCallback((zi: number) => (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const key = ds.key;
    note(523, 0.18, 0.15);
    setSquash(prev => ({ ...prev, [key]: 'drop' }));
    setTimeout(() => setSquash(prev => ({ ...prev, [key]: null })), 220);
    chequearHotspots(zi, e);
    chequearReaccion(zi, key, e);
    coast(key, ds.vx, ds.vy);
    dragState.current = null;
  }, [coast, chequearReaccion, chequearHotspots]);

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
    hablar('mapa');
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
      hablar('portalListo');
      setTimeout(() => router.push('/mundo/2'), 500);
    } else {
      setPortalNudge(true);
      note(220, 0.3, 0.2, 'triangle');
      hablar('portalNoListo');
      setTimeout(() => setPortalNudge(false), 700);
    }
  }, [mundoCompleto, router]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1030', overflow: 'hidden', touchAction: 'none', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}>
      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', zIndex: 60, background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(10px)', isolation: 'isolate' }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 50, padding: '7px 16px', fontSize: 13, color: 'white', cursor: 'pointer' }}>← Inicio</button>
        <button onClick={abrirMapaConSonido} style={{ background: 'rgba(255, 200, 90, .18)', border: '1px solid rgba(255,200,90,.5)', borderRadius: 50, padding: '7px 18px', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          🗺️ Mapa del Bosque ({zonasCompletas}/10)
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,.08)', borderRadius: 20, padding: 3 }}>
            {[{ id: 'es', flag: '🇪🇸' }, { id: 'en', flag: '🇺🇸' }, { id: 'pt', flag: '🇧🇷' }].map(op => (
              <button
                key={op.id}
                onClick={() => elegirIdioma(op.id)}
                aria-label={`Idioma ${op.id}`}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none', fontSize: 14, cursor: 'pointer',
                  background: idioma === op.id ? 'rgba(255,220,150,.9)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{op.flag}</button>
            ))}
          </div>
          <button
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? 'Activar voz' : 'Silenciar voz'}
            style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', borderRadius: '50%', width: 34, height: 34, fontSize: 15, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >{muted ? '🔇' : '🔊'}</button>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', minWidth: 40, textAlign: 'right' }}>✨{progreso}/{TOTAL_HOTSPOTS}</div>
        </div>
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
          <div key={zona.indice} data-zona-container style={{ position: 'relative', flex: `0 0 auto`, height: '100%', aspectRatio: `${ZONA_WIDTH} / ${ZONA_HEIGHT}`, animation: rumbleZona === zi ? 'rockRumble .35s ease-in-out' : 'none' }}>
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
                  position: 'absolute', left: '22%', top: '66%', transform: 'translate(-50%,-50%)',
                  width: '17%', aspectRatio: '1/1', borderRadius: '50%', border: '5px solid rgba(255,215,120,.9)',
                  background: 'radial-gradient(circle, rgba(255,215,120,.45), rgba(255,215,120,.08))',
                  boxShadow: '0 0 30px rgba(255,215,120,.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6vh',
                  cursor: 'pointer', zIndex: 22, animation: 'mapPulse 2s ease-in-out infinite',
                }}
              >🗺️</button>
            )}

            {/* Personajes anfitriones: Toqwow + Tizi + Coti en la Arboleda (Zona 2) — arrastrables */}
            {zi === 1 && (
              <>
                <div style={{ position: 'absolute', left: '38%', top: '58%', width: '9%', zIndex: 18, transform: `translate(${dragPos[`tizi-${zi}`]?.x || 0}px, ${dragPos[`tizi-${zi}`]?.y || 0}px)` }}>
                  <div style={{ animation: dragState.current?.key === `tizi-${zi}` ? 'none' : 'charBounce 2.4s ease-in-out infinite' }}>
                    <img
                      src="/assets/mundo1/char_tizi_v3.png" alt="Tizi"
                      onPointerDown={startDrag(`tizi-${zi}`)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                      style={{
                        width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                        transform: squashTransform(`tizi-${zi}`), transition: 'transform .12s ease-out',
                        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                      }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', left: '47%', top: '60%', width: '8.5%', zIndex: 17, transform: `translate(${dragPos[`coti-${zi}`]?.x || 0}px, ${dragPos[`coti-${zi}`]?.y || 0}px)` }}>
                  <div style={{ animation: dragState.current?.key === `coti-${zi}` ? 'none' : 'charBounce 2.6s ease-in-out infinite .3s' }}>
                    <img
                      src="/assets/mundo1/char_coti_v3.png" alt="Coti"
                      onPointerDown={startDrag(`coti-${zi}`)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                      style={{
                        width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                        transform: squashTransform(`coti-${zi}`), transition: 'transform .12s ease-out',
                        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                      }} />
                  </div>
                </div>
              </>
            )}

            {zona.hotspots.map((h, hi) => {
              const key = `${zi}-${hi}`;
              const done = collected.has(key);
              const leftPct = (h.x / ZONA_WIDTH) * 100;
              const topPct = (h.y / ZONA_HEIGHT) * 100;
              return (
                <div
                  key={hi}
                  aria-hidden="true"
                  style={{
                    position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                    transform: 'translate(-50%,-50%)', width: '5%', aspectRatio: '1/1',
                    pointerEvents: 'none', zIndex: 20,
                  }}
                >
                  <img
                    src="/assets/mundo1/hotspot_icon_v4.png"
                    alt=""
                    style={{
                      width: '100%', height: '100%', display: done ? 'none' : 'block',
                      animation: 'hotspotPulse 1.6s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 8px rgba(180,150,255,.7))',
                    }}
                  />
                </div>
              );
            })}

            {/* Luciernaga de ayuda: presente en todas las zonas, toca para saber que falta */}
            <button
              onClick={() => pedirAyuda(zi)}
              aria-label="Pedir ayuda a la luciérnaga guía"
              style={{
                position: 'absolute', right: '5%', top: '10%', width: '9%', aspectRatio: '1/1',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', zIndex: 25,
              }}
            >
              <img
                src="/assets/mundo1/guia_luciernaga_v4.png"
                alt="Luciérnaga guía"
                style={{ width: '100%', animation: 'guideFloat 2.2s ease-in-out infinite', filter: 'drop-shadow(0 0 10px rgba(255,220,120,.6))' }}
              />
            </button>

            {/* Toqwow como companero flotante, presente en todas las zonas — arrastrable, con reaccion al agua */}
            <div style={{ position: 'absolute', left: '8%', bottom: '6%', width: '11%', zIndex: 19, transform: `translate(${dragPos[`toqwow-${zi}`]?.x || 0}px, ${dragPos[`toqwow-${zi}`]?.y || 0}px)` }}>
              <div style={{
                animation: dragState.current?.key === `toqwow-${zi}`
                  ? 'none'
                  : floating[`toqwow-${zi}`]
                    ? 'floatWater 2.6s ease-in-out infinite'
                    : 'charBounce 2.2s ease-in-out infinite .15s',
              }}>
                <img
                  src="/assets/mundo1/char_toqwow_v3.png" alt="Toqwow"
                  onPointerDown={startDrag(`toqwow-${zi}`)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                  style={{
                    width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                    transform: squashTransform(`toqwow-${zi}`), transition: 'transform .12s ease-out',
                    filter: floating[`toqwow-${zi}`]
                      ? 'drop-shadow(0 10px 12px rgba(0,0,0,.45)) hue-rotate(-12deg) saturate(1.3)'
                      : 'drop-shadow(0 10px 12px rgba(0,0,0,.45))',
                  }} />
              </div>
            </div>

            {/* Amigos convocados desde la bandeja, presentes en la zona donde fueron llamados */}
            {AMIGOS_EXTRA.filter(a => amigosEnJuego[a.id] === zi).map((amigo, ai) => {
              const key = `${amigo.id}-${zi}`;
              return (
                <div key={amigo.id} style={{
                  position: 'absolute', left: `${20 + ai * 10}%`, bottom: '8%', width: '10%', zIndex: 16,
                  transform: `translate(${dragPos[key]?.x || 0}px, ${dragPos[key]?.y || 0}px)`,
                }}>
                  <div style={{ animation: dragState.current?.key === key ? 'none' : 'charBounce 2.3s ease-in-out infinite' }}>
                    <img
                      src={`/assets/mundo1/${amigo.src}`} alt={amigo.nombre}
                      onPointerDown={startDrag(key)} onPointerMove={onDragMove} onPointerUp={endDrag(zi)} onPointerCancel={endDrag(zi)}
                      style={{
                        width: '100%', display: 'block', cursor: 'grab', touchAction: 'none',
                        transform: squashTransform(key), transition: 'transform .12s ease-out',
                        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.4))',
                      }} />
                  </div>
                </div>
              );
            })}

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

            {/* Destello de celebracion al completar esta zona */}
            {zonaCelebrando === zi && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none',
                background: 'radial-gradient(circle, rgba(255,220,150,.55), rgba(255,220,150,0) 70%)',
                animation: 'zonaCelebra 1.8s ease-out forwards',
              }} />
            )}

            {/* Factor WOW: evento visual mas grande, unico por zona */}
            {wowZona === zi && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 45, pointerEvents: 'none', overflow: 'hidden' }}>
                {zi === 4 ? (
                  <div style={{ position: 'absolute', inset: 0, animation: 'wowColorCycle 2.4s ease-in-out', mixBlendMode: 'screen' }} />
                ) : zi === 7 ? (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(180,140,255,.25)', animation: 'wowPulseRings 2.2s ease-out' }} />
                ) : zi === 9 ? (
                  <>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: `${45 + (i % 3) * 5}%`, bottom: 0, fontSize: 22,
                        animation: `wowRise 1.8s ease-out ${i * 0.12}s forwards`, opacity: 0,
                      }}>✨</div>
                    ))}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255,255,255,.5), rgba(255,255,255,0) 60%)', animation: 'wowFlashWhite 2.4s ease-out' }} />
                  </>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, ${ZONA_WOW_COLOR[zi] || 'rgba(255,220,150,.5)'}, transparent 65%)`, animation: 'wowExpand 2.2s ease-out' }} />
                )}
              </div>
            )}

            {/* Bursts de recompensa */}
            {bursts.filter(b => b.zonaIdx === zi).map(b => (
              <div key={b.id} style={{
                position: 'fixed', left: b.x, top: b.y, transform: 'translate(-50%,-50%)',
                fontSize: b.tipo === 'splash' ? 44 : 34, pointerEvents: 'none', zIndex: 70,
                animation: b.tipo === 'splash' ? 'splashRing .9s ease-out forwards' : 'burstUp .9s ease-out forwards',
              }}>{b.emoji || (b.tipo === 'splash' ? '💦' : '✨')}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Rastro de florcitas de musgo (Zona 1, al pasar bajo el arco) */}
      {trail.map(t => (
        <div key={t.id} style={{
          position: 'fixed', left: t.x, top: t.y, transform: 'translate(-50%,-50%)',
          fontSize: 18, pointerEvents: 'none', zIndex: 65, animation: 'trailFade .75s ease-out forwards',
        }}>🌼</div>
      ))}

      {/* Cartel de instruccion tipo Toca Boca, aparece al entrar a cada zona o al pedir ayuda */}
      {(cartelZona !== null || cartelAyuda !== null) && (
        <div style={{
          position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
          maxWidth: '86%', background: 'rgba(255,255,255,.97)', borderRadius: 20,
          padding: '12px 18px', boxShadow: '0 10px 30px rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', gap: 12, animation: 'cartelIn .4s ease-out',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(160deg,#ffe9b0,#ffd27a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>{cartelAyuda !== null ? '🐝' : (ICONO_ZONA[cartelZona!] || '✨')}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#3a2a1a', lineHeight: 1.35 }}>
            {cartelAyuda !== null ? cartelAyuda : (FRASES[`zona${cartelZona}`]?.[idioma] || FRASES[`zona${cartelZona}`]?.es)}
          </div>
        </div>
      )}

      {/* Bandeja de amigos convocables */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0, zIndex: 60,
        display: 'flex', gap: 10, overflowX: 'auto', padding: '6px 14px',
      }}>
        {AMIGOS_EXTRA.map(amigo => {
          const enJuego = amigosEnJuego[amigo.id] !== undefined;
          const activo = personajeActivo === amigo.id;
          return (
            <button
              key={amigo.id}
              onClick={() => convocarAmigo(amigo.id)}
              aria-label={`Convocar a ${amigo.nombre}`}
              style={{
                flexShrink: 0, width: 46, height: 46, borderRadius: '50%',
                border: activo ? '3px solid rgba(255,220,150,1)' : enJuego ? '2px solid rgba(255,220,150,.9)' : '2px solid rgba(255,255,255,.35)',
                boxShadow: activo ? '0 0 12px rgba(255,220,150,.85)' : 'none',
                background: 'rgba(20,10,40,.55)', backdropFilter: 'blur(6px)',
                padding: 4, cursor: 'pointer', opacity: enJuego || activo ? 1 : 0.75,
              }}
            >
              <img src={`/assets/mundo1/${amigo.src}`} alt={amigo.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          );
        })}
      </div>

      {/* Indicador de scroll sutil */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 11, color: 'rgba(255,255,255,.45)', background: 'rgba(20,10,40,.4)', padding: '4px 12px', borderRadius: 20 }}>
        ⟵ Deslizá para explorar el bosque ⟶
      </div>

      {/* OVERLAY: Presentacion inicial — Toqwow nombra a los 10 personajes, una sola vez */}
      {mostrarPresentacion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(10,5,20,.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5vh 5vw' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ffe8d6', textAlign: 'center', marginBottom: 22, maxWidth: 420, lineHeight: 1.4 }}>
            {FRASES.presentacionIntro.es}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, maxWidth: 460 }}>
            {TODOS_PERSONAJES.map((p, i) => {
              const enFoco = presentacionIdx - 1 === i;
              const yaMostrado = presentacionIdx - 1 > i || presentacionIdx > TODOS_PERSONAJES.length;
              return (
                <button
                  key={p.id}
                  onClick={() => cerrarPresentacion(p.id)}
                  aria-label={`Elegir a ${p.nombre}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    opacity: presentacionIdx === 0 ? 0.5 : (enFoco || yaMostrado ? 1 : 0.4),
                    transform: enFoco ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform .3s ease, opacity .3s ease',
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', padding: 4,
                    border: enFoco ? '3px solid rgba(255,220,150,1)' : '2px solid rgba(255,255,255,.3)',
                    boxShadow: enFoco ? '0 0 16px rgba(255,220,150,.9)' : 'none',
                  }}>
                    <img src={`/assets/mundo1/${p.src}`} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>{p.nombre}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
            {presentacionIdx > TODOS_PERSONAJES.length ? (
              <button
                onClick={() => cerrarPresentacion(personajeActivo)}
                style={{ background: 'rgba(255,220,150,.95)', border: 'none', borderRadius: 50, padding: '10px 26px', fontSize: 14, fontWeight: 700, color: '#3a2a1a', cursor: 'pointer' }}
              >¡Empezar a jugar! 🌟</button>
            ) : (
              <button
                onClick={() => cerrarPresentacion()}
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 50, padding: '9px 22px', fontSize: 13, color: 'white', cursor: 'pointer' }}
              >Saltar</button>
            )}
          </div>
        </div>
      )}

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
              Arrastrá a tus amigos hasta cada luz escondida para completar el mapa
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
                      <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 22, filter: 'drop-shadow(0 1px 3px black)' }}>⭐</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 12, fontWeight: 700, textAlign: 'center', color: 'white', background: 'rgba(0,0,0,.55)', padding: '3px 0' }}>{zi + 1}</div>
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
        @keyframes splashRing { 0%{ opacity: 1; transform: translate(-50%,-50%) scale(.3); } 60%{ opacity: 1; transform: translate(-50%,-50%) scale(1.4); } 100%{ opacity: 0; transform: translate(-50%,-50%) scale(1.9); } }
        @keyframes zonaCelebra { 0%{ opacity: 0; } 25%{ opacity: 1; } 100%{ opacity: 0; } }
        @keyframes trailFade { 0%{ opacity: .9; transform: translate(-50%,-50%) scale(.6); } 40%{ opacity: .8; transform: translate(-50%,-50%) scale(1); } 100%{ opacity: 0; transform: translate(-50%,-50%) scale(.8) translateY(6px); } }
        @keyframes rockRumble { 0%,100%{ transform: translateX(0); } 20%{ transform: translateX(-4px) translateY(2px); } 40%{ transform: translateX(4px) translateY(-2px); } 60%{ transform: translateX(-3px); } 80%{ transform: translateX(3px); } }
        @keyframes cartelIn { 0%{ opacity: 0; transform: translateX(-50%) translateY(-14px) scale(.9); } 100%{ opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes wowExpand { 0%{ opacity: 0; transform: scale(.3); } 40%{ opacity: 1; transform: scale(1); } 100%{ opacity: 0; transform: scale(1.6); } }
        @keyframes wowColorCycle { 0%{ background: rgba(0,220,255,.35); } 33%{ background: rgba(180,120,255,.35); } 66%{ background: rgba(255,210,90,.35); } 100%{ background: rgba(0,220,255,0); } }
        @keyframes wowPulseRings { 0%{ opacity: 0; box-shadow: inset 0 0 0px rgba(180,140,255,.6); } 30%{ opacity: 1; } 100%{ opacity: 0; box-shadow: inset 0 0 140px rgba(180,140,255,0); } }
        @keyframes wowRise { 0%{ opacity: 0; transform: translateY(0) scale(.6); } 20%{ opacity: 1; } 100%{ opacity: 0; transform: translateY(-320px) scale(1.3); } }
        @keyframes wowFlashWhite { 0%{ opacity: 0; } 50%{ opacity: 1; } 100%{ opacity: 0; } }
        @keyframes charBounce { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-6%); } }
        @keyframes floatWater { 0%,100%{ transform: translateY(0) rotate(-3deg); } 50%{ transform: translateY(-4%) rotate(3deg); } }
        @keyframes mapPulse { 0%,100%{ transform: translate(-50%,-50%) scale(1); } 50%{ transform: translate(-50%,-50%) scale(1.1); } }
        @keyframes portalReady { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.08); } }
        @keyframes nudgeShake { 0%,100%{ transform: translate(-50%,-50%) rotate(0); } 25%{ transform: translate(-50%,-50%) rotate(-6deg); } 75%{ transform: translate(-50%,-50%) rotate(6deg); } }
        html, body { height: 100dvh; overscroll-behavior: none; }
        button, img { -webkit-tap-highlight-color: transparent; outline: none; -webkit-touch-callout: none; user-select: none; }
        button:focus, img:focus { outline: none; }
      `}</style>
    </div>
  );
}
