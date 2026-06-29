'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══ AUDIO ENGINE ══ */
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 100, d = 0.35, v = 0.18) => fs.forEach((f,i) => setTimeout(() => note(f,d,v), i*gap));
const sweep = (f1: number, f2: number, d = 0.4, v = 0.2) => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1,c.currentTime); o.frequency.exponentialRampToValueAtTime(f2,c.currentTime+d); g.gain.setValueAtTime(v,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d); o.start(); o.stop(c.currentTime+d); } catch {}
};
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };
const r = (a: number, b: number) => a + Math.random()*(b-a);
const ri = (a: number, b: number) => Math.floor(r(a,b));
let uid = 5000;

/* ══ TIPOS ══ */
type Need = 'hunger'|'sleep'|'fun'|'bath'|'love';
type Layer = 'back'|'mid'|'front';
type CharMood = 'happy'|'neutral'|'sad'|'excited'|'sleepy'|'clean';
interface Character {
  id: number; name: string; emoji: string; color: string;
  x: number; y: number; layer: Layer; zIndex: number;
  needs: Record<Need,number>;
  mood: CharMood; bubble: string; bubbleTimer: number;
  hair: number; top: number; acc: number;
  dragging: boolean; scale: number;
}
interface FurnitureItem {
  id: number; emoji: string; label: string; x: number; y: number;
  layer: Layer; zIndex: number; dragging: boolean; scale: number;
  action: Need | null; room: number; color: string; sz: number;
}
type Particle = { id:number; x:number; y:number; e:string; };

/* ══ HABITACIONES (28 — Los Supersónicos) ══ */
const ROOMS = [
  { id:0,  name:'Sala Principal',      emoji:'🛋️',  bg:'linear-gradient(160deg,#1a0533 0%,#2d0b5e 50%,#1a0533 100%)', accent:'#B8A9FF' },
  { id:1,  name:'Cocina Galáctica',    emoji:'🍳',  bg:'linear-gradient(160deg,#0a1a10 0%,#0d3320 50%,#0a1a10 100%)', accent:'#7CFC00' },
  { id:2,  name:'Cuarto de Elroy',     emoji:'🔭',  bg:'linear-gradient(160deg,#001040 0%,#002580 50%,#001040 100%)', accent:'#4D96FF' },
  { id:3,  name:'Cuarto de Judy',      emoji:'💄',  bg:'linear-gradient(160deg,#2a0020 0%,#5a004a 50%,#2a0020 100%)', accent:'#FF6B9D' },
  { id:4,  name:'Garaje Espacial',     emoji:'🚀',  bg:'linear-gradient(160deg,#0a0a0a 0%,#1a1a2e 50%,#0a0a0a 100%)', accent:'#87CEEB' },
  { id:5,  name:'Jardín Estelar',      emoji:'🌸',  bg:'linear-gradient(160deg,#001508 0%,#003318 50%,#001508 100%)', accent:'#98FF98' },
  { id:6,  name:'Azotea Cósmica',      emoji:'🌌',  bg:'linear-gradient(160deg,#000010 0%,#00002a 50%,#000010 100%)', accent:'#00D4C8' },
  { id:7,  name:'Laboratorio Astro',   emoji:'🔬',  bg:'linear-gradient(160deg,#0a1520 0%,#152a3a 50%,#0a1520 100%)', accent:'#FFD700' },
  { id:8,  name:'Baño Estelar',        emoji:'🛁',  bg:'linear-gradient(160deg,#001020 0%,#002040 50%,#001020 100%)', accent:'#00CED1' },
  { id:9,  name:'Comedor Orbital',     emoji:'🍽️',  bg:'linear-gradient(160deg,#1a0a00 0%,#3a1a00 50%,#1a0a00 100%)', accent:'#FFA07A' },
  { id:10, name:'Sala de Juegos',      emoji:'🎮',  bg:'linear-gradient(160deg,#0a001a 0%,#1a0035 50%,#0a001a 100%)', accent:'#C77DFF' },
  { id:11, name:'Biblioteca Cósmica',  emoji:'📚',  bg:'linear-gradient(160deg,#100800 0%,#281500 50%,#100800 100%)', accent:'#DEB887' },
  { id:12, name:'Cuarto de Astro',     emoji:'🐕',  bg:'linear-gradient(160deg,#001008 0%,#002515 50%,#001008 100%)', accent:'#7CFC00' },
  { id:13, name:'Estudio de George',   emoji:'💼',  bg:'linear-gradient(160deg,#0d0d1a 0%,#1a1a35 50%,#0d0d1a 100%)', accent:'#4D96FF' },
  { id:14, name:'Cuarto de Jane',      emoji:'🌷',  bg:'linear-gradient(160deg,#1a0015 0%,#35002a 50%,#1a0015 100%)', accent:'#FFB3D1' },
  { id:15, name:'Lavandería Orbital',  emoji:'🫧',  bg:'linear-gradient(160deg,#001015 0%,#00202d 50%,#001015 100%)', accent:'#87CEEB' },
  { id:16, name:'Gimnasio Espacial',   emoji:'🏋️',  bg:'linear-gradient(160deg,#150005 0%,#2a000f 50%,#150005 100%)', accent:'#FF6B6B' },
  { id:17, name:'Piscina Galáctica',   emoji:'🏊',  bg:'linear-gradient(160deg,#00101a 0%,#002035 50%,#00101a 100%)', accent:'#00BFFF' },
  { id:18, name:'Cine en Casa',        emoji:'🎬',  bg:'linear-gradient(160deg,#050505 0%,#100010 50%,#050505 100%)', accent:'#FFD700' },
  { id:19, name:'Terraza Planetaria',  emoji:'🌠',  bg:'linear-gradient(160deg,#000005 0%,#000015 50%,#000005 100%)', accent:'#B8A9FF' },
  { id:20, name:'Invernadero Astral',  emoji:'🌿',  bg:'linear-gradient(160deg,#001500 0%,#003000 50%,#001500 100%)', accent:'#98FF98' },
  { id:21, name:'Taller de Robots',    emoji:'🤖',  bg:'linear-gradient(160deg,#050510 0%,#0a0a20 50%,#050510 100%)', accent:'#00D4C8' },
  { id:22, name:'Sala de Música',      emoji:'🎵',  bg:'linear-gradient(160deg,#150010 0%,#300025 50%,#150010 100%)', accent:'#FF69B4' },
  { id:23, name:'Cuarto del Bebé',     emoji:'🍼',  bg:'linear-gradient(160deg,#00101a 0%,#00203a 50%,#00101a 100%)', accent:'#BAE1FF' },
  { id:24, name:'Sala de Trofeos',     emoji:'🏆',  bg:'linear-gradient(160deg,#1a1000 0%,#352000 50%,#1a1000 100%)', accent:'#FFD700' },
  { id:25, name:'Observatorio',        emoji:'🔭',  bg:'linear-gradient(160deg,#000008 0%,#000018 50%,#000008 100%)', accent:'#C77DFF' },
  { id:26, name:'Spa Estelar',         emoji:'💆',  bg:'linear-gradient(160deg,#001018 0%,#002030 50%,#001018 100%)', accent:'#A8EDEA' },
  { id:27, name:'Entrada Principal',   emoji:'🚪',  bg:'linear-gradient(160deg,#0a0010 0%,#150020 50%,#0a0010 100%)', accent:'#DDA0DD' },
];

/* ══ MUEBLES POR HABITACIÓN (40+ objetos, sin monstruos ni calaveras) ══ */
const FURNITURE_BY_ROOM: Record<number, {emoji:string; label:string; action:Need|null; color:string}[]> = {
  0: [ // Sala Principal
    {emoji:'🛋️',label:'Sofá',action:'fun',color:'#B8A9FF'},{emoji:'📺',label:'Tele',action:'fun',color:'#87CEEB'},
    {emoji:'🪴',label:'Planta',action:null,color:'#7CFC00'},{emoji:'🕯️',label:'Vela',action:null,color:'#FFD700'},
    {emoji:'🎮',label:'Consola',action:'fun',color:'#C77DFF'},{emoji:'📻',label:'Radio',action:'fun',color:'#FFA07A'},
    {emoji:'🖼️',label:'Cuadro',action:null,color:'#DDA0DD'},{emoji:'🪞',label:'Espejo',action:null,color:'#87CEEB'},
    {emoji:'💐',label:'Flores',action:null,color:'#FF6B9D'},{emoji:'🧸',label:'Osito',action:'love',color:'#DEB887'},
    {emoji:'☕',label:'Cafecito',action:'hunger',color:'#8B4513'},{emoji:'🎵',label:'Música',action:'fun',color:'#FF69B4'},
    {emoji:'🪑',label:'Sillón',action:'fun',color:'#B8A9FF'},{emoji:'🌟',label:'Estrella Dec',action:null,color:'#FFD700'},
    {emoji:'🐱',label:'Gato',action:'love',color:'#FFA07A'},{emoji:'🐶',label:'Perro',action:'love',color:'#DEB887'},
    {emoji:'🎀',label:'Lazo Dec',action:null,color:'#FF6B9D'},{emoji:'🫖',label:'Tetera',action:'hunger',color:'#FFD700'},
    {emoji:'📷',label:'Cámara',action:null,color:'#87CEEB'},{emoji:'🎪',label:'Carpa Mini',action:'fun',color:'#FF4500'},
    {emoji:'🌺',label:'Flor Tropical',action:null,color:'#FF6B9D'},{emoji:'🦋',label:'Mariposa Dec',action:null,color:'#C77DFF'},
    {emoji:'🕰️',label:'Reloj Pared',action:null,color:'#DEB887'},{emoji:'📦',label:'Caja Magic',action:null,color:'#B8A9FF'},
    {emoji:'🎁',label:'Regalo',action:'love',color:'#FF6B9D'},{emoji:'🧩',label:'Rompecab',action:'fun',color:'#4D96FF'},
    {emoji:'🪆',label:'Muñeca',action:'love',color:'#FF6B9D'},{emoji:'🎠',label:'Carrusel',action:'fun',color:'#C77DFF'},
    {emoji:'🌈',label:'Arcoíris Dec',action:null,color:'#FF6B9D'},{emoji:'⭐',label:'Estrella Nov',action:null,color:'#FFD700'},
    {emoji:'🎈',label:'Globo',action:'fun',color:'#FF6B6B'},{emoji:'🦚',label:'Pavo Real',action:null,color:'#00CED1'},
    {emoji:'🌙',label:'Luna Dec',action:null,color:'#B8A9FF'},{emoji:'🪐',label:'Saturno Dec',action:null,color:'#C77DFF'},
    {emoji:'🛸',label:'OVNI Dec',action:null,color:'#00D4C8'},{emoji:'🌸',label:'Cerezo',action:null,color:'#FFB3D1'},
    {emoji:'🎭',label:'Máscaras',action:'fun',color:'#FFD700'},{emoji:'🦜',label:'Loro',action:'love',color:'#7CFC00'},
    {emoji:'🐠',label:'Pez Dec',action:null,color:'#FF6B9D'},{emoji:'🌻',label:'Girasol',action:null,color:'#FFD700'},
    {emoji:'🍰',label:'Torta',action:'hunger',color:'#FFB3BA'},{emoji:'🎂',label:'Pastel',action:'hunger',color:'#FFD700'},
  ],
  1: [ // Cocina Galáctica
    {emoji:'🍳',label:'Sartén',action:'hunger',color:'#7CFC00'},{emoji:'🥘',label:'Cazuela',action:'hunger',color:'#FFA07A'},
    {emoji:'🍕',label:'Pizza',action:'hunger',color:'#FF6B6B'},{emoji:'🍓',label:'Frutillas',action:'hunger',color:'#FF4500'},
    {emoji:'🥗',label:'Ensalada',action:'hunger',color:'#7CFC00'},{emoji:'🥐',label:'Medialunas',action:'hunger',color:'#DEB887'},
    {emoji:'🍰',label:'Torta',action:'hunger',color:'#FFB3BA'},{emoji:'🧃',label:'Jugo',action:'hunger',color:'#FF6B6B'},
    {emoji:'🫐',label:'Arándanos',action:'hunger',color:'#4D96FF'},{emoji:'🍎',label:'Manzana',action:'hunger',color:'#FF4500'},
    {emoji:'🍌',label:'Banana',action:'hunger',color:'#FFD700'},{emoji:'🥦',label:'Brócoli',action:'hunger',color:'#7CFC00'},
    {emoji:'🍜',label:'Fideos',action:'hunger',color:'#FFD700'},{emoji:'🧁',label:'Cupcake',action:'hunger',color:'#FF69B4'},
    {emoji:'🍩',label:'Rosquilla',action:'hunger',color:'#FFA07A'},{emoji:'🥛',label:'Leche',action:'hunger',color:'#FFFFFF'},
    {emoji:'☕',label:'Café',action:'hunger',color:'#8B4513'},{emoji:'🍵',label:'Té Verde',action:'hunger',color:'#7CFC00'},
    {emoji:'🫖',label:'Tetera',action:'hunger',color:'#FFD700'},{emoji:'🍇',label:'Uvas',action:'hunger',color:'#C77DFF'},
    {emoji:'🥝',label:'Kiwi',action:'hunger',color:'#7CFC00'},{emoji:'🍊',label:'Naranja',action:'hunger',color:'#FFA07A'},
    {emoji:'🍋',label:'Limón',action:'hunger',color:'#FFD700'},{emoji:'🥞',label:'Pancakes',action:'hunger',color:'#DEB887'},
    {emoji:'🧇',label:'Waffles',action:'hunger',color:'#FFD700'},{emoji:'🍦',label:'Helado',action:'hunger',color:'#FFB3BA'},
    {emoji:'🍨',label:'Helado Balde',action:'hunger',color:'#BAE1FF'},{emoji:'🎂',label:'Pastel',action:'hunger',color:'#FF69B4'},
    {emoji:'🥕',label:'Zanahoria',action:'hunger',color:'#FF6B6B'},{emoji:'🍄',label:'Champiñón',action:'hunger',color:'#DEB887'},
    {emoji:'🌽',label:'Choclo',action:'hunger',color:'#FFD700'},{emoji:'🍅',label:'Tomate',action:'hunger',color:'#FF4500'},
    {emoji:'🥑',label:'Palta',action:'hunger',color:'#7CFC00'},{emoji:'🍑',label:'Durazno',action:'hunger',color:'#FFB3BA'},
    {emoji:'🍒',label:'Cerezas',action:'hunger',color:'#FF4500'},{emoji:'🌮',label:'Taco',action:'hunger',color:'#FFA07A'},
    {emoji:'🥨',label:'Pretzel',action:'hunger',color:'#DEB887'},{emoji:'🧀',label:'Queso',action:'hunger',color:'#FFD700'},
    {emoji:'🥚',label:'Huevo',action:'hunger',color:'#FFD700'},{emoji:'🍿',label:'Pochoclo',action:'hunger',color:'#FFD700'},
    {emoji:'🫙',label:'Frasco',action:null,color:'#87CEEB'},{emoji:'🧂',label:'Sal',action:null,color:'#FFFFFF'},
  ],
  2: [ // Cuarto de Elroy
    {emoji:'🔭',label:'Telescopio',action:'fun',color:'#4D96FF'},{emoji:'🚀',label:'Cohete Juguete',action:'fun',color:'#87CEEB'},
    {emoji:'🪐',label:'Saturno Modelo',action:'fun',color:'#C77DFF'},{emoji:'⭐',label:'Estrella Modelo',action:'fun',color:'#FFD700'},
    {emoji:'🤖',label:'Robot Juguete',action:'fun',color:'#00D4C8'},{emoji:'🎮',label:'Consola',action:'fun',color:'#4D96FF'},
    {emoji:'📚',label:'Libros Ciencia',action:'fun',color:'#DEB887'},{emoji:'🖥️',label:'Computadora',action:'fun',color:'#87CEEB'},
    {emoji:'🔋',label:'Batería',action:null,color:'#7CFC00'},{emoji:'💡',label:'Lámpara Ideas',action:null,color:'#FFD700'},
    {emoji:'🧲',label:'Imán',action:'fun',color:'#FF6B6B'},{emoji:'🔬',label:'Microscopio',action:'fun',color:'#4D96FF'},
    {emoji:'🏆',label:'Trofeo',action:null,color:'#FFD700'},{emoji:'🎯',label:'Diana',action:'fun',color:'#FF6B6B'},
    {emoji:'🚁',label:'Helicóptero',action:'fun',color:'#87CEEB'},{emoji:'✈️',label:'Avión Juguete',action:'fun',color:'#4D96FF'},
    {emoji:'🛸',label:'OVNI Juguete',action:'fun',color:'#00D4C8'},{emoji:'🌍',label:'Globo Terráq',action:'fun',color:'#4D96FF'},
    {emoji:'🧩',label:'Puzzle',action:'fun',color:'#C77DFF'},{emoji:'🎲',label:'Dados',action:'fun',color:'#FF6B6B'},
    {emoji:'🎪',label:'Carpa',action:'fun',color:'#FF6B6B'},{emoji:'🦅',label:'Águila Model',action:null,color:'#DEB887'},
    {emoji:'🐬',label:'Delfín Model',action:null,color:'#87CEEB'},{emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF'},
    {emoji:'🌙',label:'Luna Noche',action:null,color:'#B8A9FF'},{emoji:'☄️',label:'Cometa',action:null,color:'#FF8E53'},
    {emoji:'🛰️',label:'Satélite',action:'fun',color:'#87CEEB'},{emoji:'🎠',label:'Carrusel',action:'fun',color:'#C77DFF'},
    {emoji:'🏀',label:'Pelota',action:'fun',color:'#FFA07A'},{emoji:'⚽',label:'Fútbol',action:'fun',color:'#FFFFFF'},
    {emoji:'🎸',label:'Guitarra',action:'fun',color:'#DEB887'},{emoji:'🥁',label:'Batería',action:'fun',color:'#FF6B6B'},
    {emoji:'🎺',label:'Trompeta',action:'fun',color:'#FFD700'},{emoji:'🧸',label:'Osito',action:'love',color:'#DEB887'},
    {emoji:'🪆',label:'Muñeca',action:'love',color:'#FF6B9D'},{emoji:'🎡',label:'Rueda',action:'fun',color:'#C77DFF'},
    {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D'},{emoji:'🎀',label:'Lazo',action:null,color:'#FF69B4'},
    {emoji:'🐶',label:'Perro Toy',action:'love',color:'#DEB887'},{emoji:'🐱',label:'Gato Toy',action:'love',color:'#FFA07A'},
    {emoji:'🦁',label:'León Toy',action:'love',color:'#FFD700'},{emoji:'🐻',label:'Oso Toy',action:'love',color:'#DEB887'},
  ],
  3: [ // Cuarto de Judy
    {emoji:'💄',label:'Labial',action:null,color:'#FF6B9D'},{emoji:'👗',label:'Vestido',action:null,color:'#C77DFF'},
    {emoji:'👑',label:'Corona',action:null,color:'#FFD700'},{emoji:'🌸',label:'Flor Rosa',action:null,color:'#FFB3D1'},
    {emoji:'🪞',label:'Espejo',action:null,color:'#87CEEB'},{emoji:'💅',label:'Esmalte',action:null,color:'#FF69B4'},
    {emoji:'🎀',label:'Moño',action:null,color:'#FF6B9D'},{emoji:'👠',label:'Zapatos',action:null,color:'#FF4500'},
    {emoji:'👜',label:'Bolso',action:null,color:'#C77DFF'},{emoji:'🌺',label:'Hibisco',action:null,color:'#FF6B9D'},
    {emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF'},{emoji:'🌷',label:'Tulipán',action:null,color:'#FF69B4'},
    {emoji:'🌹',label:'Rosa',action:null,color:'#FF4500'},{emoji:'🌻',label:'Girasol',action:null,color:'#FFD700'},
    {emoji:'💐',label:'Ramo',action:null,color:'#FF6B9D'},{emoji:'🎭',label:'Teatro',action:'fun',color:'#C77DFF'},
    {emoji:'🎪',label:'Circo',action:'fun',color:'#FF6B6B'},{emoji:'🎠',label:'Carrusel',action:'fun',color:'#FFB3D1'},
    {emoji:'🧸',label:'Osita',action:'love',color:'#FFB3BA'},{emoji:'🪆',label:'Muñeca',action:'love',color:'#FF69B4'},
    {emoji:'🎮',label:'Consola',action:'fun',color:'#C77DFF'},{emoji:'📱',label:'Teléfono',action:'fun',color:'#87CEEB'},
    {emoji:'🎵',label:'Música',action:'fun',color:'#FF69B4'},{emoji:'🎸',label:'Guitarra',action:'fun',color:'#C77DFF'},
    {emoji:'🎹',label:'Piano',action:'fun',color:'#FFFFFF'},{emoji:'🎤',label:'Micrófono',action:'fun',color:'#87CEEB'},
    {emoji:'🦚',label:'Pavo Real',action:null,color:'#00CED1'},{emoji:'🦜',label:'Loro',action:'love',color:'#7CFC00'},
    {emoji:'🐱',label:'Gato',action:'love',color:'#FFA07A'},{emoji:'🌙',label:'Luna',action:null,color:'#B8A9FF'},
    {emoji:'⭐',label:'Estrella',action:null,color:'#FFD700'},{emoji:'💫',label:'Destello',action:null,color:'#C77DFF'},
    {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D'},{emoji:'🎆',label:'Fuegos',action:'fun',color:'#FF4500'},
    {emoji:'🍭',label:'Chupetín',action:'hunger',color:'#FF6B9D'},{emoji:'🍬',label:'Caramelo',action:'hunger',color:'#FF69B4'},
    {emoji:'🍰',label:'Torta',action:'hunger',color:'#FFB3BA'},{emoji:'🧁',label:'Cupcake',action:'hunger',color:'#FF69B4'},
    {emoji:'🎁',label:'Regalo',action:'love',color:'#FF6B9D'},{emoji:'💝',label:'Corazón',action:'love',color:'#FF4500'},
    {emoji:'🪷',label:'Loto',action:null,color:'#FFB3D1'},{emoji:'🌿',label:'Helecho',action:null,color:'#7CFC00'},
  ],
  4: [ // Garaje Espacial
    {emoji:'🚀',label:'Cohete',action:'fun',color:'#87CEEB'},{emoji:'🛸',label:'OVNI',action:'fun',color:'#00D4C8'},
    {emoji:'🚗',label:'Auto Espacial',action:'fun',color:'#FF6B6B'},{emoji:'🏎️',label:'Fórmula 1',action:'fun',color:'#FF4500'},
    {emoji:'🚁',label:'Helicóptero',action:'fun',color:'#87CEEB'},{emoji:'✈️',label:'Avión',action:'fun',color:'#4D96FF'},
    {emoji:'🛵',label:'Moto',action:'fun',color:'#FF6B6B'},{emoji:'🚲',label:'Bici Espacial',action:'fun',color:'#7CFC00'},
    {emoji:'🔧',label:'Llave',action:null,color:'#87CEEB'},{emoji:'⚙️',label:'Engranaje',action:null,color:'#DEB887'},
    {emoji:'🔩',label:'Tornillo',action:null,color:'#87CEEB'},{emoji:'🛠️',label:'Herramientas',action:null,color:'#FFA07A'},
    {emoji:'🔋',label:'Batería',action:null,color:'#7CFC00'},{emoji:'💡',label:'Foco',action:null,color:'#FFD700'},
    {emoji:'🤖',label:'Robot',action:'fun',color:'#00D4C8'},{emoji:'🦾',label:'Brazo Robot',action:null,color:'#87CEEB'},
    {emoji:'🚦',label:'Semáforo',action:null,color:'#7CFC00'},{emoji:'🗺️',label:'Mapa Espacial',action:'fun',color:'#DEB887'},
    {emoji:'🧰',label:'Caja Tools',action:null,color:'#FF6B6B'},{emoji:'📡',label:'Antena',action:null,color:'#87CEEB'},
    {emoji:'🛰️',label:'Satélite',action:'fun',color:'#87CEEB'},{emoji:'☄️',label:'Cometa',action:null,color:'#FF8E53'},
    {emoji:'🦅',label:'Águila',action:null,color:'#DEB887'},{emoji:'🦁',label:'León Guarda',action:null,color:'#FFD700'},
    {emoji:'🐺',label:'Lobo Guarda',action:null,color:'#87CEEB'},{emoji:'🌟',label:'Estrella',action:null,color:'#FFD700'},
    {emoji:'🏆',label:'Trofeo',action:null,color:'#FFD700'},{emoji:'🎯',label:'Diana',action:'fun',color:'#FF6B6B'},
    {emoji:'🚀',label:'Cohete Mini',action:'fun',color:'#C77DFF'},{emoji:'🌍',label:'Globo Tierra',action:'fun',color:'#4D96FF'},
    {emoji:'🪐',label:'Planeta',action:null,color:'#C77DFF'},{emoji:'💎',label:'Cristal',action:null,color:'#00D4C8'},
    {emoji:'🔮',label:'Bola Cristal',action:'fun',color:'#C77DFF'},{emoji:'⭐',label:'Estrella Nov',action:null,color:'#FFD700'},
    {emoji:'🎪',label:'Carpa',action:'fun',color:'#FF4500'},{emoji:'🎠',label:'Carrusel',action:'fun',color:'#C77DFF'},
    {emoji:'🏅',label:'Medalla',action:null,color:'#FFD700'},{emoji:'🥇',label:'Oro',action:null,color:'#FFD700'},
    {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D'},{emoji:'💫',label:'Chispa',action:null,color:'#FFD700'},
    {emoji:'🎆',label:'Fuegos Art',action:'fun',color:'#FF4500'},{emoji:'🎇',label:'Bengala',action:'fun',color:'#FFD700'},
  ],
  5: [ // Jardín Estelar
    {emoji:'🌸',label:'Cerezo',action:null,color:'#FFB3D1'},{emoji:'🌺',label:'Hibisco',action:null,color:'#FF6B9D'},
    {emoji:'🌻',label:'Girasol',action:null,color:'#FFD700'},{emoji:'🌹',label:'Rosa',action:null,color:'#FF4500'},
    {emoji:'🌷',label:'Tulipán',action:null,color:'#FF69B4'},{emoji:'🌼',label:'Margarita',action:null,color:'#FFD700'},
    {emoji:'💐',label:'Bouquet',action:null,color:'#FF6B9D'},{emoji:'🪷',label:'Loto',action:null,color:'#FFB3D1'},
    {emoji:'🌿',label:'Helecho',action:null,color:'#7CFC00'},{emoji:'🍀',label:'Trébol',action:null,color:'#7CFC00'},
    {emoji:'🎋',label:'Bambú',action:null,color:'#7CFC00'},{emoji:'🎄',label:'Árbol Nav',action:null,color:'#7CFC00'},
    {emoji:'🌲',label:'Pino',action:null,color:'#7CFC00'},{emoji:'🌳',label:'Roble',action:null,color:'#7CFC00'},
    {emoji:'🌴',label:'Palmera',action:null,color:'#7CFC00'},{emoji:'🌵',label:'Cactus',action:null,color:'#7CFC00'},
    {emoji:'🍄',label:'Hongo Mágico',action:null,color:'#FF6B6B'},{emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF'},
    {emoji:'🐝',label:'Abeja',action:null,color:'#FFD700'},{emoji:'🐛',label:'Oruga',action:null,color:'#7CFC00'},
    {emoji:'🐌',label:'Caracol',action:null,color:'#DEB887'},{emoji:'🐞',label:'Vaquita',action:null,color:'#FF4500'},
    {emoji:'🦗',label:'Grillo',action:null,color:'#7CFC00'},{emoji:'🐜',label:'Hormiga',action:null,color:'#8B4513'},
    {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D'},{emoji:'☀️',label:'Sol',action:null,color:'#FFD700'},
    {emoji:'🌙',label:'Luna',action:null,color:'#B8A9FF'},{emoji:'⭐',label:'Estrella',action:null,color:'#FFD700'},
    {emoji:'🌊',label:'Fuente',action:'bath',color:'#00BFFF'},{emoji:'🪨',label:'Piedra',action:null,color:'#87CEEB'},
    {emoji:'🛖',label:'Casita',action:null,color:'#DEB887'},{emoji:'⛺',label:'Carpa',action:'fun',color:'#7CFC00'},
    {emoji:'🪁',label:'Cometa',action:'fun',color:'#C77DFF'},{emoji:'🎡',label:'Rueda Fort',action:'fun',color:'#FF6B9D'},
    {emoji:'🎠',label:'Carrusel',action:'fun',color:'#FFB3D1'},{emoji:'🎪',label:'Feria',action:'fun',color:'#FF4500'},
    {emoji:'🐦',label:'Pájaro',action:null,color:'#87CEEB'},{emoji:'🦜',label:'Loro',action:'love',color:'#7CFC00'},
    {emoji:'🦚',label:'Pavo Real',action:null,color:'#00CED1'},{emoji:'🦩',label:'Flamenco',action:null,color:'#FF69B4'},
    {emoji:'🐇',label:'Conejito',action:'love',color:'#FFFFFF'},{emoji:'🐿️',label:'Ardilla',action:null,color:'#DEB887'},
    {emoji:'🦔',label:'Erizo',action:null,color:'#8B4513'},{emoji:'🐢',label:'Tortuga',action:null,color:'#7CFC00'},
  ],
  6: [ // Azotea Cósmica — objetos de noche estelar
    {emoji:'🌌',label:'Galaxia',action:null,color:'#B8A9FF'},{emoji:'🪐',label:'Saturno',action:null,color:'#C77DFF'},
    {emoji:'🌟',label:'Supernova',action:null,color:'#FFD700'},{emoji:'☄️',label:'Cometa',action:null,color:'#FF8E53'},
    {emoji:'🌙',label:'Luna Creciente',action:null,color:'#B8A9FF'},{emoji:'⭐',label:'Estrella',action:null,color:'#FFD700'},
    {emoji:'💫',label:'Destello',action:null,color:'#C77DFF'},{emoji:'🌠',label:'Estrella Fugaz',action:null,color:'#FFD700'},
    {emoji:'🔭',label:'Telescopio',action:'fun',color:'#4D96FF'},{emoji:'🛸',label:'OVNI Paso',action:null,color:'#00D4C8'},
    {emoji:'🚀',label:'Cohete',action:'fun',color:'#87CEEB'},{emoji:'🛰️',label:'Satélite',action:null,color:'#87CEEB'},
    {emoji:'🌍',label:'Tierra Vista',action:null,color:'#4D96FF'},{emoji:'🌕',label:'Luna Llena',action:null,color:'#FFD700'},
    {emoji:'🌑',label:'Luna Nueva',action:null,color:'#333333'},{emoji:'🌈',label:'Aurora Boreal',action:null,color:'#00D4C8'},
    {emoji:'☁️',label:'Nube',action:null,color:'#FFFFFF'},{emoji:'⛅',label:'Nube Sol',action:null,color:'#FFD700'},
    {emoji:'🌤️',label:'Sol Nube',action:null,color:'#FFD700'},{emoji:'❄️',label:'Copo Nieve',action:null,color:'#00BFFF'},
    {emoji:'🎆',label:'Fuegos Art',action:'fun',color:'#FF4500'},{emoji:'🎇',label:'Bengala',action:'fun',color:'#FFD700'},
    {emoji:'🕯️',label:'Vela',action:null,color:'#FFD700'},{emoji:'🪔',label:'Lámpara',action:null,color:'#FFA07A'},
    {emoji:'🦅',label:'Águila Noche',action:null,color:'#DEB887'},{emoji:'🦉',label:'Búho',action:null,color:'#8B4513'},
    {emoji:'🦇',label:'Murciélago',action:null,color:'#C77DFF'},{emoji:'🐦',label:'Golondrina',action:null,color:'#87CEEB'},
    {emoji:'🌺',label:'Flor Nocturna',action:null,color:'#C77DFF'},{emoji:'🌸',label:'Cerezo Noche',action:null,color:'#FFB3D1'},
    {emoji:'🪴',label:'Planta Décor',action:null,color:'#7CFC00'},{emoji:'🎡',label:'Rueda Fort',action:'fun',color:'#FF6B9D'},
    {emoji:'🎠',label:'Carrusel',action:'fun',color:'#C77DFF'},{emoji:'🎪',label:'Feria',action:'fun',color:'#FF4500'},
    {emoji:'🏮',label:'Farol',action:null,color:'#FF6B6B'},{emoji:'🔮',label:'Bola Cristal',action:'fun',color:'#C77DFF'},
    {emoji:'💎',label:'Diamante',action:null,color:'#00D4C8'},{emoji:'🧊',label:'Cristal Hielo',action:null,color:'#00BFFF'},
    {emoji:'🌊',label:'Ola',action:null,color:'#00BFFF'},{emoji:'🏔️',label:'Montaña',action:null,color:'#87CEEB'},
    {emoji:'🌲',label:'Árbol Noche',action:null,color:'#7CFC00'},{emoji:'🍀',label:'Trébol',action:null,color:'#7CFC00'},
  ],
};

// Completar habitaciones 7-27 con datos similares
const DEFAULT_ROOM_ITEMS: {emoji:string;label:string;action:Need|null;color:string}[] = [
  {emoji:'🌟',label:'Estrella',action:null,color:'#FFD700'},{emoji:'🌙',label:'Luna',action:null,color:'#B8A9FF'},
  {emoji:'🪐',label:'Planeta',action:null,color:'#C77DFF'},{emoji:'🚀',label:'Cohete',action:'fun',color:'#87CEEB'},
  {emoji:'🛸',label:'OVNI',action:'fun',color:'#00D4C8'},{emoji:'🌸',label:'Flor',action:null,color:'#FFB3D1'},
  {emoji:'🌺',label:'Hibisco',action:null,color:'#FF6B9D'},{emoji:'🌻',label:'Girasol',action:null,color:'#FFD700'},
  {emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF'},{emoji:'🐝',label:'Abeja',action:null,color:'#FFD700'},
  {emoji:'🎈',label:'Globo',action:'fun',color:'#FF6B6B'},{emoji:'🎁',label:'Regalo',action:'love',color:'#FF6B9D'},
  {emoji:'🧸',label:'Osito',action:'love',color:'#DEB887'},{emoji:'🍰',label:'Torta',action:'hunger',color:'#FFB3BA'},
  {emoji:'☕',label:'Café',action:'hunger',color:'#8B4513'},{emoji:'🛁',label:'Bañera',action:'bath',color:'#00CED1'},
  {emoji:'🪴',label:'Planta',action:null,color:'#7CFC00'},{emoji:'🕯️',label:'Vela',action:null,color:'#FFD700'},
  {emoji:'🎵',label:'Música',action:'fun',color:'#FF69B4'},{emoji:'📚',label:'Libros',action:'fun',color:'#DEB887'},
  {emoji:'🎮',label:'Juego',action:'fun',color:'#C77DFF'},{emoji:'🪞',label:'Espejo',action:null,color:'#87CEEB'},
  {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D'},{emoji:'💎',label:'Diamante',action:null,color:'#00D4C8'},
  {emoji:'🦚',label:'Pavo Real',action:null,color:'#00CED1'},{emoji:'🦜',label:'Loro',action:'love',color:'#7CFC00'},
  {emoji:'🐱',label:'Gato',action:'love',color:'#FFA07A'},{emoji:'🐶',label:'Perro',action:'love',color:'#DEB887'},
  {emoji:'🌴',label:'Palmera',action:null,color:'#7CFC00'},{emoji:'🌵',label:'Cactus',action:null,color:'#7CFC00'},
  {emoji:'🍓',label:'Frutillas',action:'hunger',color:'#FF4500'},{emoji:'🥗',label:'Ensalada',action:'hunger',color:'#7CFC00'},
  {emoji:'🧁',label:'Cupcake',action:'hunger',color:'#FF69B4'},{emoji:'🍦',label:'Helado',action:'hunger',color:'#FFB3BA'},
  {emoji:'🎀',label:'Lazo',action:null,color:'#FF6B9D'},{emoji:'💐',label:'Flores',action:null,color:'#FF6B9D'},
  {emoji:'🎠',label:'Carrusel',action:'fun',color:'#FFB3D1'},{emoji:'🎡',label:'Rueda Fort',action:'fun',color:'#C77DFF'},
  {emoji:'🎪',label:'Feria',action:'fun',color:'#FF4500'},{emoji:'🏆',label:'Trofeo',action:null,color:'#FFD700'},
  {emoji:'🌊',label:'Fuente',action:'bath',color:'#00BFFF'},{emoji:'⭐',label:'Estrella Nov',action:null,color:'#FFD700'},
];

// Habitaciones especializadas 7-27
const SPECIAL_ROOMS: Record<number,{emoji:string;label:string;action:Need|null;color:string}[]> = {
  7: [ // Laboratorio
    ...DEFAULT_ROOM_ITEMS.slice(0,20),
    {emoji:'🔬',label:'Microscopio',action:'fun',color:'#4D96FF'},{emoji:'🧪',label:'Probeta',action:null,color:'#00D4C8'},
    {emoji:'🧫',label:'Cultivo',action:null,color:'#7CFC00'},{emoji:'🔭',label:'Telescopio',action:'fun',color:'#4D96FF'},
    {emoji:'📡',label:'Antena',action:null,color:'#87CEEB'},{emoji:'💻',label:'Laptop',action:'fun',color:'#87CEEB'},
    {emoji:'🤖',label:'Robot',action:'fun',color:'#00D4C8'},{emoji:'⚗️',label:'Alambique',action:null,color:'#C77DFF'},
    {emoji:'🧲',label:'Imán',action:'fun',color:'#FF6B6B'},{emoji:'💡',label:'Idea',action:null,color:'#FFD700'},
    {emoji:'🔋',label:'Energía',action:null,color:'#7CFC00'},{emoji:'⚙️',label:'Engranaje',action:null,color:'#87CEEB'},
    {emoji:'🔩',label:'Tornillo',action:null,color:'#87CEEB'},{emoji:'🧰',label:'Caja Herram',action:null,color:'#FF6B6B'},
    {emoji:'🏔️',label:'Muestra Roca',action:null,color:'#87CEEB'},{emoji:'🦋',label:'Colección',action:null,color:'#C77DFF'},
    {emoji:'🐝',label:'Colmena',action:null,color:'#FFD700'},{emoji:'🌱',label:'Planta Exp',action:null,color:'#7CFC00'},
    {emoji:'🌊',label:'Agua',action:'bath',color:'#00BFFF'},{emoji:'☀️',label:'Luz Solar',action:null,color:'#FFD700'},
    {emoji:'❄️',label:'Hielo',action:null,color:'#00BFFF'},{emoji:'🔥',label:'Fuego Cont',action:null,color:'#FF4500'},
  ],
  8: [ // Baño Estelar
    {emoji:'🛁',label:'Bañera Galáct',action:'bath',color:'#00CED1'},{emoji:'🚿',label:'Ducha',action:'bath',color:'#87CEEB'},
    {emoji:'🧼',label:'Jabón',action:'bath',color:'#FFB3BA'},{emoji:'🧴',label:'Shampoo',action:'bath',color:'#C77DFF'},
    {emoji:'🪥',label:'Cepillo',action:'bath',color:'#4D96FF'},{emoji:'🧽',label:'Esponja',action:'bath',color:'#FFD700'},
    {emoji:'🪒',label:'Afeitadora',action:'bath',color:'#87CEEB'},{emoji:'🧹',label:'Escoba',action:'bath',color:'#FFA07A'},
    {emoji:'🪣',label:'Balde',action:'bath',color:'#00BFFF'},{emoji:'🌊',label:'Ola',action:'bath',color:'#00BFFF'},
    {emoji:'🐳',label:'Ballena Toy',action:'bath',color:'#87CEEB'},{emoji:'🦆',label:'Patito Goma',action:'bath',color:'#FFD700'},
    {emoji:'🐠',label:'Pez Toy',action:'bath',color:'#FF6B9D'},{emoji:'🐬',label:'Delfín Toy',action:'bath',color:'#87CEEB'},
    {emoji:'🌺',label:'Flor Dec',action:null,color:'#FF6B9D'},{emoji:'🪴',label:'Planta Baño',action:null,color:'#7CFC00'},
    {emoji:'🕯️',label:'Vela Aroma',action:null,color:'#FFD700'},{emoji:'🌸',label:'Pétalos',action:null,color:'#FFB3D1'},
    {emoji:'💆',label:'Relajación',action:'love',color:'#A8EDEA'},{emoji:'🧘',label:'Meditación',action:'love',color:'#C77DFF'},
    {emoji:'🪞',label:'Espejo',action:null,color:'#87CEEB'},{emoji:'🧺',label:'Canasta',action:null,color:'#DEB887'},
    {emoji:'🌈',label:'Arcoíris Agua',action:null,color:'#FF6B9D'},{emoji:'⭐',label:'Estrella Agua',action:null,color:'#FFD700'},
    {emoji:'💎',label:'Diamante',action:null,color:'#00D4C8'},{emoji:'🧊',label:'Hielo',action:null,color:'#00BFFF'},
    {emoji:'🌊',label:'Fuente',action:'bath',color:'#00BFFF'},{emoji:'🫧',label:'Burbujas',action:'bath',color:'#87CEEB'},
    {emoji:'🌿',label:'Aloe',action:null,color:'#7CFC00'},{emoji:'🍃',label:'Menta',action:null,color:'#7CFC00'},
    {emoji:'🌻',label:'Girasol',action:null,color:'#FFD700'},{emoji:'🌷',label:'Tulipán',action:null,color:'#FF69B4'},
    {emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF'},{emoji:'🎵',label:'Música Relax',action:'fun',color:'#FF69B4'},
    {emoji:'☁️',label:'Nube Vapor',action:null,color:'#FFFFFF'},{emoji:'🌙',label:'Luna Relax',action:null,color:'#B8A9FF'},
    {emoji:'🌟',label:'Estrella Relax',action:null,color:'#FFD700'},{emoji:'🪷',label:'Loto',action:null,color:'#FFB3D1'},
    {emoji:'🧁',label:'Cupcake Spa',action:'hunger',color:'#FF69B4'},{emoji:'🍓',label:'Frutillas',action:'hunger',color:'#FF4500'},
    {emoji:'☕',label:'Té Relajante',action:'hunger',color:'#8B4513'},{emoji:'🫖',label:'Infusión',action:'hunger',color:'#7CFC00'},
  ],
};
// Los demás rooms usan DEFAULT_ROOM_ITEMS con variaciones
for (let i = 0; i < 28; i++) {
  if (!FURNITURE_BY_ROOM[i] && !SPECIAL_ROOMS[i]) {
    SPECIAL_ROOMS[i] = DEFAULT_ROOM_ITEMS;
  }
}
const getRoomItems = (roomId: number) => FURNITURE_BY_ROOM[roomId] || SPECIAL_ROOMS[roomId] || DEFAULT_ROOM_ITEMS;

/* ══ PERSONAJES SUPERSÓNICOS ══ */
const CHARS_DEF = [
  { name:'George', emoji:'👨‍💼', color:'#4D96FF', hair:0, top:0, acc:0 },
  { name:'Jane',   emoji:'👩‍🦰', color:'#FF6B9D', hair:1, top:1, acc:1 },
  { name:'Judy',   emoji:'👧‍🦰', color:'#C77DFF', hair:2, top:2, acc:2 },
  { name:'Elroy',  emoji:'👦',  color:'#7CFC00', hair:3, top:3, acc:3 },
];
const HAIR_OPTS   = ['👱','🧑‍🦱','👩‍🦰','🧑‍🦲','👩‍🦳','🧑‍🦱','👱‍♀️','🧑'];
const TOP_OPTS    = ['👔','👗','🧥','👕','🎽','🥻','👘','🦺'];
const ACC_OPTS    = ['🎩','👑','🌸','⭐','🎀','🕶️','🌙','💫'];

const NEED_ICONS: Record<Need,string>  = { hunger:'🍕', sleep:'💤', fun:'🎮', bath:'🛁', love:'💖' };
const NEED_LABELS: Record<Need,string> = { hunger:'Hambre', sleep:'Sueño', fun:'Diversión', bath:'Baño', love:'Amor' };
const NEED_SOUNDS: Record<Need,()=>void> = {
  hunger: () => melody([523,659,784,1047]),
  sleep:  () => melody([392,330,262]),
  fun:    () => melody([523,659,784,880,1047]),
  bath:   () => sweep(400,800,0.4),
  love:   () => melody([659,784,880,1047,880,784,659]),
};
const MOOD_BUBBLE: Record<CharMood,string> = {
  happy:'😊 ¡Qué feliz!', neutral:'😐 Hmm...', sad:'😢 Necesito algo', 
  excited:'🤩 ¡Yay!', sleepy:'😴 Tengo sueño', clean:'✨ ¡Limpio!'
};

function calcMood(needs: Record<Need,number>): CharMood {
  const avg = Object.values(needs).reduce((a,b)=>a+b,0)/5;
  if (needs.sleep < 20) return 'sleepy';
  if (avg > 80) return 'happy';
  if (avg > 60) return 'excited';
  if (avg < 30) return 'sad';
  return 'neutral';
}

export default function Mundo3() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);

  /* ══ STATE ══ */
  const [room, setRoom] = useState(0);
  const [showRoomMap, setShowRoomMap] = useState(false);
  const [chars, setChars] = useState<Character[]>(() =>
    CHARS_DEF.map((c,i) => ({
      id:i, name:c.name, emoji:c.emoji, color:c.color,
      x:15+i*20, y:50, layer:'mid', zIndex:10+i,
      needs:{ hunger:80, sleep:80, fun:80, bath:80, love:80 },
      mood:'happy', bubble:'', bubbleTimer:0,
      hair:c.hair, top:c.top, acc:c.acc,
      dragging:false, scale:1,
    }))
  );
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedChar, setSelectedChar] = useState<number|null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [tab, setTab] = useState<'chars'|'furniture'|'customize'>('chars');
  const [comboMsg, setComboMsg] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [furniturePage, setFurniturePage] = useState(0);

  const draggingCharId = useRef<number|null>(null);
  const draggingFurnId = useRef<number|null>(null);
  const dragOff = useRef({x:0,y:0});
  const maxZ = useRef(50);
  const needTimer = useRef<ReturnType<typeof setInterval>|null>(null);

  /* ══ NEEDS DECAY ══ */
  useEffect(() => {
    needTimer.current = setInterval(() => {
      setChars(prev => prev.map(ch => {
        const needs = { ...ch.needs };
        needs.hunger = Math.max(0, needs.hunger - r(0.3,0.7));
        needs.sleep  = Math.max(0, needs.sleep  - r(0.2,0.5));
        needs.fun    = Math.max(0, needs.fun    - r(0.25,0.6));
        needs.bath   = Math.max(0, needs.bath   - r(0.15,0.4));
        needs.love   = Math.max(0, needs.love   - r(0.2,0.45));
        return { ...ch, needs, mood:calcMood(needs) };
      }));
    }, 2000);
    return () => { if (needTimer.current) clearInterval(needTimer.current); };
  }, []);

  /* ══ LOAD FURNITURE FOR ROOM ══ */
  useEffect(() => {
    const items = getRoomItems(room);
    setFurniture(items.map((item,i) => ({
      id: uid++, emoji:item.emoji, label:item.label, action:item.action,
      x: 5 + (i % 8)*11.5, y: 10 + Math.floor(i/8)*22,
      layer:'back', zIndex:i+1, dragging:false, scale:1,
      room, color:item.color, sz:38,
    })));
    setFurniturePage(0);
  }, [room]);

  /* ══ FEED/INTERACT ══ */
  const interact = useCallback((charId: number, action: Need) => {
    setChars(prev => prev.map(ch => {
      if (ch.id !== charId) return ch;
      const needs = { ...ch.needs, [action]: Math.min(100, ch.needs[action]+30) };
      const mood = calcMood(needs);
      const bubble = MOOD_BUBBLE[mood];
      NEED_SOUNDS[action]();
      vib([30,15,30]);
      // Particles
      for (let i=0;i<8;i++) setTimeout(()=>{
        const pe: Particle[] = [{id:uid++, x:r(20,80)*window.innerWidth/100, y:r(30,70)*window.innerHeight/100, e:NEED_ICONS[action]}];
        setParticles(p=>[...p,...pe]);
        setTimeout(()=>setParticles(p=>p.filter(pp=>!pe.find(x=>x.id===pp.id))),800);
      },i*60);
      return { ...ch, needs, mood, bubble, bubbleTimer:Date.now()+3000 };
    }));
    setComboMsg(`${NEED_ICONS[action]} ¡${NEED_LABELS[action]} satisfecho!`);
    setShowCombo(true);
    setTimeout(()=>setShowCombo(false),2500);
  },[]);

  /* ══ DROP FURNITURE ON CHAR ══ */
  const onFurnUp = useCallback((e: React.PointerEvent, furnId: number) => {
    if (draggingFurnId.current !== furnId) return;
    draggingFurnId.current = null;
    const furn = furniture.find(f=>f.id===furnId);
    if (!furn || !furn.action) { setFurniture(prev=>prev.map(f=>f.id===furnId?{...f,dragging:false,scale:1}:f)); return; }
    const wr = worldRef.current!.getBoundingClientRect();
    const fx = ((e.clientX-wr.left)/wr.width)*100;
    const fy = ((e.clientY-wr.top)/wr.height)*100;
    // Check if dropped on a character
    const target = chars.find(ch => Math.abs(ch.x-fx)<12 && Math.abs(ch.y-fy)<15);
    if (target) {
      interact(target.id, furn.action);
    }
    setFurniture(prev=>prev.map(f=>f.id===furnId?{...f,dragging:false,scale:1}:f));
  },[furniture,chars,interact]);

  /* ══ CHAR DRAG ══ */
  const onCharDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingCharId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const ch = chars.find(c=>c.id===id)!;
    dragOff.current = { x:e.clientX-wr.left-(ch.x/100)*wr.width, y:e.clientY-wr.top-(ch.y/100)*wr.height };
    setChars(prev=>prev.map(c=>c.id===id?{...c,dragging:true,zIndex:maxZ.current,scale:1.15}:c));
    note(ri(400,700),0.12,0.15); vib(15);
  },[chars]);

  const onCharMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current!==id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setChars(prev=>prev.map(c=>c.id===id?{...c,x:Math.max(2,Math.min(88,nx)),y:Math.max(5,Math.min(80,ny))}:c));
  },[]);

  const onCharUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current!==id) return;
    draggingCharId.current = null;
    setChars(prev=>prev.map(c=>c.id===id?{...c,dragging:false,scale:1}:c));
    note(ri(300,500),0.15,0.12); vib(10);
  },[]);

  /* ══ FURN DRAG ══ */
  const onFurnDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingFurnId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const furn = furniture.find(f=>f.id===id)!;
    dragOff.current = { x:e.clientX-wr.left-(furn.x/100)*wr.width, y:e.clientY-wr.top-(furn.y/100)*wr.height };
    setFurniture(prev=>prev.map(f=>f.id===id?{...f,dragging:true,zIndex:maxZ.current,scale:1.2}:f));
    note(ri(300,600),0.1,0.12); vib(12);
  },[furniture]);

  const onFurnMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingFurnId.current!==id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setFurniture(prev=>prev.map(f=>f.id===id?{...f,x:Math.max(0,Math.min(90,nx)),y:Math.max(0,Math.min(80,ny))}:f));
  },[]);

  const currentRoom = ROOMS[room];
  const roomItems = getRoomItems(room);
  const PAGE_SIZE = 12;
  const furnPage = roomItems.slice(furniturePage*PAGE_SIZE, (furniturePage+1)*PAGE_SIZE);
  const totalPages = Math.ceil(roomItems.length/PAGE_SIZE);

  return (
    <div ref={worldRef} style={{
      width:'100vw', height:'100vh', overflow:'hidden', position:'relative',
      touchAction:'none', fontFamily:'system-ui,sans-serif',
      background:currentRoom.bg,
      transition:'background 0.5s ease',
    }}>

      {/* BG Stars */}
      {useMemo(()=>Array.from({length:80},(_,i)=>(
        <div key={i} style={{ position:'absolute', borderRadius:'50%', pointerEvents:'none', zIndex:1,
          width:`${r(1,2.5)}px`, height:`${r(1,2.5)}px`,
          background:i%5===0?currentRoom.accent:'white',
          opacity:r(.05,.7), top:`${r(0,92)}%`, left:`${r(0,100)}%`,
          animation:`tw${i%4} ${r(2,5)}s ${r(0,4)}s infinite` }}/>
      )),[room])}

      {/* FLOOR LINE */}
      <div style={{ position:'absolute', bottom:'18%', left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${currentRoom.accent}44,transparent)`, zIndex:2, pointerEvents:'none' }}/>

      {/* FURNITURE (back layer) */}
      {furniture.filter(f=>f.layer==='back').map(furn=>(
        <div key={furn.id}
          onPointerDown={e=>onFurnDown(e,furn.id)}
          onPointerMove={e=>onFurnMove(e,furn.id)}
          onPointerUp={e=>onFurnUp(e,furn.id)}
          style={{ position:'absolute', left:`${furn.x}%`, top:`${furn.y}%`,
            fontSize:furn.sz, lineHeight:1, touchAction:'none', userSelect:'none',
            zIndex:furn.dragging?80:furn.zIndex,
            cursor:furn.dragging?'grabbing':'grab',
            transform:`scale(${furn.scale})`,
            transition:furn.dragging?'none':'transform .15s',
            filter:`drop-shadow(0 4px 12px ${furn.color}88)`,
            animation:furn.dragging?'none':`objF${furn.id%6} ${3+furn.id*.2}s ease-in-out infinite`,
          }}>{furn.emoji}</div>
      ))}

      {/* CHARACTERS */}
      {chars.map(ch=>{
        const showBubble = ch.bubbleTimer > Date.now();
        const critNeed = (Object.entries(ch.needs) as [Need,number][]).find(([,v])=>v<25);
        return (
          <div key={ch.id} style={{ position:'absolute', left:`${ch.x}%`, top:`${ch.y}%`,
            zIndex:ch.dragging?90:ch.zIndex, touchAction:'none',
            transition:ch.dragging?'none':'left .3s,top .3s',
          }}>
            {/* Speech bubble */}
            {(showBubble||critNeed) && (
              <div style={{ position:'absolute', bottom:'105%', left:'50%', transform:'translateX(-50%)',
                background:'rgba(255,255,255,.95)', borderRadius:16, padding:'6px 12px',
                fontSize:11, fontWeight:700, color:'#222', whiteSpace:'nowrap',
                boxShadow:'0 4px 16px rgba(0,0,0,.3)', zIndex:95, pointerEvents:'none',
                animation:'bubblePop .3s ease-out',
              }}>
                {showBubble ? ch.bubble : `${NEED_ICONS[critNeed![0]]} ¡${NEED_LABELS[critNeed![0]]}!`}
                <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',
                  width:0,height:0,borderLeft:'6px solid transparent',borderRight:'6px solid transparent',
                  borderTop:'7px solid rgba(255,255,255,.95)'}}/>
              </div>
            )}
            {/* Needs bars */}
            <div style={{ position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)',
              display:'flex', gap:2, marginBottom:2, opacity:selectedChar===ch.id?1:0,
              transition:'opacity .2s',
            }}>
              {(Object.entries(ch.needs) as [Need,number][]).map(([need,val])=>(
                <div key={need} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                  <div style={{ fontSize:8 }}>{NEED_ICONS[need]}</div>
                  <div style={{ width:4, height:24, background:'rgba(255,255,255,.2)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:'100%', height:`${val}%`, background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',
                      borderRadius:2, transition:'height .5s', marginTop:'auto' }}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Character body */}
            <div
              onPointerDown={e=>{ onCharDown(e,ch.id); setSelectedChar(ch.id); }}
              onPointerMove={e=>onCharMove(e,ch.id)}
              onPointerUp={e=>onCharUp(e,ch.id)}
              style={{ cursor:ch.dragging?'grabbing':'grab', userSelect:'none',
                display:'flex', flexDirection:'column', alignItems:'center',
                transform:`scale(${ch.scale})`, transition:'transform .2s',
                filter:`drop-shadow(0 0 ${ch.dragging?20:10}px ${ch.color})`,
                animation:ch.dragging?'none':ch.mood==='happy'?`charHappy .8s ease-in-out infinite alternate`:
                  ch.mood==='excited'?'charExcited .4s ease-in-out infinite alternate':
                  ch.mood==='sleepy'?'charSleepy 3s ease-in-out infinite':'charFloat 2.5s ease-in-out infinite alternate',
              }}>
              <div style={{fontSize:10, lineHeight:1}}>{ACC_OPTS[ch.acc]}</div>
              <div style={{fontSize:28, lineHeight:1}}>{ch.emoji}</div>
              <div style={{fontSize:9, lineHeight:1, marginTop:-2}}>{TOP_OPTS[ch.top]}</div>
              <div style={{fontSize:9, fontWeight:700, color:'white', textShadow:'0 1px 4px rgba(0,0,0,.8)',
                background:ch.color+'44', borderRadius:8, padding:'1px 6px', marginTop:2}}>
                {ch.name}
              </div>
            </div>
          </div>
        );
      })}

      {/* FURNITURE (front layer) */}
      {furniture.filter(f=>f.layer==='front').map(furn=>(
        <div key={furn.id}
          onPointerDown={e=>onFurnDown(e,furn.id)}
          onPointerMove={e=>onFurnMove(e,furn.id)}
          onPointerUp={e=>onFurnUp(e,furn.id)}
          style={{ position:'absolute', left:`${furn.x}%`, top:`${furn.y}%`,
            fontSize:furn.sz, lineHeight:1, touchAction:'none', userSelect:'none',
            zIndex:furn.dragging?80:furn.zIndex+40,
            cursor:furn.dragging?'grabbing':'grab',
            transform:`scale(${furn.scale})`,
            transition:furn.dragging?'none':'transform .15s',
            filter:`drop-shadow(0 6px 16px ${furn.color}88)`,
          }}>{furn.emoji}</div>
      ))}

      {/* Particles */}
      {particles.map(p=>(
        <div key={p.id} style={{ position:'absolute', left:p.x, top:p.y,
          fontSize:ri(20,32), pointerEvents:'none', zIndex:100, lineHeight:1,
          animation:'burstP .9s ease-out forwards' }}>{p.e}</div>
      ))}

      {/* Combo message */}
      {showCombo && (
        <div style={{ position:'absolute', top:'25%', left:'50%', transform:'translateX(-50%)', zIndex:110,
          textAlign:'center', animation:'comboIn .4s ease-out', pointerEvents:'none' }}>
          <div style={{ fontSize:18, fontWeight:800, color:'white',
            background:'rgba(0,0,0,.7)', borderRadius:24, padding:'12px 24px',
            backdropFilter:'blur(14px)', boxShadow:`0 0 40px ${currentRoom.accent}88` }}>
            {comboMsg}
          </div>
        </div>
      )}

      {/* ROOM MAP MODAL */}
      {showRoomMap && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.85)', zIndex:200,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(12px)', padding:16, overflowY:'auto' }}>
          <div style={{ fontSize:18, fontWeight:800, color:'white', marginBottom:16 }}>🏠 Elige Habitación</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, maxWidth:480, width:'100%' }}>
            {ROOMS.map(rm=>(
              <div key={rm.id} onClick={()=>{ setRoom(rm.id); setShowRoomMap(false); note(523,0.2,0.2); }}
                style={{ background:rm.id===room?`${rm.accent}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${rm.id===room?rm.accent:'rgba(255,255,255,.15)'}`,
                  borderRadius:12, padding:'8px 4px', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  transition:'all .2s',
                }}>
                <div style={{fontSize:22}}>{rm.emoji}</div>
                <div style={{fontSize:9, color:'white', textAlign:'center', lineHeight:1.2}}>{rm.name}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowRoomMap(false)}
            style={{ marginTop:16, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
              borderRadius:50, padding:'8px 24px', color:'white', cursor:'pointer', fontSize:14 }}>
            Cerrar
          </button>
        </div>
      )}

      {/* CUSTOMIZE MODAL */}
      {showCustomize && selectedChar!==null && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.8)', zIndex:195,
          display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)' }}>
          <div style={{ background:'rgba(20,10,40,.95)', borderRadius:24, padding:20, maxWidth:340, width:'90%',
            border:`1.5px solid ${chars[selectedChar]?.color||'#B8A9FF'}44` }}>
            <div style={{ fontSize:16, fontWeight:800, color:'white', marginBottom:12, textAlign:'center' }}>
              ✨ Personalizar {chars[selectedChar]?.name}
            </div>
            {(['hair','top','acc'] as const).map(attr=>(
              <div key={attr} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:6 }}>
                  {attr==='hair'?'Pelo':attr==='top'?'Ropa':'Accesorio'}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(attr==='hair'?HAIR_OPTS:attr==='top'?TOP_OPTS:ACC_OPTS).map((opt,i)=>(
                    <div key={i} onClick={()=>{
                      setChars(prev=>prev.map(c=>c.id===selectedChar?{...c,[attr]:i}:c));
                      note(ri(600,900),0.15,0.15); vib(10);
                    }}
                      style={{ fontSize:22, cursor:'pointer', padding:4, borderRadius:8,
                        background:chars[selectedChar]?.[attr]===i?`${chars[selectedChar].color}33`:'transparent',
                        border:chars[selectedChar]?.[attr]===i?`1.5px solid ${chars[selectedChar].color}`:'1.5px solid transparent',
                        transition:'all .15s',
                      }}>{opt}</div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>setShowCustomize(false)}
              style={{ width:'100%', marginTop:8, background:'rgba(255,255,255,.1)', border:'none',
                borderRadius:12, padding:'10px', color:'white', cursor:'pointer', fontSize:14, fontWeight:700 }}>
              ✅ Listo
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex',
        justifyContent:'space-between', alignItems:'center',
        padding:'8px 12px', zIndex:60,
        background:'rgba(0,0,0,.4)', backdropFilter:'blur(10px)' }}>
        <button onClick={()=>router.push('/')}
          style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
            borderRadius:50, padding:'6px 14px', fontSize:12, color:'white', cursor:'pointer' }}>
          ← Inicio
        </button>
        <button onClick={()=>setShowRoomMap(true)}
          style={{ background:`${currentRoom.accent}22`, border:`1px solid ${currentRoom.accent}66`,
            borderRadius:50, padding:'6px 16px', fontSize:13, fontWeight:700, color:'white', cursor:'pointer',
            display:'flex', alignItems:'center', gap:6 }}>
          {currentRoom.emoji} {currentRoom.name} ▾
        </button>
        <button onClick={()=>{ if(selectedChar!==null) setShowCustomize(true); }}
          style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
            borderRadius:50, padding:'6px 14px', fontSize:12, color:'white', cursor:'pointer',
            opacity:selectedChar!==null?1:0.4 }}>
          ✨ Cambiar
        </button>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:60,
        background:'rgba(4,6,28,.92)', backdropFilter:'blur(16px)',
        borderTop:'1px solid rgba(255,255,255,.1)', padding:'8px 12px 12px' }}>

        {/* TABS */}
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:8 }}>
          {[
            {id:'chars',icon:'👨‍👩‍👧‍👦',label:'Personas'},
            {id:'furniture',icon:'🛋️',label:'Objetos'},
            {id:'customize',icon:'✨',label:'Personalizar'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              style={{ background:tab===t.id?`${currentRoom.accent}33`:'rgba(255,255,255,.07)',
                border:tab===t.id?`2px solid ${currentRoom.accent}`:'1px solid rgba(255,255,255,.15)',
                borderRadius:50, padding:'6px 14px', fontSize:12, fontWeight:tab===t.id?700:400,
                color:'white', cursor:'pointer', transition:'all .2s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* CHARS TAB — needs per person */}
        {tab==='chars' && (
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {chars.map(ch=>(
              <div key={ch.id} onClick={()=>setSelectedChar(selectedChar===ch.id?null:ch.id)}
                style={{ background:selectedChar===ch.id?`${ch.color}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${selectedChar===ch.id?ch.color:'rgba(255,255,255,.15)'}`,
                  borderRadius:14, padding:'8px 10px', cursor:'pointer', flexShrink:0,
                  minWidth:90, textAlign:'center', transition:'all .2s' }}>
                <div style={{fontSize:24}}>{ch.emoji}</div>
                <div style={{fontSize:10, color:'white', fontWeight:700, marginBottom:4}}>{ch.name}</div>
                <div style={{display:'flex',gap:3,justifyContent:'center'}}>
                  {(Object.entries(ch.needs) as [Need,number][]).map(([need,val])=>(
                    <div key={need} title={NEED_LABELS[need]}
                      style={{ width:3, height:16, background:'rgba(255,255,255,.15)', borderRadius:2, overflow:'hidden', position:'relative' }}>
                      <div style={{ position:'absolute', bottom:0, width:'100%', height:`${val}%`,
                        background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',
                        borderRadius:2, transition:'height .5s' }}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {selectedChar !== null && (
              <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:4 }}>
                <div style={{fontSize:10,color:'rgba(255,255,255,.5)',marginBottom:2}}>Arrastrá objetos a {chars[selectedChar].name}</div>
                {(Object.entries(chars[selectedChar].needs) as [Need,number][]).map(([need,val])=>(
                  <div key={need} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px',
                    background:'rgba(255,255,255,.07)', borderRadius:10,
                    border:`1px solid ${val<30?'#FF6B6B':val<60?'#FFD700':'rgba(255,255,255,.1)'}` }}>
                    <span style={{fontSize:14}}>{NEED_ICONS[need]}</span>
                    <div style={{ flex:1, height:6, background:'rgba(255,255,255,.15)', borderRadius:3, minWidth:50 }}>
                      <div style={{ height:'100%', width:`${val}%`, background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B', borderRadius:3, transition:'width .5s' }}/>
                    </div>
                    <button onClick={()=>interact(selectedChar,need)}
                      style={{ fontSize:11, background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, padding:'3px 8px', color:'white', cursor:'pointer' }}>
                      +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FURNITURE TAB */}
        {tab==='furniture' && (
          <div>
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, alignItems:'center' }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap', minWidth:70 }}>
                🏠 Arrastrá al cuarto
              </div>
              <div style={{ display:'flex', gap:6, flex:1, overflowX:'auto' }}>
                {furnPage.map(item=>(
                  <div key={item.label}
                    style={{ fontSize:32, flexShrink:0, cursor:'grab', filter:`drop-shadow(0 2px 6px ${item.color}88)`,
                      animation:`objF${ri(0,6)} ${r(2,4)}s ease-in-out infinite` }}
                    title={item.label}>{item.emoji}</div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:6 }}>
              <button onClick={()=>setFurniturePage(p=>Math.max(0,p-1))} disabled={furniturePage===0}
                style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
                  borderRadius:20, padding:'4px 12px', color:'white', cursor:'pointer', fontSize:12,
                  opacity:furniturePage===0?0.4:1 }}>◀</button>
              <span style={{fontSize:11,color:'rgba(255,255,255,.4)',alignSelf:'center'}}>
                {furniturePage+1}/{totalPages}
              </span>
              <button onClick={()=>setFurniturePage(p=>Math.min(totalPages-1,p+1))} disabled={furniturePage===totalPages-1}
                style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
                  borderRadius:20, padding:'4px 12px', color:'white', cursor:'pointer', fontSize:12,
                  opacity:furniturePage===totalPages-1?0.4:1 }}>▶</button>
            </div>
          </div>
        )}

        {/* CUSTOMIZE TAB */}
        {tab==='customize' && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Seleccioná un personaje ↑ y toca ✨ arriba</div>
            <div style={{ display:'flex', gap:6 }}>
              {chars.map(ch=>(
                <div key={ch.id} onClick={()=>{ setSelectedChar(ch.id); setShowCustomize(true); }}
                  style={{ fontSize:28, cursor:'pointer', filter:`drop-shadow(0 0 8px ${ch.color})` }}>
                  {ch.emoji}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.1}50%{opacity:.9}}
        @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.05}}
        @keyframes tw2{0%,100%{opacity:.4}33%{opacity:.85}66%{opacity:.05}}
        @keyframes tw3{0%,100%{opacity:.55}50%{opacity:.08}}
        @keyframes charFloat{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}
        @keyframes charHappy{0%{transform:translateY(0) rotate(-5deg)}100%{transform:translateY(-10px) rotate(5deg)}}
        @keyframes charExcited{0%{transform:scale(1) rotate(-8deg)}100%{transform:scale(1.1) rotate(8deg)}}
        @keyframes charSleepy{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(4px) rotate(3deg)}}
        @keyframes objF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes objF1{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes objF2{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
        @keyframes objF3{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
        @keyframes objF4{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-5px) rotate(3deg)}}
        @keyframes objF5{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.04) rotate(-5deg)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.5) translateY(0)}100%{opacity:0;transform:scale(2.5) translateY(-80px)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.3)}70%{opacity:1;transform:translateX(-50%) scale(1.08)}100%{transform:translateX(-50%) scale(1)}}
        @keyframes bubblePop{0%{opacity:0;transform:translateX(-50%) scale(.6)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
