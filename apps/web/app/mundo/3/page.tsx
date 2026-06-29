'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══════════════════════════════════════════════
   🎵 AUDIO ENGINE
══════════════════════════════════════════════ */
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 80, d = 0.25, v = 0.15) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

/* ══════════════════════════════════════════════
   🏠 AMBIENTES - 28 cuartos estilo Supersónicos
══════════════════════════════════════════════ */
type Ambiente = {
  id: number; nombre: string; emoji: string;
  bg: string; accent: string; floor: string;
  objetos: Objeto[];
};

type Objeto = {
  id: string; emoji: string; label: string;
  x: number; y: number; w: number; h: number;
  zIndex?: number; layer?: 'back' | 'front';
  accion?: string; efecto?: string;
  sonido?: number[];
};

type Personaje = {
  id: string; nombre: string; emoji: string;
  color: string;
  hambre: number; sueno: number; diversion: number;
  bano: number; amor: number;
  humor: 'feliz' | 'normal' | 'triste' | 'emocionado';
  x: number; y: number;
  cabello: number; top: number; accesorio: number;
};

/* Personajes base */
const PERSONAJES_BASE: Personaje[] = [
  { id: 'luna', nombre: 'Luna', emoji: '👧', color: '#B8A9FF', hambre: 80, sueno: 90, diversion: 70, bano: 85, amor: 90, humor: 'feliz', x: 15, y: 55, cabello: 0, top: 0, accesorio: 0 },
  { id: 'orion', nombre: 'Orión', emoji: '👦', color: '#00D4C8', hambre: 70, sueno: 60, diversion: 90, bano: 75, amor: 80, humor: 'normal', x: 35, y: 55, cabello: 1, top: 1, accesorio: 1 },
  { id: 'cosmo', nombre: 'Cosmo', emoji: '🧑', color: '#FFD700', hambre: 95, sueno: 50, diversion: 80, bano: 90, amor: 70, humor: 'emocionado', x: 55, y: 55, cabello: 2, top: 2, accesorio: 2 },
  { id: 'nebula', nombre: 'Nebula', emoji: '👩', color: '#FF6B9D', hambre: 60, sueno: 85, diversion: 75, bano: 80, amor: 95, humor: 'feliz', x: 75, y: 55, cabello: 3, top: 3, accesorio: 3 },
];

const CABELLOS = ['👱','🧑','👩‍🦱','👩‍🦰','👨‍🦳','👩‍🦳','🧔','👲'];
const TOPS = ['👕','🎽','🧥','👗','🥼','🧣','👘','🥻'];
const ACCESORIOS = ['🎩','👒','⭐','🌟','💎','🌸','🎀','🦋'];

const AMBIENTES: Ambiente[] = [
  {
    id: 0, nombre: 'Sala Orbital', emoji: '🛋️',
    bg: 'linear-gradient(135deg,#1a0533 0%,#2d1060 50%,#1a0533 100%)',
    accent: '#B8A9FF', floor: '#2d1060',
    objetos: [
      { id:'sofa',emoji:'🛋️',label:'Sofá holográfico',x:10,y:60,w:20,h:12,layer:'back',accion:'sentar',efecto:'💜',sonido:[523,587,659] },
      { id:'tv',emoji:'📺',label:'Pantalla orbital',x:40,y:45,w:18,h:20,layer:'back',accion:'ver',efecto:'🎬',sonido:[800,600,400] },
      { id:'mesa',emoji:'🪑',label:'Mesa flotante',x:35,y:70,w:12,h:8,layer:'back' },
      { id:'lampara',emoji:'💡',label:'Lámpara estelar',x:75,y:42,w:8,h:15,layer:'back' },
      { id:'alfombra',emoji:'🌀',label:'Alfombra galáctica',x:20,y:75,w:40,h:8,layer:'back' },
      { id:'flor1',emoji:'🌸',label:'Rosa espacial',x:80,y:60,w:6,h:10,layer:'front' },
      { id:'libro',emoji:'📖',label:'Libro de estrellas',x:45,y:75,w:8,h:6,layer:'front',accion:'leer',efecto:'📚',sonido:[440,523,587] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa cósmica',x:60,y:48,w:6,h:6,layer:'front' },
      { id:'gato',emoji:'🐱',label:'Gatito estelar',x:25,y:68,w:7,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,587,659,784] },
      { id:'cojin',emoji:'💜',label:'Cojín suave',x:15,y:65,w:6,h:5,layer:'front',accion:'abrazar',efecto:'💜',sonido:[392,440,523] },
      { id:'robot',emoji:'🤖',label:'Robot juguete',x:70,y:68,w:7,h:9,layer:'front',accion:'jugar',efecto:'⚡',sonido:[600,700,800,600] },
      { id:'estrella1',emoji:'⭐',label:'Estrella deco',x:5,y:45,w:5,h:5,layer:'front' },
      { id:'estrella2',emoji:'🌟',label:'Estrella brillante',x:90,y:50,w:5,h:5,layer:'front' },
      { id:'cohete',emoji:'🚀',label:'Cohete juguete',x:82,y:72,w:7,h:8,layer:'front',accion:'jugar',efecto:'🚀',sonido:[400,500,700,900] },
      { id:'burbuja',emoji:'🫧',label:'Burbujas mágicas',x:50,y:50,w:5,h:5,layer:'front' },
      { id:'fruta',emoji:'🍎',label:'Manzana espacial',x:38,y:74,w:5,h:6,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784] },
    ]
  },
  {
    id: 1, nombre: 'Cocina Atómica', emoji: '🍳',
    bg: 'linear-gradient(135deg,#0d2b1a 0%,#1a5c35 50%,#0d2b1a 100%)',
    accent: '#7CFC00', floor: '#1a4a2a',
    objetos: [
      { id:'estufa',emoji:'🍳',label:'Estufa nuclear',x:10,y:50,w:20,h:25,layer:'back',accion:'cocinar',efecto:'🔥',sonido:[300,400,500] },
      { id:'nevera',emoji:'🧊',label:'Nevera cuántica',x:75,y:40,w:14,h:35,layer:'back',accion:'abrir',efecto:'❄️',sonido:[200,300,400] },
      { id:'mesa',emoji:'🪵',label:'Mesa de cocina',x:30,y:65,w:35,h:10,layer:'back' },
      { id:'pizza',emoji:'🍕',label:'Pizza galáctica',x:33,y:62,w:10,h:8,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784,880] },
      { id:'cake',emoji:'🎂',label:'Pastel estelar',x:48,y:62,w:9,h:9,layer:'front',accion:'comer',efecto:'🎉',sonido:[523,659,784,1046] },
      { id:'fresas',emoji:'🍓',label:'Fresas mágicas',x:56,y:63,w:7,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[600,700,800] },
      { id:'plantas',emoji:'🌿',label:'Hierbas aromáticas',x:72,y:42,w:6,h:8,layer:'front' },
      { id:'pajarito',emoji:'🐦',label:'Pajarito cocinero',x:65,y:55,w:6,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[800,1000,800,1000] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa dorada',x:40,y:45,w:5,h:5,layer:'front' },
      { id:'flor2',emoji:'🌻',label:'Girasol solar',x:85,y:42,w:7,h:10,layer:'front' },
      { id:'jugo',emoji:'🍹',label:'Jugo estelar',x:20,y:62,w:6,h:8,layer:'front',accion:'beber',efecto:'😊',sonido:[440,523,659] },
      { id:'muffin',emoji:'🧁',label:'Cupcake nebula',x:43,y:62,w:7,h:8,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784] },
      { id:'arcoiris',emoji:'🌈',label:'Ventana arcoíris',x:0,y:35,w:10,h:15,layer:'back' },
      { id:'horno',emoji:'🔥',label:'Horno orbital',x:60,y:50,w:15,h:20,layer:'back',accion:'cocinar',efecto:'🔥',sonido:[200,300,200] },
      { id:'paloma',emoji:'🕊️',label:'Paloma mensajera',x:55,y:45,w:5,h:5,layer:'front' },
      { id:'zanahoria',emoji:'🥕',label:'Zanahorias estelares',x:30,y:63,w:5,h:6,layer:'front',accion:'comer',efecto:'😋',sonido:[400,523,400] },
    ]
  },
  {
    id: 2, nombre: 'Jardín Estelar', emoji: '🌷',
    bg: 'linear-gradient(135deg,#001233 0%,#0a2a6e 50%,#001233 100%)',
    accent: '#00D4C8', floor: '#0a1f4a',
    objetos: [
      { id:'arbol1',emoji:'🌳',label:'Árbol cósmico',x:5,y:30,w:15,h:40,layer:'back' },
      { id:'arbol2',emoji:'🌲',label:'Pino estelar',x:80,y:30,w:13,h:40,layer:'back' },
      { id:'flores1',emoji:'🌸',label:'Flores rosadas',x:20,y:65,w:10,h:12,layer:'front' },
      { id:'flores2',emoji:'🌺',label:'Flores tropicales',x:35,y:65,w:10,h:12,layer:'front' },
      { id:'flores3',emoji:'🌼',label:'Flores amarillas',x:50,y:65,w:10,h:12,layer:'front' },
      { id:'unicornio',emoji:'🦄',label:'Unicornio jardín',x:60,y:45,w:15,h:20,layer:'front',accion:'acariciar',efecto:'✨',sonido:[523,659,784,1046,784,659,523] },
      { id:'mariposa1',emoji:'🦋',label:'Mariposa azul',x:30,y:45,w:6,h:6,layer:'front' },
      { id:'mariposa2',emoji:'🦋',label:'Mariposa naranja',x:45,y:40,w:6,h:6,layer:'front' },
      { id:'abeja',emoji:'🐝',label:'Abeja amigable',x:25,y:48,w:5,h:5,layer:'front' },
      { id:'pajarito',emoji:'🐦',label:'Pajarito cantor',x:70,y:35,w:6,h:6,layer:'front',accion:'acariciar',efecto:'🎵',sonido:[880,1046,1175,880] },
      { id:'conejo',emoji:'🐰',label:'Conejito jardín',x:38,y:68,w:7,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,784] },
      { id:'luna',emoji:'🌙',label:'Luna brillante',x:85,y:5,w:8,h:8,layer:'back' },
      { id:'estrellas',emoji:'✨',label:'Estrellas fugaces',x:50,y:8,w:10,h:8,layer:'back' },
      { id:'fuente',emoji:'⛲',label:'Fuente espacial',x:42,y:55,w:14,h:18,layer:'back',accion:'tocar',efecto:'💧',sonido:[400,500,600,500,400] },
      { id:'rana',emoji:'🐸',label:'Ranita saltarina',x:55,y:72,w:5,h:5,layer:'front',accion:'tocar',efecto:'😄',sonido:[200,200,400] },
      { id:'mariposa3',emoji:'🦋',label:'Mariposa lila',x:75,y:55,w:6,h:6,layer:'front' },
      { id:'nube',emoji:'☁️',label:'Nube suave',x:15,y:15,w:12,h:8,layer:'back' },
    ]
  },
  {
    id: 3, nombre: 'Laboratorio Galáctico', emoji: '🔭',
    bg: 'linear-gradient(135deg,#0f0f2d 0%,#1a1a4a 50%,#0f0f2d 100%)',
    accent: '#FFD700', floor: '#1a1a3a',
    objetos: [
      { id:'telescopio',emoji:'🔭',label:'Telescopio orbital',x:70,y:35,w:16,h:30,layer:'back',accion:'mirar',efecto:'🌟',sonido:[440,550,660,550,440] },
      { id:'microscopio',emoji:'🔬',label:'Microscopio cuántico',x:15,y:45,w:14,h:25,layer:'back',accion:'observar',efecto:'🔬',sonido:[600,700,800] },
      { id:'planeta1',emoji:'🪐',label:'Saturno miniatura',x:45,y:30,w:14,h:12,layer:'back' },
      { id:'planeta2',emoji:'🌍',label:'La Tierra',x:30,y:40,w:10,h:10,layer:'back' },
      { id:'robot',emoji:'🤖',label:'Robot asistente',x:55,y:55,w:10,h:15,layer:'front',accion:'activar',efecto:'⚡',sonido:[300,400,500,400,300] },
      { id:'libro',emoji:'📚',label:'Libros científicos',x:5,y:55,w:12,h:12,layer:'front',accion:'leer',efecto:'💡',sonido:[440,523,587] },
      { id:'cristal',emoji:'💎',label:'Cristal energético',x:40,y:60,w:8,h:10,layer:'front',accion:'tocar',efecto:'✨',sonido:[880,1046,1175] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa científica',x:78,y:50,w:5,h:5,layer:'front' },
      { id:'cohete',emoji:'🚀',label:'Modelo de cohete',x:85,y:45,w:8,h:15,layer:'front',accion:'lanzar',efecto:'🚀',sonido:[200,400,600,800,1000] },
      { id:'sol',emoji:'☀️',label:'Sol miniatura',x:12,y:25,w:10,h:10,layer:'back' },
      { id:'luna',emoji:'🌙',label:'Luna llena',x:35,y:20,w:9,h:9,layer:'back' },
      { id:'pajarito',emoji:'🦜',label:'Loro científico',x:62,y:52,w:6,h:7,layer:'front',accion:'acariciar',efecto:'🎵',sonido:[700,800,900,800,700] },
      { id:'globo',emoji:'🌐',label:'Globo holográfico',x:28,y:55,w:10,h:10,layer:'front',accion:'girar',efecto:'🌍',sonido:[400,450,500] },
      { id:'flor',emoji:'🌺',label:'Flor luminosa',x:90,y:62,w:6,h:10,layer:'front' },
      { id:'cometa',emoji:'☄️',label:'Cometa simulado',x:60,y:20,w:8,h:8,layer:'back' },
      { id:'pez',emoji:'🐠',label:'Pez espacial',x:48,y:55,w:6,h:6,layer:'front' },
    ]
  },
  {
    id: 4, nombre: 'Habitación Luna', emoji: '🌙',
    bg: 'linear-gradient(135deg,#1a0a2e 0%,#2e1a5c 50%,#1a0a2e 100%)',
    accent: '#B8A9FF', floor: '#2a1550',
    objetos: [
      { id:'cama',emoji:'🛏️',label:'Cama de nubes',x:10,y:50,w:30,h:18,layer:'back',accion:'dormir',efecto:'💤',sonido:[261,329,392,261] },
      { id:'armario',emoji:'🚪',label:'Armario estelar',x:75,y:35,w:16,h:40,layer:'back',accion:'abrir',efecto:'👗',sonido:[300,400,300] },
      { id:'espejo',emoji:'🪞',label:'Espejo mágico',x:60,y:38,w:12,h:25,layer:'back',accion:'mirar',efecto:'✨',sonido:[440,550,660] },
      { id:'osito',emoji:'🧸',label:'Osito cósmico',x:15,y:58,w:8,h:9,layer:'front',accion:'abrazar',efecto:'💜',sonido:[392,440,523] },
      { id:'luna_deco',emoji:'🌙',label:'Luna decorativa',x:45,y:30,w:10,h:10,layer:'back' },
      { id:'estrellas',emoji:'✨',label:'Móvil de estrellas',x:30,y:25,w:20,h:10,layer:'back' },
      { id:'mariposa',emoji:'🦋',label:'Mariposa nocturna',x:55,y:45,w:6,h:6,layer:'front' },
      { id:'gato',emoji:'🐱',label:'Gatito dormilón',x:25,y:58,w:7,h:7,layer:'front',accion:'acariciar',efecto:'😴',sonido:[300,350,300] },
      { id:'flores',emoji:'🌸',label:'Flores de noche',x:85,y:58,w:8,h:10,layer:'front' },
      { id:'libro',emoji:'📖',label:'Libro de cuentos',x:42,y:62,w:8,h:6,layer:'front',accion:'leer',efecto:'💤',sonido:[261,329,392] },
      { id:'lampara',emoji:'🪔',label:'Lámpara mágica',x:65,y:60,w:7,h:12,layer:'front',accion:'encender',efecto:'💡',sonido:[523,659,784] },
      { id:'nube',emoji:'☁️',label:'Nube suave',x:5,y:35,w:15,h:8,layer:'back' },
      { id:'conejo',emoji:'🐰',label:'Conejito de luna',x:35,y:60,w:7,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523] },
      { id:'corazon',emoji:'💜',label:'Corazón mágico',x:50,y:55,w:6,h:6,layer:'front',accion:'tocar',efecto:'💜',sonido:[523,659,784,1046] },
      { id:'pijama',emoji:'🌙',label:'Pijama estrellado',x:78,y:58,w:8,h:9,layer:'front',accion:'ponerse',efecto:'😴',sonido:[300,350,400,350,300] },
      { id:'muñeca',emoji:'🪆',label:'Muñeca galáctica',x:47,y:60,w:6,h:9,layer:'front',accion:'jugar',efecto:'💕',sonido:[523,587,659] },
    ]
  },
  {
    id: 5, nombre: 'Baño Galáctico', emoji: '🛁',
    bg: 'linear-gradient(135deg,#003366 0%,#0055aa 50%,#003366 100%)',
    accent: '#87CEEB', floor: '#004488',
    objetos: [
      { id:'banera',emoji:'🛁',label:'Bañera estelar',x:15,y:45,w:35,h:20,layer:'back',accion:'bañar',efecto:'🫧',sonido:[400,500,600,500,400] },
      { id:'ducha',emoji:'🚿',label:'Ducha arcoíris',x:70,y:30,w:12,h:35,layer:'back',accion:'duchar',efecto:'💧',sonido:[300,400,500,400,300] },
      { id:'lavabo',emoji:'🪥',label:'Lavabo orbital',x:58,y:45,w:14,h:18,layer:'back',accion:'lavar',efecto:'🫧',sonido:[400,500,400] },
      { id:'pato',emoji:'🦆',label:'Patito de baño',x:20,y:50,w:7,h:7,layer:'front',accion:'jugar',efecto:'💛',sonido:[400,500,400,500] },
      { id:'peces',emoji:'🐠',label:'Peces burbujas',x:30,y:52,w:8,h:6,layer:'front' },
      { id:'flores_agua',emoji:'🌺',label:'Flores acuáticas',x:85,y:55,w:8,h:10,layer:'front' },
      { id:'toalla',emoji:'🏳️',label:'Toalla estelar',x:85,y:38,w:8,h:15,layer:'back',accion:'secar',efecto:'✨',sonido:[300,400,500] },
      { id:'burbuja1',emoji:'🫧',label:'Burbuja gigante',x:45,y:42,w:6,h:6,layer:'front' },
      { id:'pez',emoji:'🐟',label:'Pez nadador',x:25,y:52,w:6,h:5,layer:'front',accion:'tocar',efecto:'💧',sonido:[400,500,600] },
      { id:'arcoiris',emoji:'🌈',label:'Ventana arcoíris',x:0,y:30,w:10,h:15,layer:'back' },
      { id:'mariposa',emoji:'🦋',label:'Mariposa de agua',x:50,y:40,w:5,h:5,layer:'front' },
      { id:'jabón',emoji:'🧼',label:'Jabón mágico',x:53,y:58,w:6,h:5,layer:'front',accion:'usar',efecto:'🫧',sonido:[500,600,700] },
      { id:'caracol',emoji:'🐌',label:'Caracol amigable',x:40,y:62,w:5,h:4,layer:'front' },
      { id:'cangrejo',emoji:'🦀',label:'Cangrejo feliz',x:10,y:62,w:6,h:5,layer:'front',accion:'tocar',efecto:'😄',sonido:[300,400,300,400] },
      { id:'lirio',emoji:'⚜️',label:'Lirio acuático',x:55,y:44,w:5,h:7,layer:'front' },
      { id:'espuma',emoji:'💦',label:'Espuma mágica',x:35,y:48,w:8,h:5,layer:'front' },
    ]
  },
  {
    id: 6, nombre: 'Sala de Juegos', emoji: '🎮',
    bg: 'linear-gradient(135deg,#1a0020 0%,#3d004a 50%,#1a0020 100%)',
    accent: '#FF6B9D', floor: '#2d0038',
    objetos: [
      { id:'tobogan',emoji:'🎢',label:'Tobogán espacial',x:5,y:30,w:25,h:45,layer:'back',accion:'usar',efecto:'🎉',sonido:[400,500,600,700,800,700,600,500,400] },
      { id:'columpio',emoji:'🎠',label:'Columpio orbital',x:65,y:25,w:20,h:40,layer:'back',accion:'columpiarse',efecto:'😄',sonido:[300,400,500,400,300] },
      { id:'pelota',emoji:'⚽',label:'Pelota galáctica',x:38,y:68,w:8,h:8,layer:'front',accion:'patear',efecto:'⚽',sonido:[200,400,200] },
      { id:'dado',emoji:'🎲',label:'Dado de colores',x:52,y:68,w:7,h:7,layer:'front',accion:'lanzar',efecto:'🎲',sonido:[400,500,600] },
      { id:'oso_peluche',emoji:'🧸',label:'Oso peluche',x:35,y:62,w:8,h:10,layer:'front',accion:'abrazar',efecto:'💕',sonido:[392,440,523] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa juguetona',x:50,y:45,w:6,h:6,layer:'front' },
      { id:'conejo',emoji:'🐰',label:'Conejito saltarín',x:48,y:62,w:7,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523] },
      { id:'estrellas',emoji:'🌟',label:'Estrellas giratorias',x:40,y:30,w:12,h:10,layer:'back' },
      { id:'globos',emoji:'🎈',label:'Globos de colores',x:25,y:25,w:10,h:15,layer:'back' },
      { id:'musica',emoji:'🎵',label:'Jukebox estelar',x:85,y:55,w:10,h:15,layer:'back',accion:'escuchar',efecto:'🎵',sonido:[261,329,392,523,659,784] },
      { id:'cohete_juguete',emoji:'🚀',label:'Cohete de juguete',x:60,y:65,w:8,h:9,layer:'front',accion:'jugar',efecto:'🚀',sonido:[400,600,800,1000] },
      { id:'pajarito',emoji:'🦜',label:'Loro bailarín',x:72,y:60,w:6,h:7,layer:'front',accion:'tocar',efecto:'🎵',sonido:[700,800,900,800] },
      { id:'arco_iris',emoji:'🌈',label:'Arco iris deco',x:40,y:15,w:20,h:12,layer:'back' },
      { id:'flor',emoji:'🌸',label:'Flor alegre',x:88,y:65,w:6,h:8,layer:'front' },
      { id:'tren',emoji:'🚂',label:'Tren de juguete',x:18,y:65,w:12,h:6,layer:'front',accion:'activar',efecto:'🚂',sonido:[200,200,400,200,400] },
      { id:'pintura',emoji:'🎨',label:'Kit de pintura',x:45,y:68,w:8,h:7,layer:'front',accion:'usar',efecto:'🎨',sonido:[523,659,784,523] },
    ]
  },
  {
    id: 7, nombre: 'Terraza Galáctica', emoji: '🌌',
    bg: 'linear-gradient(180deg,#000011 0%,#000033 40%,#001155 100%)',
    accent: '#FFD700', floor: '#001133',
    objetos: [
      { id:'telescopio',emoji:'🔭',label:'Telescopio gigante',x:70,y:35,w:18,h:30,layer:'back',accion:'mirar',efecto:'⭐',sonido:[440,550,660,770,880] },
      { id:'hamaca',emoji:'🛋️',label:'Hamaca estelar',x:8,y:55,w:28,h:12,layer:'back',accion:'recostarse',efecto:'😌',sonido:[261,329,392] },
      { id:'planeta1',emoji:'🪐',label:'Saturno real',x:40,y:20,w:18,h:14,layer:'back' },
      { id:'luna',emoji:'🌕',label:'Luna llena',x:75,y:10,w:12,h:12,layer:'back' },
      { id:'cometa',emoji:'☄️',label:'Cometa veloz',x:20,y:15,w:10,h:8,layer:'back' },
      { id:'mariposa',emoji:'🦋',label:'Mariposa nocturna',x:55,y:50,w:6,h:6,layer:'front' },
      { id:'buho',emoji:'🦉',label:'Búho sabio',x:60,y:58,w:7,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[261,220,261,220] },
      { id:'flor_noche',emoji:'🌸',label:'Flor de noche',x:85,y:62,w:7,h:10,layer:'front' },
      { id:'luciernagas',emoji:'✨',label:'Luciérnagas',x:15,y:45,w:10,h:8,layer:'front' },
      { id:'estrella1',emoji:'⭐',label:'Estrella brillante',x:5,y:20,w:6,h:6,layer:'back' },
      { id:'estrella2',emoji:'🌟',label:'Estrella gigante',x:55,y:15,w:7,h:7,layer:'back' },
      { id:'cohete',emoji:'🚀',label:'Cohete pasando',x:30,y:10,w:8,h:6,layer:'back' },
      { id:'nube',emoji:'☁️',label:'Nube galáctica',x:45,y:38,w:12,h:7,layer:'back' },
      { id:'pato',emoji:'🐦',label:'Pájaro nocturno',x:25,y:35,w:5,h:5,layer:'front' },
      { id:'flores2',emoji:'🌺',label:'Flores estelares',x:2,y:62,w:8,h:10,layer:'front' },
      { id:'silla',emoji:'🪑',label:'Silla astronómica',x:38,y:60,w:8,h:10,layer:'back',accion:'sentar',efecto:'😌',sonido:[392,440,392] },
    ]
  },
  {
    id: 8, nombre: 'Garaje Robótico', emoji: '🤖',
    bg: 'linear-gradient(135deg,#1a1a00 0%,#333300 50%,#1a1a00 100%)',
    accent: '#FFD700', floor: '#2a2a10',
    objetos: [
      { id:'robot_grande',emoji:'🤖',label:'Robot gigante',x:10,y:30,w:20,h:40,layer:'back',accion:'activar',efecto:'⚡',sonido:[200,300,400,300,200] },
      { id:'auto',emoji:'🚗',label:'Auto volador',x:45,y:55,w:28,h:15,layer:'front',accion:'conducir',efecto:'🚗',sonido:[300,400,300] },
      { id:'herramientas',emoji:'🔧',label:'Caja de herramientas',x:75,y:58,w:14,h:10,layer:'front',accion:'usar',efecto:'🔧',sonido:[400,300,400] },
      { id:'engranaje',emoji:'⚙️',label:'Engranaje mágico',x:35,y:45,w:12,h:12,layer:'front',accion:'girar',efecto:'⚙️',sonido:[200,400,200,400] },
      { id:'rayo',emoji:'⚡',label:'Generador eléctrico',x:80,y:35,w:12,h:20,layer:'back',accion:'activar',efecto:'⚡',sonido:[200,800,200] },
      { id:'perro_robot',emoji:'🐕',label:'Perro robot',x:38,y:65,w:9,h:8,layer:'front',accion:'acariciar',efecto:'🤖',sonido:[400,500,400,300] },
      { id:'flor_mecanica',emoji:'🌻',label:'Flor mecánica',x:72,y:55,w:7,h:10,layer:'front' },
      { id:'mariposa',emoji:'🦋',label:'Mariposa robótica',x:55,y:42,w:5,h:5,layer:'front' },
      { id:'cohete_garaje',emoji:'🚀',label:'Cohete en garaje',x:60,y:28,w:12,h:22,layer:'back',accion:'revisar',efecto:'🚀',sonido:[400,600,800] },
      { id:'computadora',emoji:'💻',label:'Computadora galáctica',x:25,y:58,w:13,h:10,layer:'front',accion:'usar',efecto:'💻',sonido:[523,659,784] },
      { id:'lampara_robot',emoji:'💡',label:'Lámpara robótica',x:5,y:45,w:7,h:12,layer:'back' },
      { id:'engranaje2',emoji:'⚙️',label:'Engranaje grande',x:48,y:40,w:10,h:10,layer:'back' },
      { id:'pajarito',emoji:'🤖',label:'Pájaro robótico',x:67,y:50,w:5,h:6,layer:'front',accion:'activar',efecto:'⚡',sonido:[600,700,800] },
      { id:'planta_garaje',emoji:'🌿',label:'Planta biónica',x:88,y:60,w:7,h:10,layer:'front' },
      { id:'reloj',emoji:'⏰',label:'Reloj atómico',x:5,y:25,w:9,h:9,layer:'back' },
      { id:'estrella',emoji:'⭐',label:'Estrella robot',x:40,y:30,w:6,h:6,layer:'back' },
    ]
  },
  {
    id: 9, nombre: 'Piscina Cósmica', emoji: '🏊',
    bg: 'linear-gradient(180deg,#001a33 0%,#003366 50%,#0055aa 100%)',
    accent: '#00D4C8', floor: '#003399',
    objetos: [
      { id:'piscina',emoji:'🏊',label:'Piscina galáctica',x:15,y:45,w:55,h:25,layer:'back',accion:'nadar',efecto:'💦',sonido:[300,400,500,400,300] },
      { id:'tobogan_agua',emoji:'🌊',label:'Tobogán acuático',x:10,y:20,w:20,h:35,layer:'back',accion:'usar',efecto:'💦',sonido:[400,500,600,700,600,500] },
      { id:'delfin',emoji:'🐬',label:'Delfín amigo',x:30,y:50,w:12,h:8,layer:'front',accion:'nadar con',efecto:'🐬',sonido:[700,800,900,800,700] },
      { id:'peces',emoji:'🐠',label:'Peces de colores',x:45,y:55,w:10,h:6,layer:'front' },
      { id:'pulpo',emoji:'🐙',label:'Pulpo amigable',x:55,y:55,w:9,h:8,layer:'front',accion:'tocar',efecto:'💜',sonido:[300,400,500,400] },
      { id:'estrella_mar',emoji:'⭐',label:'Estrella de mar',x:62,y:58,w:7,h:7,layer:'front',accion:'recoger',efecto:'⭐',sonido:[523,659,784] },
      { id:'pelota_agua',emoji:'🏐',label:'Pelota de agua',x:25,y:50,w:7,h:7,layer:'front',accion:'lanzar',efecto:'💦',sonido:[400,500,400] },
      { id:'flamingo',emoji:'🦩',label:'Flamenco flotante',x:70,y:45,w:8,h:12,layer:'front',accion:'montar',efecto:'😄',sonido:[500,600,700] },
      { id:'palmera',emoji:'🌴',label:'Palmera tropical',x:82,y:25,w:14,h:35,layer:'back' },
      { id:'flor_agua',emoji:'🌺',label:'Flor acuática',x:85,y:60,w:7,h:9,layer:'front' },
      { id:'sol',emoji:'☀️',label:'Sol brillante',x:45,y:5,w:12,h:12,layer:'back' },
      { id:'nube',emoji:'☁️',label:'Nube suave',x:15,y:10,w:14,h:8,layer:'back' },
      { id:'pato',emoji:'🦆',label:'Pato nadador',x:22,y:52,w:7,h:6,layer:'front',accion:'seguir',efecto:'💛',sonido:[400,500,400,500] },
      { id:'tortuga',emoji:'🐢',label:'Tortuga marina',x:50,y:57,w:8,h:6,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa tropical',x:75,y:35,w:5,h:5,layer:'front' },
      { id:'arcoiris',emoji:'🌈',label:'Arco iris tropical',x:5,y:15,w:20,h:12,layer:'back' },
    ]
  },
  {
    id: 10, nombre: 'Biblioteca Estelar', emoji: '📚',
    bg: 'linear-gradient(135deg,#1a0a00 0%,#3d2000 50%,#1a0a00 100%)',
    accent: '#FFB347', floor: '#2d1800',
    objetos: [
      { id:'libreria1',emoji:'📚',label:'Estante A',x:0,y:20,w:14,h:55,layer:'back',accion:'explorar',efecto:'📖',sonido:[440,523,587] },
      { id:'libreria2',emoji:'📖',label:'Estante B',x:15,y:20,w:14,h:55,layer:'back' },
      { id:'libreria3',emoji:'📜',label:'Estante C',x:75,y:20,w:14,h:55,layer:'back' },
      { id:'mesa_lectura',emoji:'🪵',label:'Mesa de lectura',x:30,y:58,w:35,h:12,layer:'back' },
      { id:'sillon',emoji:'🛋️',label:'Sillón de leer',x:60,y:55,w:14,h:18,layer:'back',accion:'sentarse',efecto:'😌',sonido:[392,440,392] },
      { id:'lampara',emoji:'🪔',label:'Lámpara de leer',x:56,y:45,w:7,h:13,layer:'front' },
      { id:'buho',emoji:'🦉',label:'Búho bibliotecario',x:88,y:45,w:7,h:8,layer:'front',accion:'preguntar',efecto:'🦉',sonido:[261,220,261] },
      { id:'libro_magico',emoji:'✨',label:'Libro mágico',x:35,y:56,w:8,h:7,layer:'front',accion:'abrir',efecto:'✨',sonido:[523,659,784,1046,784,659,523] },
      { id:'pluma',emoji:'🪶',label:'Pluma escribiente',x:47,y:56,w:5,h:8,layer:'front',accion:'escribir',efecto:'✍️',sonido:[440,523,440] },
      { id:'globo_terraqueo',emoji:'🌍',label:'Globo terráqueo',x:42,y:56,w:8,h:9,layer:'front',accion:'girar',efecto:'🌍',sonido:[400,500,600] },
      { id:'gato_lector',emoji:'🐱',label:'Gatito lector',x:65,y:60,w:7,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa lectora',x:30,y:45,w:5,h:5,layer:'front' },
      { id:'flor_deco',emoji:'🌸',label:'Flores decorativas',x:25,y:55,w:7,h:9,layer:'front' },
      { id:'estrella',emoji:'⭐',label:'Estrella sabia',x:50,y:38,w:5,h:5,layer:'back' },
      { id:'reloj',emoji:'⏰',label:'Reloj antiguo',x:72,y:40,w:8,h:10,layer:'back' },
      { id:'loro',emoji:'🦜',label:'Loro lector',x:20,y:50,w:5,h:6,layer:'front',accion:'hablar',efecto:'🎵',sonido:[700,800,700,900] },
    ]
  },
  {
    id: 11, nombre: 'Comedor Estelar', emoji: '🍽️',
    bg: 'linear-gradient(135deg,#0a1a00 0%,#1a3500 50%,#0a1a00 100%)',
    accent: '#90EE90', floor: '#152800',
    objetos: [
      { id:'mesa_grande',emoji:'🪵',label:'Mesa galáctica',x:20,y:52,w:55,h:12,layer:'back' },
      { id:'sillas',emoji:'🪑',label:'Sillas orbitales',x:22,y:64,w:50,h:8,layer:'back' },
      { id:'arreglo',emoji:'💐',label:'Centro de flores',x:43,y:48,w:12,h:10,layer:'front' },
      { id:'pastel',emoji:'🎂',label:'Pastel de cumple',x:30,y:50,w:10,h:8,layer:'front',accion:'comer',efecto:'🎉',sonido:[523,659,784,1046,784,659,523] },
      { id:'pizza',emoji:'🍕',label:'Pizza espacial',x:55,y:50,w:10,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784] },
      { id:'ensalada',emoji:'🥗',label:'Ensalada cósmica',x:43,y:57,w:8,h:6,layer:'front',accion:'comer',efecto:'😋',sonido:[400,523,400] },
      { id:'jugo',emoji:'🍹',label:'Jugo de frutas',x:35,y:50,w:6,h:8,layer:'front',accion:'beber',efecto:'😊',sonido:[440,523,659] },
      { id:'vela',emoji:'🕯️',label:'Velas estelares',x:65,y:48,w:5,h:9,layer:'front' },
      { id:'mariposa',emoji:'🦋',label:'Mariposa del jardín',x:72,y:45,w:5,h:5,layer:'front' },
      { id:'ventana',emoji:'🌤️',label:'Ventana exterior',x:80,y:25,w:15,h:20,layer:'back' },
      { id:'planta',emoji:'🌿',label:'Planta comedor',x:5,y:45,w:10,h:22,layer:'back' },
      { id:'pajarito',emoji:'🐦',label:'Pajarito cantor',x:78,y:45,w:5,h:5,layer:'front',accion:'escuchar',efecto:'🎵',sonido:[880,1046,880] },
      { id:'frutas',emoji:'🍎',label:'Frutero galáctico',x:70,y:52,w:9,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784] },
      { id:'manteles',emoji:'🌈',label:'Manteles de color',x:20,y:50,w:55,h:3,layer:'back' },
      { id:'lampara',emoji:'💡',label:'Lámpara central',x:42,y:25,w:14,h:20,layer:'back' },
      { id:'gato',emoji:'🐱',label:'Gatito curioso',x:15,y:63,w:6,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523] },
    ]
  },
  {
    id: 12, nombre: 'Estudio Musical', emoji: '🎵',
    bg: 'linear-gradient(135deg,#1a001a 0%,#3a003a 50%,#1a001a 100%)',
    accent: '#FF69B4', floor: '#2a002a',
    objetos: [
      { id:'piano',emoji:'🎹',label:'Piano cósmico',x:5,y:45,w:28,h:20,layer:'back',accion:'tocar',efecto:'🎵',sonido:[261,329,392,523,392,329,261] },
      { id:'guitarra',emoji:'🎸',label:'Guitarra estelar',x:45,y:38,w:12,h:28,layer:'back',accion:'tocar',efecto:'🎵',sonido:[329,392,440,523] },
      { id:'bateria',emoji:'🥁',label:'Batería orbital',x:70,y:45,w:22,h:20,layer:'back',accion:'tocar',efecto:'🥁',sonido:[200,200,400,200,200,400] },
      { id:'microfono',emoji:'🎤',label:'Micrófono galáctico',x:35,y:42,w:8,h:15,layer:'front',accion:'cantar',efecto:'🎤',sonido:[440,523,659,784] },
      { id:'notas',emoji:'🎵',label:'Notas musicales',x:58,y:30,w:10,h:10,layer:'front' },
      { id:'violin',emoji:'🎻',label:'Violín estelar',x:37,y:57,w:8,h:13,layer:'front',accion:'tocar',efecto:'🎵',sonido:[392,440,523,587] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa musical',x:55,y:45,w:5,h:5,layer:'front' },
      { id:'loro_musico',emoji:'🦜',label:'Loro músico',x:62,y:50,w:6,h:7,layer:'front',accion:'escuchar',efecto:'🎵',sonido:[700,800,900,800] },
      { id:'disco',emoji:'💿',label:'Disco galáctico',x:22,y:65,w:8,h:8,layer:'front',accion:'poner',efecto:'🎵',sonido:[261,329,392,523,659,784] },
      { id:'amplificador',emoji:'📻',label:'Amplificador estelar',x:82,y:58,w:10,h:12,layer:'back',accion:'encender',efecto:'🎵',sonido:[300,400,500] },
      { id:'flores',emoji:'🌸',label:'Flores del estudio',x:90,y:62,w:8,h:10,layer:'front' },
      { id:'auriculares',emoji:'🎧',label:'Auriculares galácticos',x:8,y:62,w:9,h:7,layer:'front',accion:'ponerse',efecto:'🎵',sonido:[523,659,784,523] },
      { id:'luz',emoji:'💡',label:'Luces de escenario',x:35,y:20,w:28,h:10,layer:'back' },
      { id:'arpa',emoji:'🪕',label:'Arpa cósmica',x:60,y:38,w:10,h:20,layer:'back',accion:'tocar',efecto:'🎵',sonido:[523,587,659,784,880] },
      { id:'sol_musical',emoji:'☀️',label:'Sol de energía',x:20,y:25,w:10,h:10,layer:'back' },
      { id:'gatito_musico',emoji:'🐱',label:'Gatito músico',x:50,y:65,w:6,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,784] },
    ]
  },
  {
    id: 13, nombre: 'Invernadero Galáctico', emoji: '🌿',
    bg: 'linear-gradient(135deg,#002200 0%,#004400 50%,#002200 100%)',
    accent: '#90EE90', floor: '#003300',
    objetos: [
      { id:'arbol_grande',emoji:'🌳',label:'Árbol del conocimiento',x:40,y:15,w:20,h:55,layer:'back' },
      { id:'palmera',emoji:'🌴',label:'Palmera tropical',x:75,y:20,w:14,h:45,layer:'back' },
      { id:'cactus',emoji:'🌵',label:'Cactus mágico',x:8,y:40,w:10,h:28,layer:'back' },
      { id:'flores_rojas',emoji:'🌹',label:'Rosas estelares',x:20,y:62,w:10,h:14,layer:'front' },
      { id:'orquideas',emoji:'🌺',label:'Orquídeas galácticas',x:32,y:62,w:10,h:12,layer:'front' },
      { id:'girasoles',emoji:'🌻',label:'Girasoles solares',x:55,y:58,w:12,h:16,layer:'front' },
      { id:'mariposa1',emoji:'🦋',label:'Mariposa de jardín',x:25,y:48,w:6,h:6,layer:'front' },
      { id:'mariposa2',emoji:'🦋',label:'Mariposa azul',x:48,y:42,w:6,h:6,layer:'front' },
      { id:'abeja',emoji:'🐝',label:'Abeja recolectora',x:35,y:45,w:5,h:5,layer:'front' },
      { id:'colibrí',emoji:'🐦',label:'Colibrí mágico',x:62,y:40,w:5,h:5,layer:'front',accion:'observar',efecto:'💚',sonido:[800,900,1000,900,800] },
      { id:'tortuga',emoji:'🐢',label:'Tortuga del jardín',x:18,y:70,w:7,h:6,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261] },
      { id:'rana',emoji:'🐸',label:'Rana salta hojas',x:30,y:70,w:6,h:5,layer:'front',accion:'seguir',efecto:'😄',sonido:[200,400,200] },
      { id:'regadera',emoji:'🪣',label:'Regadera estelar',x:68,y:62,w:9,h:10,layer:'front',accion:'regar',efecto:'💧',sonido:[400,500,400] },
      { id:'hongos',emoji:'🍄',label:'Hongos amigables',x:10,y:68,w:8,h:8,layer:'front' },
      { id:'semilla',emoji:'🌱',label:'Semilla mágica',x:83,y:68,w:7,h:7,layer:'front',accion:'plantar',efecto:'🌱',sonido:[261,392,523] },
      { id:'fresas',emoji:'🍓',label:'Fresa del jardín',x:45,y:68,w:6,h:6,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784] },
    ]
  },
  {
    id: 14, nombre: 'Planetario', emoji: '🌌',
    bg: 'linear-gradient(180deg,#000005 0%,#00001a 60%,#000033 100%)',
    accent: '#B8A9FF', floor: '#00001a',
    objetos: [
      { id:'sol',emoji:'☀️',label:'El Sol',x:42,y:30,w:16,h:16,layer:'back',accion:'observar',efecto:'☀️',sonido:[440,550,660] },
      { id:'mercurio',emoji:'🔴',label:'Mercurio',x:62,y:33,w:5,h:5,layer:'back' },
      { id:'venus',emoji:'🟡',label:'Venus',x:70,y:32,w:7,h:7,layer:'back' },
      { id:'tierra',emoji:'🌍',label:'La Tierra',x:80,y:30,w:9,h:9,layer:'back',accion:'tocar',efecto:'🌍',sonido:[400,500,600] },
      { id:'marte',emoji:'🔴',label:'Marte',x:18,y:35,w:7,h:7,layer:'back' },
      { id:'jupiter',emoji:'🟠',label:'Júpiter',x:10,y:28,w:14,h:12,layer:'back' },
      { id:'saturno',emoji:'🪐',label:'Saturno',x:28,y:22,w:14,h:10,layer:'back',accion:'tocar',efecto:'🪐',sonido:[300,400,500] },
      { id:'urano',emoji:'🔵',label:'Urano',x:8,y:52,w:10,h:10,layer:'back' },
      { id:'neptuno',emoji:'💙',label:'Neptuno',x:20,y:55,w:10,h:10,layer:'back' },
      { id:'luna',emoji:'🌕',label:'La Luna',x:85,y:42,w:8,h:8,layer:'back' },
      { id:'cometa',emoji:'☄️',label:'Cometa Halley',x:50,y:12,w:10,h:6,layer:'back' },
      { id:'estrella1',emoji:'⭐',label:'Estrella polar',x:35,y:15,w:6,h:6,layer:'back' },
      { id:'galaxia',emoji:'🌌',label:'Galaxia lejana',x:65,y:15,w:14,h:8,layer:'back' },
      { id:'astronauta',emoji:'👨‍🚀',label:'Astronauta',x:48,y:58,w:10,h:12,layer:'front',accion:'seguir',efecto:'🚀',sonido:[400,600,800,600,400] },
      { id:'cohete',emoji:'🚀',label:'Nave espacial',x:62,y:55,w:10,h:13,layer:'front',accion:'subir',efecto:'🚀',sonido:[200,400,600,800,1000] },
      { id:'alien',emoji:'👽',label:'Amigo alienígena',x:30,y:58,w:9,h:10,layer:'front',accion:'saludar',efecto:'👋',sonido:[600,700,800,700,600] },
    ]
  },
  {
    id: 15, nombre: 'Cuarto del Bebé', emoji: '🍼',
    bg: 'linear-gradient(135deg,#fff0f5 0%,#ffe4f0 50%,#fff0f5 100%)',
    accent: '#FFB3D1', floor: '#ffe0ec',
    objetos: [
      { id:'cuna',emoji:'🛏️',label:'Cuna de nubes',x:10,y:48,w:28,h:18,layer:'back',accion:'dormir',efecto:'💤',sonido:[261,329,392,261] },
      { id:'movil',emoji:'🌈',label:'Móvil de colores',x:15,y:28,w:18,h:15,layer:'back' },
      { id:'osito',emoji:'🧸',label:'Osito bebé',x:15,y:56,w:8,h:8,layer:'front',accion:'abrazar',efecto:'💕',sonido:[392,440,523] },
      { id:'pelota_bebe',emoji:'🎾',label:'Pelotita suave',x:42,y:68,w:7,h:7,layer:'front',accion:'rodar',efecto:'😄',sonido:[400,500,400] },
      { id:'sonajero',emoji:'🎵',label:'Sonajero musical',x:52,y:65,w:6,h:8,layer:'front',accion:'sonar',efecto:'🎵',sonido:[800,900,800,1000,800] },
      { id:'pato_bebe',emoji:'🦆',label:'Patito de goma',x:28,y:56,w:6,h:6,layer:'front',accion:'apretar',efecto:'💛',sonido:[400,500,400,500] },
      { id:'mariposa',emoji:'🦋',label:'Mariposa bebe',x:60,y:45,w:5,h:5,layer:'front' },
      { id:'estrella_bebe',emoji:'⭐',label:'Estrellita',x:48,y:48,w:6,h:6,layer:'front' },
      { id:'luna_bebe',emoji:'🌙',label:'Luna bebé',x:72,y:35,w:8,h:8,layer:'back' },
      { id:'nubes',emoji:'☁️',label:'Nubecitas',x:40,y:20,w:20,h:10,layer:'back' },
      { id:'conejo_bebe',emoji:'🐰',label:'Conejito bebé',x:62,y:62,w:6,h:7,layer:'front',accion:'abrazar',efecto:'💕',sonido:[523,659,523] },
      { id:'flores_bebe',emoji:'🌸',label:'Flores de bebé',x:78,y:60,w:8,h:10,layer:'front' },
      { id:'cambiador',emoji:'🛁',label:'Mesa de cambio',x:68,y:45,w:22,h:15,layer:'back',accion:'cambiar',efecto:'✨',sonido:[400,500,600] },
      { id:'juguetes',emoji:'🎠',label:'Juguetes suaves',x:36,y:60,w:8,h:8,layer:'front',accion:'jugar',efecto:'😄',sonido:[523,659,784] },
      { id:'biberón',emoji:'🍼',label:'Biberón de estrellas',x:22,y:64,w:5,h:8,layer:'front',accion:'dar',efecto:'😋',sonido:[400,500,400] },
      { id:'corazon_deco',emoji:'💕',label:'Corazón decorativo',x:50,y:30,w:8,h:7,layer:'back' },
    ]
  },
];

/* Agrega más ambientes hasta completar 28 */
const AMBIENTES_EXTRA: Ambiente[] = [
  { id:16, nombre:'Cocina Espacial', emoji:'🍜', bg:'linear-gradient(135deg,#1a0a00 0%,#3d2000 100%)', accent:'#FFA500', floor:'#2d1500',
    objetos:[ {id:'olla',emoji:'🫕',label:'Olla galáctica',x:20,y:45,w:18,h:18,layer:'back',accion:'cocinar',efecto:'🔥',sonido:[300,400,500]}, {id:'ramen',emoji:'🍜',label:'Ramen estelar',x:45,y:58,w:10,h:8,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784]}, {id:'sushi',emoji:'🍣',label:'Sushi cósmico',x:58,y:58,w:10,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[440,523,659]}, {id:'tacos',emoji:'🌮',label:'Tacos estelares',x:33,y:58,w:10,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[523,659,784]}, {id:'paloma',emoji:'🕊️',label:'Paloma cocinera',x:70,y:48,w:6,h:7,layer:'front'}, {id:'flores',emoji:'🌸',label:'Flores de cocina',x:82,y:55,w:8,h:10,layer:'front'}, {id:'mariposa',emoji:'🦋',label:'Mariposa',x:40,y:40,w:5,h:5,layer:'front'}, {id:'arbol_frutal',emoji:'🍎',label:'Árbol frutal',x:85,y:30,w:12,h:30,layer:'back'}, {id:'gato_chef',emoji:'🐱',label:'Gatito chef',x:60,y:65,w:7,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523]}, {id:'helado',emoji:'🍦',label:'Helado espacial',x:72,y:62,w:6,h:9,layer:'front',accion:'comer',efecto:'😋',sonido:[659,784,880]}, {id:'estante',emoji:'🧂',label:'Estante especias',x:5,y:35,w:12,h:30,layer:'back'}, {id:'ventana',emoji:'🌤️',label:'Ventana cocina',x:0,y:25,w:10,h:18,layer:'back'}, {id:'colibrí',emoji:'🐦',label:'Colibrí frutal',x:25,y:38,w:5,h:5,layer:'front'}, {id:'platanos',emoji:'🍌',label:'Plátanos mágicos',x:15,y:62,w:7,h:7,layer:'front',accion:'comer',efecto:'😋',sonido:[400,523,400]}, {id:'lampara_coc',emoji:'💡',label:'Lámpara cocina',x:42,y:28,w:10,h:15,layer:'back'}, {id:'mariposa2',emoji:'🦋',label:'Mariposa dorada',x:68,y:38,w:5,h:5,layer:'front'}, ] },
  { id:17, nombre:'Sala de Mascotas', emoji:'🐾', bg:'linear-gradient(135deg,#003300 0%,#006600 100%)', accent:'#90EE90', floor:'#004400',
    objetos:[ {id:'perro',emoji:'🐕',label:'Perrito fiel',x:15,y:55,w:12,h:10,layer:'front',accion:'acariciar',efecto:'💕',sonido:[400,500,400,300,400]}, {id:'gato',emoji:'🐈',label:'Gatito travieso',x:35,y:52,w:10,h:10,layer:'front',accion:'acariciar',efecto:'😸',sonido:[523,659,784,523]}, {id:'conejo',emoji:'🐇',label:'Conejito blanco',x:55,y:56,w:9,h:9,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523]}, {id:'hamster',emoji:'🐹',label:'Hámster jugador',x:70,y:60,w:7,h:7,layer:'front',accion:'jugar',efecto:'😄',sonido:[600,700,800]}, {id:'pez_pecera',emoji:'🐠',label:'Peces en pecera',x:80,y:45,w:12,h:15,layer:'back',accion:'observar',efecto:'💙',sonido:[400,500,600]}, {id:'pajarito_jaula',emoji:'🐦',label:'Pajarito cantor',x:5,y:35,w:10,h:15,layer:'back',accion:'escuchar',efecto:'🎵',sonido:[800,1000,800,1000]}, {id:'tortuga',emoji:'🐢',label:'Tortuga lenta',x:25,y:68,w:8,h:6,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261]}, {id:'pelota_mascotas',emoji:'⚽',label:'Pelota de juego',x:43,y:68,w:7,h:7,layer:'front',accion:'lanzar',efecto:'🐕',sonido:[400,300,400]}, {id:'hueso',emoji:'🦴',label:'Hueso del perro',x:28,y:68,w:7,h:5,layer:'front',accion:'dar',efecto:'🐕',sonido:[300,400,300]}, {id:'arbol_mascotas',emoji:'🌳',label:'Árbol trepador',x:60,y:20,w:15,h:40,layer:'back'}, {id:'mariposa',emoji:'🦋',label:'Mariposa amiga',x:48,y:40,w:5,h:5,layer:'front'}, {id:'flores_pasto',emoji:'🌸',label:'Flores del prado',x:5,y:60,w:10,h:12,layer:'front'}, {id:'abeja',emoji:'🐝',label:'Abeja amigable',x:70,y:38,w:5,h:5,layer:'front'}, {id:'flor_girasol',emoji:'🌻',label:'Girasol mascota',x:88,y:55,w:8,h:12,layer:'front'}, {id:'comida_mascotas',emoji:'🥣',label:'Tazón de comida',x:15,y:65,w:8,h:6,layer:'front',accion:'dar',efecto:'😋',sonido:[400,500,400]}, {id:'loro',emoji:'🦜',label:'Loro conversador',x:42,y:35,w:6,h:7,layer:'front',accion:'hablar',efecto:'🎵',sonido:[700,800,900]} ] },
  { id:18, nombre:'Taller Artístico', emoji:'🎨', bg:'linear-gradient(135deg,#1a001a 0%,#2a0040 100%)', accent:'#DDA0DD', floor:'#200030',
    objetos:[ {id:'caballete',emoji:'🖼️',label:'Caballete mágico',x:15,y:35,w:16,h:35,layer:'back',accion:'pintar',efecto:'🎨',sonido:[523,659,784,523]}, {id:'paleta',emoji:'🎨',label:'Paleta de colores',x:38,y:60,w:12,h:8,layer:'front',accion:'usar',efecto:'🎨',sonido:[523,659,784]}, {id:'pincel_grande',emoji:'🖌️',label:'Pincel galáctico',x:53,y:55,w:6,h:14,layer:'front',accion:'pintar',efecto:'🌈',sonido:[440,523,587]}, {id:'esculturas',emoji:'🏺',label:'Escultura estelar',x:68,y:52,w:10,h:13,layer:'front',accion:'tocar',efecto:'✨',sonido:[400,500,600]}, {id:'mariposa_arte',emoji:'🦋',label:'Mariposa artista',x:45,y:40,w:5,h:5,layer:'front'}, {id:'flores_arte',emoji:'🌸',label:'Flores inspiradoras',x:82,y:58,w:8,h:10,layer:'front'}, {id:'luz_estudio',emoji:'💡',label:'Luz de estudio',x:50,y:22,w:10,h:15,layer:'back'}, {id:'lápices',emoji:'✏️',label:'Lápices mágicos',x:30,y:62,w:8,h:8,layer:'front',accion:'usar',efecto:'✏️',sonido:[440,523,440]}, {id:'tijeras',emoji:'✂️',label:'Tijeras estelares',x:22,y:63,w:6,h:6,layer:'front'}, {id:'gato_artista',emoji:'🐱',label:'Gatito artista',x:60,y:62,w:7,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523]}, {id:'origami',emoji:'🦢',label:'Origami cisne',x:75,y:60,w:7,h:8,layer:'front',accion:'hacer',efecto:'🦢',sonido:[523,659,784]}, {id:'cinta',emoji:'🎀',label:'Cinta decorativa',x:10,y:60,w:7,h:5,layer:'front'}, {id:'estrellas_arte',emoji:'⭐',label:'Estrellas de papel',x:40,y:28,w:10,h:8,layer:'back'}, {id:'loro_arte',emoji:'🦜',label:'Loro crítico',x:85,y:42,w:6,h:7,layer:'front',accion:'escuchar',efecto:'🎨',sonido:[700,800,900]}, {id:'ventana_arte',emoji:'🌈',label:'Ventana de color',x:0,y:28,w:10,h:18,layer:'back'}, {id:'corazon_arte',emoji:'💜',label:'Corazón de arte',x:52,y:38,w:6,h:6,layer:'front'} ] },
  { id:19, nombre:'Parque Exterior', emoji:'🌳', bg:'linear-gradient(180deg,#87CEEB 0%,#98FB98 60%,#228B22 100%)', accent:'#228B22', floor:'#2d8a2d',
    objetos:[ {id:'columpio',emoji:'🎠',label:'Columpio del parque',x:10,y:30,w:18,h:40,layer:'back',accion:'columpiarse',efecto:'😄',sonido:[400,500,600,500,400]}, {id:'tobogan',emoji:'🎢',label:'Tobogán del parque',x:72,y:20,w:20,h:45,layer:'back',accion:'bajar',efecto:'🎉',sonido:[400,500,600,700,800]}, {id:'árbol1',emoji:'🌳',label:'Roble gigante',x:30,y:15,w:18,h:45,layer:'back'}, {id:'árbol2',emoji:'🌲',label:'Pino del parque',x:55,y:20,w:14,h:42,layer:'back'}, {id:'flores_parque',emoji:'🌼',label:'Margaritas del prado',x:15,y:68,w:18,h:10,layer:'front'}, {id:'mariposa1',emoji:'🦋',label:'Mariposa del parque',x:40,y:42,w:6,h:6,layer:'front'}, {id:'mariposa2',emoji:'🦋',label:'Mariposa naranja',x:65,y:38,w:6,h:6,layer:'front'}, {id:'abeja',emoji:'🐝',label:'Abeja del prado',x:35,y:48,w:5,h:5,layer:'front'}, {id:'perro',emoji:'🐕',label:'Perrito paseando',x:20,y:63,w:10,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[400,500,400]}, {id:'pato_parque',emoji:'🦆',label:'Pato del lago',x:45,y:62,w:8,h:7,layer:'front',accion:'seguir',efecto:'💛',sonido:[400,500,400]}, {id:'conejo_parque',emoji:'🐰',label:'Conejito saltarín',x:60,y:65,w:7,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523]}, {id:'sol_parque',emoji:'☀️',label:'Sol del mediodía',x:80,y:5,w:12,h:12,layer:'back'}, {id:'nube1',emoji:'☁️',label:'Nube esponjosa',x:20,y:8,w:14,h:8,layer:'back'}, {id:'nube2',emoji:'☁️',label:'Nube suave',x:50,y:5,w:12,h:7,layer:'back'}, {id:'arcoiris',emoji:'🌈',label:'Arco iris parque',x:35,y:10,w:28,h:15,layer:'back'}, {id:'ardilla',emoji:'🐿️',label:'Ardilla del roble',x:38,y:55,w:5,h:6,layer:'front',accion:'dar comida',efecto:'🌰',sonido:[600,700,600]} ] },
  { id:20, nombre:'Cuarto de Manualidades', emoji:'✂️', bg:'linear-gradient(135deg,#1a1a00 0%,#3a3800 100%)', accent:'#FFD700', floor:'#2a2800',
    objetos:[ {id:'mesa_manu',emoji:'🪵',label:'Mesa de trabajos',x:15,y:52,w:55,h:12,layer:'back'}, {id:'lanas',emoji:'🧶',label:'Lanas de colores',x:20,y:50,w:12,h:8,layer:'front',accion:'usar',efecto:'🌈',sonido:[440,523,587]}, {id:'botones',emoji:'🔵',label:'Botones estelares',x:35,y:50,w:8,h:7,layer:'front'}, {id:'tela',emoji:'🎀',label:'Telas de colores',x:45,y:50,w:12,h:7,layer:'front',accion:'cortar',efecto:'✂️',sonido:[300,400,300]}, {id:'aguja',emoji:'🧵',label:'Hilo y aguja',x:58,y:50,w:7,h:7,layer:'front'}, {id:'cinta_manu',emoji:'🎗️',label:'Cinta mágica',x:32,y:58,w:7,h:5,layer:'front'}, {id:'mariposa_manu',emoji:'🦋',label:'Mariposa de papel',x:65,y:45,w:6,h:5,layer:'front',accion:'hacer',efecto:'🦋',sonido:[523,659,784]}, {id:'flor_manu',emoji:'🌸',label:'Flor tejida',x:75,y:55,w:7,h:8,layer:'front',accion:'hacer',efecto:'🌸',sonido:[440,523,659]}, {id:'oveja',emoji:'🐑',label:'Ovejita de lana',x:10,y:62,w:9,h:8,layer:'front',accion:'acariciar',efecto:'💕',sonido:[300,400,300]}, {id:'gusano',emoji:'🐛',label:'Gusanito de seda',x:42,y:64,w:6,h:4,layer:'front'}, {id:'robot_manu',emoji:'🤖',label:'Robot de cartón',x:70,y:55,w:9,h:10,layer:'front',accion:'animar',efecto:'⚡',sonido:[300,400,500]}, {id:'estrella_manu',emoji:'⭐',label:'Estrella de foami',x:53,y:55,w:6,h:6,layer:'front',accion:'hacer',efecto:'⭐',sonido:[523,659,784]}, {id:'corazon_manu',emoji:'💛',label:'Corazón bordado',x:47,y:57,w:5,h:5,layer:'front'}, {id:'lampara_manu',emoji:'💡',label:'Lámpara de trabajo',x:78,y:38,w:8,h:15,layer:'back'}, {id:'caja_manu',emoji:'📦',label:'Caja de materiales',x:85,y:60,w:10,h:12,layer:'back',accion:'abrir',efecto:'✨',sonido:[400,500,400]}, {id:'pintura_manu',emoji:'🎨',label:'Pinturas de dedo',x:25,y:63,w:8,h:6,layer:'front',accion:'usar',efecto:'🌈',sonido:[523,659,784]} ] },
  { id:21, nombre:'Sala de Meditación', emoji:'🧘', bg:'linear-gradient(135deg,#0a001a 0%,#1a0035 100%)', accent:'#B8A9FF', floor:'#150028',
    objetos:[ {id:'cojin_medit',emoji:'🪷',label:'Cojín de meditación',x:38,y:58,w:14,h:8,layer:'back',accion:'sentarse',efecto:'✨',sonido:[261,329,392,329,261]}, {id:'velas_medit',emoji:'🕯️',label:'Velas de armonía',x:20,y:55,w:10,h:12,layer:'front'}, {id:'incienso',emoji:'🌿',label:'Incienso natural',x:68,y:52,w:8,h:14,layer:'front'}, {id:'cristal_medit',emoji:'💎',label:'Cristal curativo',x:50,y:56,w:8,h:9,layer:'front',accion:'tocar',efecto:'✨',sonido:[880,1046,1175,1046,880]}, {id:'flores_medit',emoji:'🌺',label:'Flores de loto',x:30,y:60,w:9,h:9,layer:'front'}, {id:'mariposa_medit',emoji:'🦋',label:'Mariposa de paz',x:45,y:42,w:6,h:6,layer:'front'}, {id:'luna_medit',emoji:'🌙',label:'Luna meditativa',x:45,y:15,w:10,h:10,layer:'back'}, {id:'estrellas_medit',emoji:'✨',label:'Estrellas de paz',x:25,y:20,w:20,h:8,layer:'back'}, {id:'arbol_bonsai',emoji:'🌱',label:'Bonsai galáctico',x:78,y:48,w:12,h:18,layer:'front'}, {id:'musica_medit',emoji:'🎵',label:'Música de paz',x:10,y:52,w:8,h:8,layer:'front',accion:'escuchar',efecto:'🎵',sonido:[261,329,392,523,392,329,261]}, {id:'libro_medit',emoji:'📖',label:'Libro de sabiduría',x:58,y:62,w:8,h:6,layer:'front',accion:'leer',efecto:'💡',sonido:[440,523,587]}, {id:'pluma_medit',emoji:'🪶',label:'Pluma de paz',x:40,y:50,w:5,h:8,layer:'front'}, {id:'arcoiris_suave',emoji:'🌈',label:'Arco iris suave',x:15,y:30,w:22,h:12,layer:'back'}, {id:'nubes_suaves',emoji:'☁️',label:'Nubes suaves',x:60,y:25,w:15,h:8,layer:'back'}, {id:'tortuga_medit',emoji:'🐢',label:'Tortuga sabia',x:22,y:65,w:7,h:6,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261]}, {id:'buho_medit',emoji:'🦉',label:'Búho meditador',x:84,y:65,w:7,h:8,layer:'front',accion:'preguntar',efecto:'🦉',sonido:[261,220,261]} ] },
  { id:22, nombre:'Taller de Ciencias', emoji:'🧪', bg:'linear-gradient(135deg,#001a33 0%,#003366 100%)', accent:'#87CEEB', floor:'#002244',
    objetos:[ {id:'microscopio',emoji:'🔬',label:'Microscopio cuántico',x:12,y:40,w:14,h:28,layer:'back',accion:'observar',efecto:'🔬',sonido:[600,700,800]}, {id:'probetas',emoji:'🧪',label:'Probetas de colores',x:30,y:48,w:12,h:20,layer:'front',accion:'mezclar',efecto:'✨',sonido:[400,500,600,700]}, {id:'abaco',emoji:'🔢',label:'Ábaco galáctico',x:65,y:52,w:12,h:14,layer:'front',accion:'usar',efecto:'💡',sonido:[440,523,587]}, {id:'tierra_ciencias',emoji:'🌍',label:'Globo terráqueo',x:50,y:48,w:10,h:10,layer:'front',accion:'girar',efecto:'🌍',sonido:[400,500,600]}, {id:'planta_exp',emoji:'🌱',label:'Planta experimento',x:78,y:50,w:8,h:14,layer:'front'}, {id:'mariposa_cien',emoji:'🦋',label:'Mariposa de estudio',x:44,y:38,w:5,h:5,layer:'front'}, {id:'arbol_cien',emoji:'🌳',label:'Árbol de la vida',x:85,y:25,w:12,h:40,layer:'back'}, {id:'pez_cien',emoji:'🐠',label:'Pez de estudio',x:58,y:60,w:7,h:5,layer:'front'}, {id:'luna_cien',emoji:'🌙',label:'Luna de análisis',x:35,y:20,w:8,h:8,layer:'back'}, {id:'sol_cien',emoji:'☀️',label:'Sol de energía',x:55,y:18,w:10,h:10,layer:'back'}, {id:'colibri_cien',emoji:'🐦',label:'Colibrí observador',x:25,y:42,w:5,h:5,layer:'front'}, {id:'rana_cien',emoji:'🐸',label:'Rana de laboratorio',x:22,y:66,w:6,h:5,layer:'front',accion:'observar',efecto:'🔬',sonido:[200,400,200]}, {id:'robot_cien',emoji:'🤖',label:'Robot asistente',x:70,y:42,w:10,h:18,layer:'back',accion:'preguntar',efecto:'💡',sonido:[300,400,500]}, {id:'libreta',emoji:'📓',label:'Libreta de notas',x:40,y:60,w:8,h:8,layer:'front',accion:'escribir',efecto:'✍️',sonido:[440,523,440]}, {id:'lupa',emoji:'🔍',label:'Lupa exploradora',x:32,y:62,w:7,h:7,layer:'front',accion:'buscar',efecto:'🔍',sonido:[523,659,784]}, {id:'cristal_exp',emoji:'💎',label:'Cristal experimento',x:48,y:60,w:7,h:8,layer:'front',accion:'tocar',efecto:'✨',sonido:[880,1046,1175]} ] },
  { id:23, nombre:'Granja Cosmica', emoji:'🐄', bg:'linear-gradient(180deg,#87CEEB 0%,#FFF8E7 40%,#8B6914 100%)', accent:'#F4A460', floor:'#8B6914',
    objetos:[ {id:'vaca',emoji:'🐄',label:'Vaca cosmica',x:10,y:45,w:18,h:18,layer:'front',accion:'acariciar',efecto:'🥛',sonido:[200,300,200,300]}, {id:'caballo',emoji:'🐎',label:'Caballo estelar',x:35,y:40,w:18,h:22,layer:'front',accion:'montar',efecto:'🌟',sonido:[300,400,500,400,300]}, {id:'oveja',emoji:'🐑',label:'Oveja de nube',x:60,y:48,w:12,h:12,layer:'front',accion:'acariciar',efecto:'💕',sonido:[300,400,300]}, {id:'pato_granja',emoji:'🦆',label:'Pato de estanque',x:78,y:55,w:8,h:7,layer:'front',accion:'seguir',efecto:'💛',sonido:[400,500,400]}, {id:'gallina',emoji:'🐔',label:'Gallina ponedora',x:25,y:60,w:10,h:9,layer:'front',accion:'seguir',efecto:'🥚',sonido:[300,400,300,400]}, {id:'pollito',emoji:'🐥',label:'Pollito amarillo',x:38,y:63,w:6,h:6,layer:'front',accion:'acariciar',efecto:'💛',sonido:[800,900,800]}, {id:'árbol_manzano',emoji:'🍎',label:'Manzano galáctico',x:85,y:20,w:14,h:40,layer:'back'}, {id:'arbol_frutal2',emoji:'🍊',label:'Naranjo estelar',x:5,y:25,w:12,h:35,layer:'back'}, {id:'flores_campo',emoji:'🌻',label:'Girasoles del campo',x:45,y:62,w:12,h:14,layer:'front'}, {id:'mariposa_granja',emoji:'🦋',label:'Mariposa del campo',x:55,y:40,w:5,h:5,layer:'front'}, {id:'abeja_granja',emoji:'🐝',label:'Abeja de la granja',x:68,y:38,w:5,h:5,layer:'front'}, {id:'conejo_granja',emoji:'🐰',label:'Conejito campesino',x:70,y:62,w:7,h:7,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,523]}, {id:'sol_granja',emoji:'☀️',label:'Sol del campo',x:45,y:5,w:12,h:12,layer:'back'}, {id:'nube_granja',emoji:'☁️',label:'Nube blanca',x:20,y:8,w:14,h:8,layer:'back'}, {id:'colibri_granja',emoji:'🐦',label:'Pájaro cantor',x:30,y:38,w:5,h:5,layer:'front',accion:'escuchar',efecto:'🎵',sonido:[800,900,1000,900]}, {id:'flor_silvestre',emoji:'🌷',label:'Flor silvestre',x:18,y:65,w:7,h:10,layer:'front'} ] },
  { id:24, nombre:'Cueva de Cristales', emoji:'💎', bg:'linear-gradient(135deg,#0a0a1a 0%,#1a1a3a 100%)', accent:'#A0E0FF', floor:'#15152d',
    objetos:[ {id:'cristal1',emoji:'💎',label:'Cristal azul',x:5,y:30,w:14,h:30,layer:'back',accion:'tocar',efecto:'✨',sonido:[880,1046,1175]}, {id:'cristal2',emoji:'💜',label:'Cristal violeta',x:22,y:25,w:12,h:32,layer:'back',accion:'tocar',efecto:'✨',sonido:[784,880,1046]}, {id:'cristal3',emoji:'💚',label:'Cristal verde',x:70,y:28,w:12,h:28,layer:'back',accion:'tocar',efecto:'✨',sonido:[659,784,880]}, {id:'cristal4',emoji:'💛',label:'Cristal dorado',x:82,y:32,w:10,h:25,layer:'back',accion:'tocar',efecto:'✨',sonido:[523,659,784]}, {id:'roca_brillo',emoji:'🪨',label:'Roca brillante',x:35,y:55,w:12,h:10,layer:'front'}, {id:'flor_cueva',emoji:'🌸',label:'Flor de cueva',x:48,y:58,w:8,h:9,layer:'front'}, {id:'hada',emoji:'🧚',label:'Hadita de cristal',x:42,y:40,w:8,h:10,layer:'front',accion:'seguir',efecto:'✨',sonido:[880,1046,1175,1046,880]}, {id:'mariposa_cueva',emoji:'🦋',label:'Mariposa de luz',x:58,y:38,w:6,h:6,layer:'front'}, {id:'luciernaga',emoji:'✨',label:'Luciérnagas',x:32,y:42,w:8,h:6,layer:'front'}, {id:'rana_cueva',emoji:'🐸',label:'Rana de cueva',x:25,y:65,w:6,h:5,layer:'front',accion:'seguir',efecto:'😄',sonido:[200,400,200]}, {id:'estrella_cueva',emoji:'⭐',label:'Estrella de roca',x:60,y:55,w:6,h:6,layer:'front'}, {id:'pez_cueva',emoji:'🐠',label:'Pez de caverna',x:70,y:60,w:7,h:5,layer:'front'}, {id:'tortuga_cueva',emoji:'🐢',label:'Tortuga de cristal',x:15,y:63,w:7,h:6,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261]}, {id:'caracol_cueva',emoji:'🐌',label:'Caracol dorado',x:45,y:65,w:6,h:5,layer:'front'}, {id:'hongo_cueva',emoji:'🍄',label:'Hongo brillante',x:78,y:60,w:8,h:8,layer:'front'}, {id:'flor_cristal',emoji:'🌺',label:'Flor cristalina',x:55,y:60,w:7,h:8,layer:'front',accion:'tocar',efecto:'✨',sonido:[523,659,784]} ] },
  { id:25, nombre:'Teatro Estelar', emoji:'🎭', bg:'linear-gradient(135deg,#1a0000 0%,#3d0000 100%)', accent:'#FFD700', floor:'#2d0000',
    objetos:[ {id:'escenario',emoji:'🎭',label:'Escenario galáctico',x:15,y:45,w:60,h:8,layer:'back'}, {id:'cortinas',emoji:'🎪',label:'Cortinas de gala',x:5,y:20,w:12,h:50,layer:'back'}, {id:'cortinas2',emoji:'🎪',label:'Cortinas derechas',x:82,y:20,w:12,h:50,layer:'back'}, {id:'micro_teatro',emoji:'🎤',label:'Micrófono del actor',x:45,y:38,w:7,h:12,layer:'front',accion:'cantar',efecto:'🎤',sonido:[440,523,659,784]}, {id:'marioneta',emoji:'🪆',label:'Marioneta estelar',x:30,y:35,w:8,h:14,layer:'front',accion:'animar',efecto:'🎭',sonido:[523,587,659]}, {id:'loro_teatro',emoji:'🦜',label:'Loro actor',x:60,y:38,w:7,h:8,layer:'front',accion:'escuchar',efecto:'🎵',sonido:[700,800,900]}, {id:'mariposa_teatro',emoji:'🦋',label:'Mariposa bailarina',x:42,y:30,w:6,h:6,layer:'front'}, {id:'flores_teatro',emoji:'🌹',label:'Rosas del teatro',x:72,y:55,w:10,h:12,layer:'front'}, {id:'nota_teatro',emoji:'🎵',label:'Notas musicales',x:55,y:28,w:8,h:8,layer:'front'}, {id:'estrella_teatro',emoji:'⭐',label:'Estrella del show',x:42,y:20,w:8,h:8,layer:'back'}, {id:'luces_teatro',emoji:'💡',label:'Luces de escena',x:28,y:18,w:38,h:10,layer:'back'}, {id:'globo_teatro',emoji:'🎈',label:'Globos de fiesta',x:18,y:28,w:10,h:15,layer:'front'}, {id:'unicornio_teatro',emoji:'🦄',label:'Unicornio de gala',x:12,y:45,w:12,h:16,layer:'front',accion:'acariciar',efecto:'✨',sonido:[523,659,784,1046,784,659,523]}, {id:'conejo_teatro',emoji:'🐰',label:'Mago conejo',x:68,y:45,w:8,h:10,layer:'front',accion:'sorprender',efecto:'🎩',sonido:[523,659,784]}, {id:'paloma_teatro',emoji:'🕊️',label:'Paloma mágica',x:55,y:45,w:6,h:7,layer:'front',accion:'lanzar',efecto:'✨',sonido:[800,900,1000]}, {id:'corona',emoji:'👑',label:'Corona real',x:42,y:50,w:8,h:6,layer:'front',accion:'ponerse',efecto:'👑',sonido:[659,784,880]} ] },
  { id:26, nombre:'Mundo Submarino', emoji:'🌊', bg:'linear-gradient(180deg,#001a33 0%,#003366 50%,#0044aa 100%)', accent:'#00CED1', floor:'#002255',
    objetos:[ {id:'delfin_sub',emoji:'🐬',label:'Delfín amigable',x:15,y:40,w:15,h:10,layer:'front',accion:'nadar con',efecto:'🐬',sonido:[700,800,900,800,700]}, {id:'ballena',emoji:'🐋',label:'Ballena azul',x:45,y:25,w:30,h:20,layer:'back',accion:'saludar',efecto:'🌊',sonido:[200,300,200]}, {id:'pulpo_sub',emoji:'🐙',label:'Pulpo de colores',x:10,y:58,w:12,h:10,layer:'front',accion:'abrazar',efecto:'💜',sonido:[300,400,500,400]}, {id:'tortuga_sub',emoji:'🐢',label:'Tortuga marina',x:65,y:45,w:12,h:10,layer:'front',accion:'acariciar',efecto:'💚',sonido:[261,329,261]}, {id:'pez1',emoji:'🐠',label:'Pez payaso',x:30,y:55,w:7,h:6,layer:'front',accion:'seguir',efecto:'🐠',sonido:[400,500,600]}, {id:'pez2',emoji:'🐟',label:'Pez azul',x:42,y:52,w:7,h:5,layer:'front'}, {id:'coral1',emoji:'🪸',label:'Coral rosado',x:20,y:65,w:10,h:10,layer:'front'}, {id:'coral2',emoji:'🌺',label:'Coral flor',x:50,y:65,w:10,h:9,layer:'front'}, {id:'coral3',emoji:'🪸',label:'Coral naranja',x:72,y:65,w:10,h:10,layer:'front'}, {id:'estrella_mar_sub',emoji:'⭐',label:'Estrella de mar',x:35,y:66,w:7,h:7,layer:'front',accion:'recoger',efecto:'⭐',sonido:[523,659,784]}, {id:'caballito_mar',emoji:'🐴',label:'Caballito de mar',x:80,y:48,w:6,h:9,layer:'front',accion:'acariciar',efecto:'💕',sonido:[523,659,784]}, {id:'medusa',emoji:'🪼',label:'Medusa brillante',x:58,y:35,w:8,h:10,layer:'front'}, {id:'cangrejo_sub',emoji:'🦀',label:'Cangrejo feliz',x:28,y:68,w:7,h:6,layer:'front',accion:'tocar',efecto:'😄',sonido:[300,400,300]}, {id:'algas',emoji:'🌿',label:'Algas del fondo',x:5,y:55,w:8,h:18,layer:'back'}, {id:'perla',emoji:'⚪',label:'Perla mágica',x:45,y:65,w:5,h:5,layer:'front',accion:'recoger',efecto:'✨',sonido:[880,1046,1175]}, {id:'burbuja_sub',emoji:'🫧',label:'Burbujas marinas',x:88,y:38,w:6,h:10,layer:'front'} ] },
  { id:27, nombre:'Puerta de las Estrellas', emoji:'🌟', bg:'linear-gradient(180deg,#000000 0%,#000020 50%,#000040 100%)', accent:'#FFD700', floor:'#00002a',
    objetos:[ {id:'puerta_est',emoji:'🚪',label:'Puerta mágica',x:38,y:25,w:22,h:45,layer:'back',accion:'abrir',efecto:'✨',sonido:[523,659,784,1046,784,659,523]}, {id:'estrellas_grandes',emoji:'⭐',label:'Estrellas gigantes',x:10,y:15,w:12,h:12,layer:'back'}, {id:'estrellas_med',emoji:'🌟',label:'Estrellas medianas',x:75,y:20,w:10,h:10,layer:'back'}, {id:'via_lactea',emoji:'🌌',label:'Vía Láctea',x:20,y:30,w:20,h:12,layer:'back'}, {id:'galaxia_final',emoji:'🌌',label:'Galaxia lejana',x:60,y:28,w:18,h:10,layer:'back'}, {id:'cohete_final',emoji:'🚀',label:'Nave estelar',x:10,y:50,w:12,h:14,layer:'front',accion:'subir',efecto:'🚀',sonido:[200,400,600,800,1000]}, {id:'astronauta_final',emoji:'👨‍🚀',label:'Astronauta explorador',x:25,y:52,w:10,h:14,layer:'front',accion:'seguir',efecto:'🚀',sonido:[400,600,800]}, {id:'alien_amigo',emoji:'👽',label:'Amigo alienígena',x:65,y:50,w:9,h:12,layer:'front',accion:'saludar',efecto:'👋',sonido:[600,700,800,700]}, {id:'unicornio_final',emoji:'🦄',label:'Unicornio galáctico',x:78,y:45,w:14,h:18,layer:'front',accion:'montar',efecto:'✨',sonido:[523,659,784,1046,784,659,523]}, {id:'mariposa_final',emoji:'🦋',label:'Mariposa del cosmos',x:45,y:42,w:8,h:8,layer:'front'}, {id:'flor_estelar',emoji:'🌸',label:'Flor del universo',x:5,y:62,w:8,h:10,layer:'front'}, {id:'luna_final',emoji:'🌕',label:'Luna llena final',x:50,y:10,w:12,h:12,layer:'back'}, {id:'cometa_final',emoji:'☄️',label:'Cometa eterno',x:30,y:10,w:10,h:6,layer:'back'}, {id:'arcoiris_final',emoji:'🌈',label:'Arco iris cósmico',x:15,y:40,w:18,h:10,layer:'back'}, {id:'sol_final',emoji:'☀️',label:'Sol eterno',x:80,y:8,w:12,h:12,layer:'back'}, {id:'pajarito_final',emoji:'🕊️',label:'Paloma de la paz',x:42,y:65,w:6,h:7,layer:'front',accion:'seguir',efecto:'✨',sonido:[800,900,1000,900,800]} ] },
];

const TODOS_AMBIENTES = [...AMBIENTES, ...AMBIENTES_EXTRA];

/* ══════════════════════════════════════════════
   🎮 COMPONENTE PRINCIPAL
══════════════════════════════════════════════ */
export default function CasaGalactica() {
  const router = useRouter();
  const [ambienteIdx, setAmbienteIdx] = useState(0);
  const [personajes, setPersonajes] = useState<Personaje[]>(PERSONAJES_BASE.map(p => ({ ...p })));
  const [objPosiciones, setObjPosiciones] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<{ tipo: 'objeto' | 'personaje'; id: string } | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [efecto, setEfecto] = useState<{ emoji: string; x: number; y: number } | null>(null);
  const [bubble, setBubble] = useState<{ id: string; texto: string } | null>(null);
  const [showGuardarropa, setShowGuardarropa] = useState<string | null>(null);
  const [layerMode, setLayerMode] = useState<'front' | 'back'>('front');
  const [showAmbientes, setShowAmbientes] = useState(false);
  const [needsDecay, setNeedsDecay] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ tipo: 'objeto' | 'personaje'; id: string } | null>(null);

  const ambiente = TODOS_AMBIENTES[ambienteIdx];

  /* Decaer necesidades cada 15s */
  useEffect(() => {
    const t = setInterval(() => {
      setPersonajes(prev => prev.map(p => ({
        ...p,
        hambre: Math.max(0, p.hambre - 3),
        sueno: Math.max(0, p.sueno - 2),
        diversion: Math.max(0, p.diversion - 2),
        bano: Math.max(0, p.bano - 2),
        amor: Math.max(0, p.amor - 2),
        humor: (p.hambre < 30 || p.sueno < 30 || p.bano < 30) ? 'triste' :
               (p.hambre > 70 && p.sueno > 70 && p.diversion > 70) ? 'feliz' : 'normal'
      })));
      setNeedsDecay(d => d + 1);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  /* Trigger de objeto sobre personaje */
  const checkColision = useCallback((objId: string, px: number, py: number) => {
    const ambiente = TODOS_AMBIENTES[ambienteIdx];
    const obj = ambiente.objetos.find(o => o.id === objId);
    if (!obj || !obj.accion) return;
    const pos = objPosiciones[objId] || { x: obj.x, y: obj.y };
    personajes.forEach(per => {
      const dx = Math.abs(pos.x - per.x);
      const dy = Math.abs(pos.y - per.y);
      if (dx < 15 && dy < 20) {
        aplicarEfecto(per.id, obj.accion!, obj.efecto || '✨', obj.sonido);
      }
    });
  }, [personajes, objPosiciones, ambienteIdx]);

  const aplicarEfecto = (perId: string, accion: string, emoji: string, sonido?: number[]) => {
    if (sonido) melody(sonido, 80, 0.3, 0.15);
    vib([50, 20, 50]);
    setPersonajes(prev => prev.map(p => {
      if (p.id !== perId) return p;
      const np = { ...p };
      if (accion === 'comer' || accion === 'beber') { np.hambre = Math.min(100, p.hambre + 25); np.humor = 'feliz'; }
      if (accion === 'dormir' || accion === 'recostarse') { np.sueno = Math.min(100, p.sueno + 30); np.humor = 'feliz'; }
      if (accion === 'jugar' || accion === 'columpiarse' || accion === 'bajar') { np.diversion = Math.min(100, p.diversion + 25); np.humor = 'emocionado'; }
      if (accion === 'bañar' || accion === 'duchar' || accion === 'lavar') { np.bano = Math.min(100, p.bano + 30); np.humor = 'feliz'; }
      if (accion === 'abrazar' || accion === 'acariciar') { np.amor = Math.min(100, p.amor + 25); np.humor = 'emocionado'; }
      return np;
    }));
    setBubble({ id: perId, texto: emoji });
    const per = personajes.find(p => p.id === perId);
    if (per) setEfecto({ emoji, x: per.x, y: per.y - 10 });
    setTimeout(() => setBubble(null), 1800);
    setTimeout(() => setEfecto(null), 1500);
  };

  /* Drag handlers */
  const startDrag = (tipo: 'objeto' | 'personaje', id: string, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { tipo, id };
    setDragging({ tipo, id });
    const point = 'touches' in e ? e.touches[0] : e;
    setDragPos({ x: point.clientX, y: point.clientY });
    melody([523, 659], 60, 0.15, 0.1);
  };

  const onMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(95, ((point.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(20, Math.min(85, ((point.clientY - rect.top) / rect.height) * 100));
    setDragPos({ x: point.clientX, y: point.clientY });
    const { tipo, id } = dragRef.current;
    if (tipo === 'objeto') {
      setObjPosiciones(prev => ({ ...prev, [id]: { x: xPct, y: yPct } }));
    } else {
      setPersonajes(prev => prev.map(p => p.id === id ? { ...p, x: xPct, y: yPct } : p));
    }
  }, []);

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    const { tipo, id } = dragRef.current;
    if (tipo === 'objeto') checkColision(id, 0, 0);
    dragRef.current = null;
    setDragging(null);
    note(784, 0.2, 0.15);
  }, [checkColision]);

  useEffect(() => {
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', endDrag);
    window.addEventListener('mouseup', endDrag);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [onMove, endDrag]);

  const cambiarAmbiente = (idx: number) => {
    setAmbienteIdx(idx);
    setShowAmbientes(false);
    setObjPosiciones({});
    melody([523, 659, 784, 1046], 80, 0.25, 0.15);
  };

  const humorEmoji = (h: string) => h === 'feliz' ? '😊' : h === 'triste' ? '😢' : h === 'emocionado' ? '🤩' : '😐';
  const barColor = (v: number) => v > 60 ? '#7CFC00' : v > 30 ? '#FFD700' : '#FF4444';

  /* Renderizar objetos según capa */
  const renderObjetos = (capa: 'back' | 'front') =>
    ambiente.objetos
      .filter(o => (o.layer || 'front') === capa)
      .map(obj => {
        const pos = objPosiciones[obj.id] || { x: obj.x, y: obj.y };
        const isDragging = dragging?.tipo === 'objeto' && dragging.id === obj.id;
        return (
          <div
            key={obj.id}
            onTouchStart={e => startDrag('objeto', obj.id, e)}
            onMouseDown={e => startDrag('objeto', obj.id, e)}
            onTouchEnd={() => { if (!dragRef.current) { if (obj.sonido) melody(obj.sonido, 80, 0.25, 0.15); vib(30); }}}
            title={obj.label}
            style={{
              position: 'absolute',
              left: `${pos.x}%`, top: `${pos.y}%`,
              width: `${obj.w}%`, height: `${obj.h}%`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: `${Math.min(obj.w, obj.h) * 0.5}vw`,
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
              zIndex: isDragging ? 100 : (capa === 'back' ? 1 : 5),
              filter: isDragging ? 'brightness(1.3) drop-shadow(0 0 8px gold)' : undefined,
              transition: isDragging ? 'none' : 'filter 0.2s',
            }}
          >
            {obj.emoji}
          </div>
        );
      });

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(0,0,0,0.7)', zIndex: 200, flexShrink: 0 }}>
        <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20, color: '#fff', padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}>← Inicio</button>
        <button onClick={() => setShowAmbientes(true)} style={{ background: ambiente.accent + '33', border: `1px solid ${ambiente.accent}`, borderRadius: 20, color: '#fff', padding: '4px 14px', fontSize: 13, cursor: 'pointer', flex: 1, textAlign: 'center' }}>
          {ambiente.emoji} {ambiente.nombre}
        </button>
        <span style={{ color: '#aaa', fontSize: 11 }}>{ambienteIdx + 1}/{TODOS_AMBIENTES.length}</span>
      </div>

      {/* ESCENA PRINCIPAL */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: ambiente.bg, touchAction: 'none' }}>

        {/* Piso */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '18%', background: ambiente.floor, borderRadius: '60% 60% 0 0 / 30% 30% 0 0', opacity: 0.5 }} />

        {/* Objetos capa back */}
        {renderObjetos('back')}

        {/* PERSONAJES */}
        {personajes.map(per => {
          const isDrag = dragging?.tipo === 'personaje' && dragging.id === per.id;
          const perBubble = bubble?.id === per.id;
          return (
            <div key={per.id}
              onTouchStart={e => startDrag('personaje', per.id, e)}
              onMouseDown={e => startDrag('personaje', per.id, e)}
              onTouchEnd={() => setShowGuardarropa(per.id)}
              onClick={() => { note(523, 0.3, 0.15); setBubble({ id: per.id, texto: humorEmoji(per.humor) }); setTimeout(() => setBubble(null), 1500); }}
              style={{
                position: 'absolute', left: `${per.x}%`, top: `${per.y}%`,
                width: '10%', height: '18%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                cursor: 'pointer', touchAction: 'none', zIndex: isDrag ? 50 : 10,
                filter: isDrag ? 'drop-shadow(0 0 10px white)' : undefined,
                transition: isDrag ? 'none' : 'filter 0.2s',
              }}>
              {/* Burbuja de diálogo */}
              {perBubble && (
                <div style={{
                  position: 'absolute', top: '-25%', left: '50%', transform: 'translateX(-50%)',
                  background: 'white', borderRadius: 12, padding: '3px 8px',
                  fontSize: '1.4rem', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap', zIndex: 60,
                }}>
                  {bubble.texto}
                  <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid white' }} />
                </div>
              )}
              {/* Barras de necesidades al hover */}
              <div style={{ position: 'absolute', top: '-60%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '3px 6px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 60, opacity: isDrag ? 1 : 0.85 }}>
                {[
                  { label: '🍕', val: per.hambre },
                  { label: '💤', val: per.sueno },
                  { label: '🎮', val: per.diversion },
                  { label: '🛁', val: per.bano },
                  { label: '💕', val: per.amor },
                ].map(n => (
                  <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: '0.55rem' }}>{n.label}</span>
                    <div style={{ width: 30, height: 3, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${n.val}%`, height: '100%', background: barColor(n.val), transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Personaje */}
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{per.emoji}</div>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontWeight: 700, textShadow: '0 1px 3px #000' }}>{per.nombre}</div>
            </div>
          );
        })}

        {/* Objetos capa front */}
        {renderObjetos('front')}

        {/* Efecto visual */}
        {efecto && (
          <div style={{
            position: 'absolute', left: `${efecto.x}%`, top: `${efecto.y}%`,
            fontSize: '2rem', pointerEvents: 'none', zIndex: 200,
            animation: 'floatUp 1.5s ease-out forwards',
          }}>
            {efecto.emoji}
          </div>
        )}
      </div>

      {/* PANEL DE AMBIENTES */}
      {showAmbientes && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, overflow: 'auto', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>🏠 28 Ambientes</span>
            <button onClick={() => setShowAmbientes(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20, color: '#fff', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TODOS_AMBIENTES.map((a, i) => (
              <button key={a.id} onClick={() => cambiarAmbiente(i)}
                style={{ background: i === ambienteIdx ? a.accent + '55' : 'rgba(255,255,255,0.08)', border: `1px solid ${i === ambienteIdx ? a.accent : 'rgba(255,255,255,0.15)'}`, borderRadius: 10, color: '#fff', padding: '8px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '1.4rem' }}>{a.emoji}</span>
                <span style={{ fontSize: '0.55rem', opacity: 0.85, textAlign: 'center', lineHeight: 1.2 }}>{a.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GUARDARROPA */}
      {showGuardarropa && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 500, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            const per = personajes.find(p => p.id === showGuardarropa)!;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>✨ {per.nombre} — Personalizar</span>
                  <button onClick={() => setShowGuardarropa(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 20, color: '#fff', padding: '4px 12px', cursor: 'pointer' }}>✕</button>
                </div>
                {[
                  { label: '💇 Cabello', arr: CABELLOS, key: 'cabello' as keyof Personaje },
                  { label: '👕 Ropa', arr: TOPS, key: 'top' as keyof Personaje },
                  { label: '🎩 Accesorio', arr: ACCESORIOS, key: 'accesorio' as keyof Personaje },
                ].map(cat => (
                  <div key={cat.key}>
                    <div style={{ color: '#ccc', fontSize: 12, marginBottom: 6 }}>{cat.label}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {cat.arr.map((e, i) => (
                        <button key={i} onClick={() => {
                          setPersonajes(prev => prev.map(p => p.id === per.id ? { ...p, [cat.key]: i } : p));
                          melody([523, 659], 60, 0.2, 0.12);
                        }} style={{ background: (per[cat.key] as number) === i ? per.color + '55' : 'rgba(255,255,255,0.08)', border: `2px solid ${(per[cat.key] as number) === i ? per.color : 'transparent'}`, borderRadius: 10, padding: '6px 10px', fontSize: '1.2rem', cursor: 'pointer' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Necesidades */}
                <div style={{ color: '#ccc', fontSize: 12 }}>Estado actual:</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[{ e: '🍕', l: 'Hambre', v: per.hambre }, { e: '💤', l: 'Sueño', v: per.sueno }, { e: '🎮', l: 'Diversión', v: per.diversion }, { e: '🛁', l: 'Baño', v: per.bano }, { e: '💕', l: 'Amor', v: per.amor }].map(n => (
                    <div key={n.l} style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: '1.2rem' }}>{n.e}</div>
                      <div style={{ color: barColor(n.v), fontSize: 11, fontWeight: 700 }}>{n.v}%</div>
                      <div style={{ color: '#888', fontSize: 9 }}>{n.l}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
