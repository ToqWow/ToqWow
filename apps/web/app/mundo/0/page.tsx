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
const melody = (fs: number[], gap = 90, d = 0.32, v = 0.18) => fs.forEach((f,i) => setTimeout(() => note(f,d,v), i*gap));
const sweep = (f1: number, f2: number, d = 0.4, v = 0.2) => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.setValueAtTime(f1,c.currentTime); o.frequency.exponentialRampToValueAtTime(f2,c.currentTime+d); g.gain.setValueAtTime(v,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d); o.start(); o.stop(c.currentTime+d); } catch {}
};
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };
const r  = (a: number, b: number) => a + Math.random()*(b-a);
const ri = (a: number, b: number) => Math.floor(r(a,b));
let uid = 1000;

/* ══ TYPES ══ */
type Need  = 'hunger'|'sleep'|'fun'|'bath'|'love';
type Layer = 'back'|'mid'|'front';
type Mood  = 'happy'|'neutral'|'excited'|'sleepy'|'sad';
type BrushType = 'round'|'flat'|'fan'|'splatter'|'glow'|'rainbow'|'eraser'|'stamp';

interface Citizen {
  id:number; name:string; emoji:string; color:string;
  x:number; y:number; layer:Layer; zIndex:number;
  needs:Record<Need,number>; mood:Mood;
  bubble:string; bubbleTimer:number;
  hair:number; suit:number; acc:number;
  dragging:boolean; scale:number;
}
interface BuildingItem {
  id:number; emoji:string; label:string;
  x:number; y:number; sz:number; color:string;
  layer:Layer; zIndex:number; dragging:boolean; scale:number;
  action:Need|null; district:number;
}
type Sticker  = {id:number; emoji:string; x:number; y:number; sz:number; rotation:number;};
type Particle = {id:number; x:number; y:number; e:string;};

/* ══ 28 DISTRITOS — ciudad flotante futurista ══ */
const DISTRICTS = [
  {id:0,  name:'Plaza Central',        emoji:'🏙️',  bg:'linear-gradient(180deg,#020b2e 0%,#061855 40%,#042255 70%,#030d30 100%)', sky:'#061855', accent:'#00D4C8'},
  {id:1,  name:'Puerto Espacial',      emoji:'🚀',  bg:'linear-gradient(180deg,#020020 0%,#040040 40%,#020030 70%,#010018 100%)', sky:'#040040', accent:'#B8A9FF'},
  {id:2,  name:'Barrio de las Torres', emoji:'🗼',  bg:'linear-gradient(180deg,#001020 0%,#002040 40%,#001830 70%,#000a18 100%)', sky:'#002040', accent:'#87CEEB'},
  {id:3,  name:'Jardines Orbitales',   emoji:'🌸',  bg:'linear-gradient(180deg,#080018 0%,#160030 40%,#0e0025 70%,#050012 100%)', sky:'#160030', accent:'#FFB3D1'},
  {id:4,  name:'Centro Comercial',     emoji:'🛒',  bg:'linear-gradient(180deg,#001808 0%,#003018 40%,#002010 70%,#000c08 100%)', sky:'#003018', accent:'#7CFC00'},
  {id:5,  name:'Aeropuerto Galáctico', emoji:'✈️',  bg:'linear-gradient(180deg,#001520 0%,#002a3a 40%,#001e2a 70%,#000a12 100%)', sky:'#002a3a', accent:'#00BFFF'},
  {id:6,  name:'Distrito Dorado',      emoji:'✨',  bg:'linear-gradient(180deg,#150f00 0%,#2a1e00 40%,#1e1500 70%,#0c0a00 100%)', sky:'#2a1e00', accent:'#FFD700'},
  {id:7,  name:'Torre de Cristal',     emoji:'💎',  bg:'linear-gradient(180deg,#050015 0%,#0a0030 40%,#070020 70%,#030010 100%)', sky:'#0a0030', accent:'#00D4C8'},
  {id:8,  name:'Parque Galáctico',     emoji:'🌳',  bg:'linear-gradient(180deg,#001200 0%,#002600 40%,#001a00 70%,#000a00 100%)', sky:'#002600', accent:'#98FF98'},
  {id:9,  name:'Bahía de Cohetes',     emoji:'🚀',  bg:'linear-gradient(180deg,#020010 0%,#050025 40%,#030018 70%,#01000c 100%)', sky:'#050025', accent:'#FF6B9D'},
  {id:10, name:'Isla Flotante',        emoji:'🏝️',  bg:'linear-gradient(180deg,#000a15 0%,#00152a 40%,#000e1e 70%,#000508 100%)', sky:'#00152a', accent:'#FFD700'},
  {id:11, name:'Cúpula del Saber',     emoji:'🔭',  bg:'linear-gradient(180deg,#080010 0%,#100020 40%,#0c0018 70%,#040008 100%)', sky:'#100020', accent:'#C77DFF'},
  {id:12, name:'Estadio Estelar',      emoji:'🏟️',  bg:'linear-gradient(180deg,#100000 0%,#200000 40%,#180000 70%,#080000 100%)', sky:'#200000', accent:'#FF6B6B'},
  {id:13, name:'Spa Orbital',          emoji:'💆',  bg:'linear-gradient(180deg,#000a10 0%,#001520 40%,#000e18 70%,#000508 100%)', sky:'#001520', accent:'#A8EDEA'},
  {id:14, name:'Mercado de Robots',    emoji:'🤖',  bg:'linear-gradient(180deg,#050510 0%,#0a0a20 40%,#080818 70%,#020208 100%)', sky:'#0a0a20', accent:'#00D4C8'},
  {id:15, name:'Galería de Arte',      emoji:'🖼️',  bg:'linear-gradient(180deg,#0f0510 0%,#200a20 40%,#180818 70%,#080308 100%)', sky:'#200a20', accent:'#FF69B4'},
  {id:16, name:'Universidad Cósmica',  emoji:'🎓',  bg:'linear-gradient(180deg,#080800 0%,#151500 40%,#101000 70%,#050500 100%)', sky:'#151500', accent:'#FFD700'},
  {id:17, name:'Hospital Holográfico', emoji:'🏥',  bg:'linear-gradient(180deg,#000510 0%,#000a20 40%,#000818 70%,#000208 100%)', sky:'#000a20', accent:'#87CEEB'},
  {id:18, name:'Barrio Neon',          emoji:'🌈',  bg:'linear-gradient(180deg,#0a000a 0%,#150015 40%,#100010 70%,#050005 100%)', sky:'#150015', accent:'#FF00FF'},
  {id:19, name:'Azotea del Mundo',     emoji:'🌌',  bg:'linear-gradient(180deg,#000005 0%,#00000f 40%,#00000a 70%,#000003 100%)', sky:'#00000f', accent:'#B8A9FF'},
  {id:20, name:'Playa Orbital',        emoji:'🌊',  bg:'linear-gradient(180deg,#000a18 0%,#001530 40%,#000e22 70%,#000508 100%)', sky:'#001530', accent:'#00BFFF'},
  {id:21, name:'Fábrica de Sueños',    emoji:'🌙',  bg:'linear-gradient(180deg,#05000f 0%,#0a001e 40%,#080018 70%,#030008 100%)', sky:'#0a001e', accent:'#B8A9FF'},
  {id:22, name:'Zona de Deportes',     emoji:'⚽',  bg:'linear-gradient(180deg,#001000 0%,#002200 40%,#001800 70%,#000800 100%)', sky:'#002200', accent:'#7CFC00'},
  {id:23, name:'Teatro Holográfico',   emoji:'🎭',  bg:'linear-gradient(180deg,#100010 0%,#200020 40%,#180018 70%,#080008 100%)', sky:'#200020', accent:'#FFD700'},
  {id:24, name:'Muelle de Nubes',      emoji:'☁️',  bg:'linear-gradient(180deg,#060612 0%,#0c0c22 40%,#0a0a1a 70%,#030308 100%)', sky:'#0c0c22', accent:'#87CEEB'},
  {id:25, name:'Barrio Retro-Futuro',  emoji:'🕰️',  bg:'linear-gradient(180deg,#0e0800 0%,#1c1000 40%,#150c00 70%,#070400 100%)', sky:'#1c1000', accent:'#FFA07A'},
  {id:26, name:'Santuario Animal',     emoji:'🦁',  bg:'linear-gradient(180deg,#001000 0%,#002000 40%,#001800 70%,#000800 100%)', sky:'#002000', accent:'#FFD700'},
  {id:27, name:'Cima del Universo',    emoji:'🌟',  bg:'linear-gradient(180deg,#000000 0%,#000008 40%,#000005 70%,#000000 100%)', sky:'#000008', accent:'#FFD700'},
];

/* ══ CIUDADANOS (Supersónicos + familia futurista) ══ */
const CITIZENS_DEF = [
  {name:'Jorge',  emoji:'👨‍💼', color:'#4D96FF'},
  {name:'Juana',  emoji:'👩‍🦰', color:'#FF6B9D'},
  {name:'Judita', emoji:'👧‍🦰', color:'#C77DFF'},
  {name:'Elio',   emoji:'👦',  color:'#7CFC00'},
  {name:'Astro',  emoji:'🐕',  color:'#DEB887'},
];
const HAIR_OPTS  = ['👱','🧑‍🦱','👩‍🦰','🧑‍🦲','👩‍🦳','🧑','👱‍♀️','🧑‍🦱'];
const SUIT_OPTS  = ['🥼','👔','👗','🧥','👕','🎽','🦺','👘'];
const ACC_OPTS   = ['🎩','👑','🌸','⭐','🎀','🕶️','🌙','💫'];

const NEED_ICONS:  Record<Need,string> = {hunger:'🍕',sleep:'💤',fun:'🎮',bath:'🛁',love:'💖'};
const NEED_LABEL:  Record<Need,string> = {hunger:'Hambre',sleep:'Sueño',fun:'Diversión',bath:'Baño',love:'Amor'};
const NEED_SND:    Record<Need,()=>void> = {
  hunger: ()=>melody([523,659,784,1047]),
  sleep:  ()=>melody([392,330,262]),
  fun:    ()=>melody([523,659,784,880,1047]),
  bath:   ()=>sweep(400,800,0.4),
  love:   ()=>melody([659,784,880,1047,880,784]),
};
const MOOD_BUBBLE: Record<Mood,string> = {
  happy:'😊 ¡Feliz!', neutral:'😐 Hmm...', excited:'🤩 ¡Genial!',
  sleepy:'😴 Sueño...', sad:'😢 Necesito algo',
};

function calcMood(n: Record<Need,number>): Mood {
  const avg = Object.values(n).reduce((a,b)=>a+b,0)/5;
  if (n.sleep<20) return 'sleepy';
  if (avg>80) return 'happy';
  if (avg>65) return 'excited';
  if (avg<28) return 'sad';
  return 'neutral';
}

/* ══ OBJETOS POR DISTRITO (40+ por distrito) ══ */
const DEFAULT_DISTRICT_ITEMS: {emoji:string;label:string;action:Need|null;color:string;special:boolean}[] = [
  // Vehículos futuristas
  {emoji:'🛸',label:'Platillo Volador',action:'fun',color:'#00D4C8',special:true},
  {emoji:'🚀',label:'Cohete Familiar',action:'fun',color:'#87CEEB',special:true},
  {emoji:'🏎️',label:'Auto Aéreo',action:'fun',color:'#FF6B6B',special:false},
  {emoji:'🚁',label:'Helicóptero',action:'fun',color:'#87CEEB',special:false},
  {emoji:'🛵',label:'Moto Espacial',action:'fun',color:'#C77DFF',special:false},
  {emoji:'🚲',label:'Bici Voladora',action:'fun',color:'#7CFC00',special:false},
  // Edificios / Arquitectura Supersónicos
  {emoji:'🏙️',label:'Torre Orbital',action:null,color:'#87CEEB',special:false},
  {emoji:'🗼',label:'Aguja Cósmica',action:null,color:'#00D4C8',special:false},
  {emoji:'🏗️',label:'Plataforma',action:null,color:'#DEB887',special:false},
  {emoji:'🏛️',label:'Cúpula Cristal',action:null,color:'#B8A9FF',special:false},
  {emoji:'🏟️',label:'Estadio',action:'fun',color:'#FF6B6B',special:false},
  {emoji:'🏰',label:'Castillo Futuro',action:null,color:'#C77DFF',special:false},
  // Naturaleza orbital
  {emoji:'🌳',label:'Árbol Orb',action:null,color:'#7CFC00',special:false},
  {emoji:'🌸',label:'Cerezo Flot',action:null,color:'#FFB3D1',special:false},
  {emoji:'🌺',label:'Flor Galáct',action:null,color:'#FF6B9D',special:false},
  {emoji:'🌻',label:'Girasol Sol',action:null,color:'#FFD700',special:false},
  {emoji:'🌿',label:'Enredadera',action:null,color:'#98FF98',special:false},
  {emoji:'🍀',label:'Trébol Lucky',action:null,color:'#7CFC00',special:false},
  // Comida futurista
  {emoji:'🍕',label:'Pizza Turbo',action:'hunger',color:'#FF6B6B',special:false},
  {emoji:'🍔',label:'Hamburguesa',action:'hunger',color:'#DEB887',special:false},
  {emoji:'🍣',label:'Sushi Orbital',action:'hunger',color:'#FF6B9D',special:false},
  {emoji:'🧁',label:'Cupcake',action:'hunger',color:'#FFB3BA',special:false},
  {emoji:'🍰',label:'Torta',action:'hunger',color:'#FF69B4',special:false},
  {emoji:'🍦',label:'Helado Neon',action:'hunger',color:'#00D4C8',special:false},
  {emoji:'☕',label:'Café Turbo',action:'hunger',color:'#8B4513',special:false},
  {emoji:'🧃',label:'Jugo Galaxia',action:'hunger',color:'#FF6B6B',special:false},
  // Entretenimiento
  {emoji:'🎮',label:'Consola Holo',action:'fun',color:'#C77DFF',special:false},
  {emoji:'📺',label:'TV Holográfica',action:'fun',color:'#87CEEB',special:false},
  {emoji:'🎵',label:'Música',action:'fun',color:'#FF69B4',special:false},
  {emoji:'🎠',label:'Carrusel',action:'fun',color:'#FFB3D1',special:false},
  {emoji:'🎡',label:'Rueda Fort',action:'fun',color:'#C77DFF',special:false},
  {emoji:'🎪',label:'Circo Galact',action:'fun',color:'#FF4500',special:false},
  // Higiene y amor
  {emoji:'🛁',label:'Bañera Orb',action:'bath',color:'#00CED1',special:false},
  {emoji:'🚿',label:'Ducha Laser',action:'bath',color:'#87CEEB',special:false},
  {emoji:'🫧',label:'Burbujas',action:'bath',color:'#00BFFF',special:false},
  {emoji:'💝',label:'Corazón',action:'love',color:'#FF4500',special:false},
  {emoji:'🧸',label:'Osito',action:'love',color:'#DEB887',special:false},
  {emoji:'🎁',label:'Regalo',action:'love',color:'#FF6B9D',special:false},
  // Tecnología
  {emoji:'🤖',label:'Robot',action:'fun',color:'#00D4C8',special:false},
  {emoji:'💻',label:'Holo-Laptop',action:'fun',color:'#87CEEB',special:false},
  {emoji:'📡',label:'Antena',action:null,color:'#87CEEB',special:false},
  {emoji:'🔭',label:'Telescopio',action:'fun',color:'#4D96FF',special:false},
  // Decoración cósmica
  {emoji:'🌟',label:'Estrella',action:null,color:'#FFD700',special:false},
  {emoji:'🌙',label:'Luna',action:null,color:'#B8A9FF',special:false},
  {emoji:'⭐',label:'Estrellita',action:null,color:'#FFD700',special:false},
  {emoji:'💫',label:'Destello',action:null,color:'#C77DFF',special:false},
  {emoji:'🌈',label:'Arcoíris',action:null,color:'#FF6B9D',special:false},
  {emoji:'💎',label:'Diamante',action:null,color:'#00D4C8',special:false},
  // Animales futuristas
  {emoji:'🦚',label:'Pavo Real',action:null,color:'#00CED1',special:false},
  {emoji:'🦜',label:'Loro Robot',action:'love',color:'#7CFC00',special:false},
  {emoji:'🐱',label:'Gato Galact',action:'love',color:'#FFA07A',special:false},
  {emoji:'🦋',label:'Mariposa',action:null,color:'#C77DFF',special:false},
];

const DISTRICT_SPECIALS: Record<number,{emoji:string;label:string;action:Need|null;color:string;special:boolean}[]> = {
  0: [ // Plaza Central — el Jetsons clásico
    {emoji:'🛸',label:'Auto Volador Jetsons',action:'fun',color:'#FF4500',special:true},
    {emoji:'🏙️',label:'Torre Orbital',action:null,color:'#87CEEB',special:true},
    {emoji:'🚀',label:'Cohete Plaza',action:'fun',color:'#4D96FF',special:true},
    {emoji:'🎆',label:'Fuegos Artificiales',action:'fun',color:'#FF6B6B',special:true},
    ...DEFAULT_DISTRICT_ITEMS.slice(4),
  ],
  1: [ // Puerto Espacial
    {emoji:'🚀',label:'Nave Espacial',action:'fun',color:'#B8A9FF',special:true},
    {emoji:'🛸',label:'Platillo Madre',action:'fun',color:'#00D4C8',special:true},
    {emoji:'🛰️',label:'Satélite',action:null,color:'#87CEEB',special:true},
    {emoji:'☄️',label:'Cometa',action:null,color:'#FF8E53',special:true},
    ...DEFAULT_DISTRICT_ITEMS.slice(4),
  ],
  6: [ // Distrito Dorado
    {emoji:'✨',label:'Palacio Dorado',action:null,color:'#FFD700',special:true},
    {emoji:'🏆',label:'Trofeo Máximo',action:null,color:'#FFD700',special:true},
    {emoji:'👑',label:'Corona Real',action:null,color:'#FFD700',special:true},
    {emoji:'🌟',label:'Supernova',action:null,color:'#FFD700',special:true},
    ...DEFAULT_DISTRICT_ITEMS.slice(4),
  ],
  19: [ // Azotea del Universo — todo espacio profundo
    {emoji:'🌌',label:'Galaxia',action:null,color:'#B8A9FF',special:true},
    {emoji:'🪐',label:'Saturno',action:null,color:'#C77DFF',special:true},
    {emoji:'🌠',label:'Estrella Fugaz',action:null,color:'#FFD700',special:true},
    {emoji:'🌑',label:'Luna Nueva',action:null,color:'#333',special:true},
    ...DEFAULT_DISTRICT_ITEMS.slice(4),
  ],
};
const getDistrictItems = (id: number) => DISTRICT_SPECIALS[id] || DEFAULT_DISTRICT_ITEMS;

/* ══ PAINT ══ */
const BRUSHES = [
  {id:'round' as BrushType,icon:'⚫',label:'Redondo'},
  {id:'flat'  as BrushType,icon:'▬',label:'Plano'},
  {id:'fan'   as BrushType,icon:'🌊',label:'Abanico'},
  {id:'splatter' as BrushType,icon:'💦',label:'Salpicado'},
  {id:'glow'  as BrushType,icon:'✨',label:'Brillante'},
  {id:'rainbow' as BrushType,icon:'🌈',label:'Arcoíris'},
  {id:'eraser' as BrushType,icon:'🧹',label:'Borrador'},
  {id:'stamp' as BrushType,icon:'⭐',label:'Sello'},
];
const PALETTES = [
  {name:'Espacio',colors:['#B8A9FF','#00D4C8','#FFD700','#FF6B9D','#4D96FF','#7CFC00','#FF8E53','#DDA0DD','#00CED1','#FF6B6B','#FFD93D','#98FF98','#C77DFF','#87CEEB','#FFA07A']},
  {name:'Pastel', colors:['#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF','#F8C8D4','#E8D5F5','#D4F5E8','#F5EBD4','#D4E8F5','#F5D4F5','#D4F5D4','#F5F5D4','#D4D4F5','#F5D4D4']},
  {name:'Neón',   colors:['#FF0080','#FF4500','#FFD700','#00FF41','#00D4FF','#8A2BE2','#FF1493','#FF6600','#FFFF00','#00FF00','#00FFFF','#FF00FF','#FF69B4','#7FFF00','#00BFFF']},
  {name:'Jetsons',colors:['#4D96FF','#87CEEB','#00D4C8','#B8A9FF','#C77DFF','#FF6B9D','#FFD700','#FF8E53','#7CFC00','#98FF98','#FFA07A','#DDA0DD','#00CED1','#FFB3D1','#A8EDEA']},
];
const STAMPS = ['⭐','🌟','💫','🛸','🚀','🏙️','🤖','🎆','💎','🌈','🎠','🏆','👑','💝','🌸','🦋','🎵','🎮','🌙','🪐'];

/* ══ CIUDAD BACKGROUND: Pilares + plataformas SVG ══ */
function CityBackground({accent,sky}:{accent:string;sky:string}) {
  const cols = useMemo(()=>Array.from({length:9},(_,i)=>({
    x:5+i*11, h:ri(28,72), w:ri(6,12), delay:i*0.3,
    topShape:ri(0,3), // 0=flat, 1=dome, 2=disk, 3=antenna
    windows:Array.from({length:ri(3,8)},()=>({wx:ri(10,85),wy:ri(20,85)})),
    color:[accent,'#87CEEB','#B8A9FF','#00D4C8','#FFD700'][i%5],
  })),[accent]);

  const platforms = useMemo(()=>[
    {x:2,y:68,w:22,accent},{x:30,y:60,w:18,accent:'#87CEEB'},
    {x:55,y:72,w:25,accent:'#B8A9FF'},{x:78,y:65,w:20,accent:'#00D4C8'},
  ],[accent]);

  return (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"
      style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none'}}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky} stopOpacity="0"/>
          <stop offset="100%" stopColor={sky} stopOpacity="0.6"/>
        </linearGradient>
        <linearGradient id="groundG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.05"/>
        </linearGradient>
      </defs>

      {/* Ground platform base */}
      <rect x="0" y="240" width="400" height="60" fill="url(#groundG)" rx="0"/>
      <line x1="0" y1="240" x2="400" y2="240" stroke={accent} strokeWidth="1" strokeOpacity="0.4"/>

      {/* Towers / columnas estilo Supersónicos */}
      {cols.map((col,i)=>{
        const bx = col.x*4; const by = 300-col.h*2.4; const bw = col.w*4; const bh = col.h*2.4;
        return (
          <g key={i}>
            {/* Column pillar */}
            <rect x={bx} y={by} width={bw} height={bh}
              fill={`${col.color}18`} stroke={col.color} strokeWidth="0.6" strokeOpacity="0.5" rx="2"/>
            {/* Windows */}
            {col.windows.map((w,wi)=>(
              <rect key={wi} x={bx+bw*w.wx/100-3} y={by+bh*w.wy/100-2} width={5} height={4}
                fill={col.color} fillOpacity={r(0.3,0.9)} rx="1"/>
            ))}
            {/* Top shapes */}
            {col.topShape===0 && <rect x={bx-4} y={by-4} width={bw+8} height={5} fill={col.color} fillOpacity="0.7" rx="2"/>}
            {col.topShape===1 && <ellipse cx={bx+bw/2} cy={by} rx={bw/2+6} ry={5} fill={col.color} fillOpacity="0.6"/>}
            {col.topShape===2 && <ellipse cx={bx+bw/2} cy={by-2} rx={bw/2+10} ry={4} fill={col.color} fillOpacity="0.5"/>}
            {col.topShape===3 && <line x1={bx+bw/2} y1={by} x2={bx+bw/2} y2={by-18} stroke={col.color} strokeWidth="1.5" strokeOpacity="0.7"/>}
          </g>
        );
      })}

      {/* Floating platforms — estilo disco Supersónicos */}
      {platforms.map((p,i)=>(
        <g key={i}>
          <ellipse cx={p.x*4+p.w*2} cy={p.y*3} rx={p.w*2} ry={5} fill={p.accent} fillOpacity="0.2" stroke={p.accent} strokeWidth="0.8" strokeOpacity="0.6"/>
          <rect x={p.x*4} y={p.y*3-1} width={p.w*4} height={2} fill={p.accent} fillOpacity="0.5" rx="1"/>
        </g>
      ))}

      {/* Connecting tubes / rails */}
      <path d="M 40 230 Q 120 190 200 220 Q 280 185 360 215" fill="none" stroke={accent} strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4,4"/>
      <path d="M 20 200 Q 100 160 180 200 Q 260 155 380 190" fill="none" stroke="#87CEEB" strokeWidth="0.6" strokeOpacity="0.2" strokeDasharray="3,6"/>

      {/* Hover cars streaks */}
      <circle cx="80"  cy="180" r="2" fill={accent} fillOpacity="0.7">
        <animateTransform attributeName="transform" type="translate" from="-100 0" to="500 0" dur="8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="200" cy="160" r="1.5" fill="#FFD700" fillOpacity="0.8">
        <animateTransform attributeName="transform" type="translate" from="-120 0" to="520 0" dur="6s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="320" cy="200" r="2.5" fill="#FF6B9D" fillOpacity="0.6">
        <animateTransform attributeName="transform" type="translate" from="500 0" to="-100 0" dur="10s" begin="1s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

export default function Mundo0() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef   = useRef<CanvasRenderingContext2D|null>(null);

  /* ── State ── */
  const [district, setDistrict]       = useState(0);
  const [showDistMap, setShowDistMap] = useState(false);
  const [citizens, setCitizens]       = useState<Citizen[]>(() =>
    CITIZENS_DEF.map((c,i) => ({
      id:i, name:c.name, emoji:c.emoji, color:c.color,
      x:12+i*18, y:55, layer:'mid', zIndex:10+i,
      needs:{hunger:80,sleep:80,fun:80,bath:80,love:80},
      mood:'happy', bubble:'', bubbleTimer:0,
      hair:i, suit:i, acc:i%8,
      dragging:false, scale:1,
    }))
  );
  const [buildings, setBuildings]     = useState<BuildingItem[]>([]);
  const [particles, setParticles]     = useState<Particle[]>([]);
  const [stickers,  setStickers]      = useState<Sticker[]>([]);
  const [tab, setTab]                 = useState<'citizens'|'build'|'paint'|'customize'>('citizens');
  const [brush, setBrush]             = useState<BrushType>('round');
  const [brushSize, setBrushSize]     = useState(18);
  const [paletteIdx, setPaletteIdx]   = useState(0);
  const [color, setColor]             = useState('#00D4C8');
  const [opacity, setOpacity]         = useState(0.65);
  const [stampIdx, setStampIdx]       = useState(0);
  const [painting, setPainting]       = useState(false);
  const [comboMsg, setComboMsg]       = useState('');
  const [showCombo, setShowCombo]     = useState(false);
  const [toqwowPos, setToqwowPos]     = useState({x:42,y:58});
  const [toqwowMood, setToqwowMood]   = useState<'idle'|'happy'|'dance'>('idle');
  const [draggingTq, setDraggingTq]   = useState(false);
  const [selectedCit, setSelectedCit] = useState<number|null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [buildPage, setBuildPage]     = useState(0);
  const [rainbowHue, setRainbowHue]   = useState(0);

  const draggingId   = useRef<number|null>(null);
  const draggingBld  = useRef<number|null>(null);
  const dragOff      = useRef({x:0,y:0});
  const maxZ         = useRef(50);
  const isPainting   = useRef(false);
  const lastPt       = useRef<{x:number;y:number}|null>(null);
  const tqDragging   = useRef(false);
  const tqOff        = useRef({x:0,y:0});
  const rafRef       = useRef<number>(0);
  const hueTick      = useRef(0);
  const needTimer    = useRef<ReturnType<typeof setInterval>|null>(null);

  const currentDistrict = DISTRICTS[district];
  const distItems = getDistrictItems(district);
  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(distItems.length/PAGE_SIZE);
  const pageItems = distItems.slice(buildPage*PAGE_SIZE,(buildPage+1)*PAGE_SIZE);

  /* ── Canvas setup ── */
  useEffect(()=>{
    const c = canvasRef.current!;
    c.width = window.innerWidth; c.height = window.innerHeight;
    ctxRef.current = c.getContext('2d');
    const onR = ()=>{c.width=window.innerWidth;c.height=window.innerHeight;};
    window.addEventListener('resize',onR);
    return ()=>window.removeEventListener('resize',onR);
  },[]);

  /* ── Rainbow ── */
  useEffect(()=>{
    const tick=()=>{hueTick.current=(hueTick.current+1.5)%360;setRainbowHue(hueTick.current);rafRef.current=requestAnimationFrame(tick);};
    if (brush==='rainbow') rafRef.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[brush]);

  /* ── Need decay ── */
  useEffect(()=>{
    needTimer.current = setInterval(()=>{
      setCitizens(prev=>prev.map(ch=>{
        const n={...ch.needs};
        n.hunger=Math.max(0,n.hunger-r(0.3,0.7));
        n.sleep =Math.max(0,n.sleep -r(0.2,0.5));
        n.fun   =Math.max(0,n.fun   -r(0.25,0.6));
        n.bath  =Math.max(0,n.bath  -r(0.15,0.4));
        n.love  =Math.max(0,n.love  -r(0.2,0.45));
        return {...ch,needs:n,mood:calcMood(n)};
      }));
    },2000);
    return ()=>{if(needTimer.current)clearInterval(needTimer.current);};
  },[]);

  /* ── Load buildings for district ── */
  useEffect(()=>{
    const items = getDistrictItems(district);
    setBuildings(items.map((item,i)=>({
      id:uid++, emoji:item.emoji, label:item.label, action:item.action,
      x:5+(i%8)*11.5, y:8+Math.floor(i/8)*22,
      sz:item.special?56:40, color:item.color,
      layer:'back', zIndex:i+1, dragging:false, scale:1, district,
    })));
    setBuildPage(0);
  },[district]);

  /* ── Interact / satisfy need ── */
  const interact = useCallback((citId:number, action:Need)=>{
    setCitizens(prev=>prev.map(ch=>{
      if(ch.id!==citId) return ch;
      const n={...ch.needs,[action]:Math.min(100,ch.needs[action]+32)};
      const mood=calcMood(n);
      NEED_SND[action](); vib([30,15,30]);
      for(let i=0;i<8;i++) setTimeout(()=>{
        const pe:Particle[]=[{id:uid++,x:r(20,80)*window.innerWidth/100,y:r(25,70)*window.innerHeight/100,e:NEED_ICONS[action]}];
        setParticles(p=>[...p,...pe]);
        setTimeout(()=>setParticles(p=>p.filter(pp=>!pe.find(x=>x.id===pp.id))),800);
      },i*60);
      setComboMsg(`${NEED_ICONS[action]} ¡${NEED_LABEL[action]} satisfecho!`);
      setShowCombo(true); setTimeout(()=>setShowCombo(false),2400);
      return{...ch,needs:n,mood,bubble:MOOD_BUBBLE[mood],bubbleTimer:Date.now()+3000};
    }));
  },[]);

  /* ── Paint ── */
  const doPaint = useCallback((cx:number,cy:number)=>{
    const ctx=ctxRef.current; if(!ctx) return;
    const cr=canvasRef.current!.getBoundingClientRect();
    const x=cx-cr.left,y=cy-cr.top;
    const pts=lastPt.current?[lastPt.current,{x,y}]:[{x,y}];
    lastPt.current={x,y};
    if(brush==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(x,y,brushSize*1.5,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';return;}
    const pc=brush==='rainbow'?`hsl(${hueTick.current},100%,60%)`:color;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=opacity;
    if(brush==='round'){ctx.fillStyle=pc;const[p0,p1]=pts;if(p1){const dx=p1.x-p0.x,dy=p1.y-p0.y,dist=Math.sqrt(dx*dx+dy*dy);for(let i=0;i<=dist;i+=4){const px=p0.x+dx*(i/dist),py=p0.y+dy*(i/dist);ctx.beginPath();ctx.arc(px,py,brushSize/2,0,Math.PI*2);ctx.fill();}}else{ctx.beginPath();ctx.arc(x,y,brushSize/2,0,Math.PI*2);ctx.fill();}}
    else if(brush==='flat'){ctx.strokeStyle=pc;ctx.lineWidth=brushSize*.4;ctx.lineCap='square';ctx.beginPath();if(pts[1]){ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);}else{ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);}ctx.stroke();}
    else if(brush==='fan'){ctx.fillStyle=pc;for(let i=0;i<7;i++){const angle=(i/6)*Math.PI-Math.PI/2;const ex=x+Math.cos(angle)*brushSize,ey=y+Math.sin(angle)*brushSize;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.lineWidth=1.5;ctx.strokeStyle=pc;ctx.stroke();}}
    else if(brush==='splatter'){for(let i=0;i<12;i++){const a=r(0,Math.PI*2),d=r(0,brushSize*1.8),sz=r(1,brushSize*.35);ctx.fillStyle=pc;ctx.globalAlpha=opacity*r(.3,1);ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,sz,0,Math.PI*2);ctx.fill();}}
    else if(brush==='glow'){const grad=ctx.createRadialGradient(x,y,0,x,y,brushSize*1.4);grad.addColorStop(0,pc);grad.addColorStop(1,'transparent');ctx.globalAlpha=opacity*.6;ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,brushSize*1.4,0,Math.PI*2);ctx.fill();}
    else if(brush==='rainbow'){for(let i=0;i<5;i++){ctx.fillStyle=`hsl(${(hueTick.current+i*30)%360},100%,60%)`;ctx.globalAlpha=opacity*.5;const off=(i-2)*brushSize*.4;ctx.beginPath();ctx.arc(x+off,y,brushSize*.35,0,Math.PI*2);ctx.fill();}}
    else if(brush==='stamp'){ctx.font=`${brushSize*1.6}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=opacity;ctx.fillText(STAMPS[stampIdx],x,y);}
    note(ri(350,750),0.06,0.04);
  },[brush,brushSize,color,opacity,stampIdx]);

  /* ── Building drop on citizen ── */
  const onBldUp = useCallback((e:React.PointerEvent, bldId:number)=>{
    if(draggingBld.current!==bldId) return;
    draggingBld.current=null;
    const bld=buildings.find(b=>b.id===bldId);
    if(!bld||!bld.action){setBuildings(prev=>prev.map(b=>b.id===bldId?{...b,dragging:false,scale:1}:b));return;}
    const wr=worldRef.current!.getBoundingClientRect();
    const fx=((e.clientX-wr.left)/wr.width)*100;
    const fy=((e.clientY-wr.top)/wr.height)*100;
    const target=citizens.find(c=>Math.abs(c.x-fx)<12&&Math.abs(c.y-fy)<15);
    if(target) interact(target.id,bld.action);
    setBuildings(prev=>prev.map(b=>b.id===bldId?{...b,dragging:false,scale:1}:b));
  },[buildings,citizens,interact]);

  /* ── Citizen drag ── */
  const onCitDown = useCallback((e:React.PointerEvent,id:number)=>{
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    draggingId.current=id;maxZ.current++;
    const wr=worldRef.current!.getBoundingClientRect();
    const ch=citizens.find(c=>c.id===id)!;
    dragOff.current={x:e.clientX-wr.left-(ch.x/100)*wr.width,y:e.clientY-wr.top-(ch.y/100)*wr.height};
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,dragging:true,zIndex:maxZ.current,scale:1.15}:c));
    note(ri(400,700),0.12,0.15);vib(15);
  },[citizens]);
  const onCitMove = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingId.current!==id)return;
    const wr=worldRef.current!.getBoundingClientRect();
    const nx=((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny=((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,x:Math.max(2,Math.min(88,nx)),y:Math.max(5,Math.min(80,ny))}:c));
  },[]);
  const onCitUp = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingId.current!==id)return;
    draggingId.current=null;
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,dragging:false,scale:1}:c));
    note(ri(300,500),0.15,0.12);vib(10);
  },[]);

  /* ── Building drag ── */
  const onBldDown = useCallback((e:React.PointerEvent,id:number)=>{
    if(tab!=='build')return;
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    draggingBld.current=id;maxZ.current++;
    const wr=worldRef.current!.getBoundingClientRect();
    const bld=buildings.find(b=>b.id===id)!;
    dragOff.current={x:e.clientX-wr.left-(bld.x/100)*wr.width,y:e.clientY-wr.top-(bld.y/100)*wr.height};
    setBuildings(prev=>prev.map(b=>b.id===id?{...b,dragging:true,zIndex:maxZ.current,scale:1.2}:b));
    note(ri(300,600),0.1,0.12);vib(12);
  },[buildings,tab]);
  const onBldMove = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingBld.current!==id)return;
    const wr=worldRef.current!.getBoundingClientRect();
    const nx=((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny=((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setBuildings(prev=>prev.map(b=>b.id===id?{...b,x:Math.max(0,Math.min(90,nx)),y:Math.max(0,Math.min(80,ny))}:b));
  },[]);

  /* ── Toqwow drag ── */
  const onTqDown = useCallback((e:React.PointerEvent)=>{
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    tqDragging.current=true;setDraggingTq(true);
    const wr=worldRef.current!.getBoundingClientRect();
    tqOff.current={x:e.clientX-wr.left-(toqwowPos.x/100)*wr.width,y:e.clientY-wr.top-(toqwowPos.y/100)*wr.height};
    melody([523,659,784]);vib(20);
  },[toqwowPos]);
  const onTqMove = useCallback((e:React.PointerEvent)=>{
    if(!tqDragging.current)return;
    const wr=worldRef.current!.getBoundingClientRect();
    setToqwowPos({x:Math.max(2,Math.min(84,((e.clientX-wr.left-tqOff.current.x)/wr.width)*100)),y:Math.max(5,Math.min(82,((e.clientY-wr.top-tqOff.current.y)/wr.height)*100))});
    setToqwowMood('dance');
  },[]);
  const onTqUp = useCallback(()=>{
    tqDragging.current=false;setDraggingTq(false);
    setToqwowMood('happy');setTimeout(()=>setToqwowMood('idle'),1500);
    melody([784,1047,1319]);vib([25,12,25]);
  },[]);

  /* ── Paint events ── */
  const onWDown = useCallback((e:React.PointerEvent)=>{
    if(tab!=='paint')return;
    isPainting.current=true;lastPt.current=null;doPaint(e.clientX,e.clientY);
  },[tab,doPaint]);
  const onWMove = useCallback((e:React.PointerEvent)=>{
    if(tab==='paint'&&isPainting.current)doPaint(e.clientX,e.clientY);
  },[tab,doPaint]);
  const onWUp   = useCallback(()=>{isPainting.current=false;lastPt.current=null;},[]);

  const onWorldTap = useCallback((e:React.PointerEvent)=>{
    if(tab!=='paint')return;
    const wr=worldRef.current!.getBoundingClientRect();
    const x=((e.clientX-wr.left)/wr.width)*100;
    const y=((e.clientY-wr.top)/wr.height)*100;
    if(brush==='stamp'){
      const s:Sticker={id:uid++,emoji:STAMPS[stampIdx],x,y,sz:ri(28,52),rotation:r(-20,20)};
      setStickers(prev=>[...prev,s]);
      note(ri(600,1200),0.2,0.18);vib(15);
    }
  },[tab,brush,stampIdx]);

  const clearCanvas=()=>{const ctx=ctxRef.current;if(ctx)ctx.clearRect(0,0,canvasRef.current!.width,canvasRef.current!.height);note(200,0.3,0.2);vib(30);};

  const currentPalette = PALETTES[paletteIdx];

  return (
    <div ref={worldRef}
      onPointerDown={e=>{onWDown(e);onWorldTap(e);}}
      onPointerMove={onWMove} onPointerUp={onWUp}
      style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative',touchAction:'none',fontFamily:'system-ui,sans-serif',
        background:currentDistrict.bg, transition:'background 0.6s ease',
        cursor:tab==='paint'?(brush==='eraser'?'cell':'crosshair'):'default'}}>

      {/* City SVG background */}
      <CityBackground accent={currentDistrict.accent} sky={currentDistrict.sky}/>

      {/* Paint canvas */}
      <canvas ref={canvasRef} style={{position:'absolute',inset:0,zIndex:5,pointerEvents:'none'}}/>

      {/* BG Stars */}
      {useMemo(()=>Array.from({length:80},(_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',zIndex:2,
          width:`${r(1,i%5===0?3.5:2)}px`,height:`${r(1,i%5===0?3.5:2)}px`,
          background:i%6===0?currentDistrict.accent:'white',
          opacity:r(.05,.75),top:`${r(0,92)}%`,left:`${r(0,100)}%`,
          animation:`tw${i%4} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      )),[district])}

      {/* Buildings placed in world */}
      {buildings.filter(b=>b.layer==='back').map(bld=>(
        <div key={bld.id}
          onPointerDown={e=>onBldDown(e,bld.id)}
          onPointerMove={e=>onBldMove(e,bld.id)}
          onPointerUp={e=>onBldUp(e,bld.id)}
          style={{position:'absolute',left:`${bld.x}%`,top:`${bld.y}%`,
            fontSize:bld.sz,lineHeight:1,touchAction:'none',userSelect:'none',
            zIndex:bld.dragging?80:bld.zIndex+3,
            cursor:bld.dragging?'grabbing':tab==='build'?'grab':'default',
            transform:`scale(${bld.scale})`,
            transition:bld.dragging?'none':'transform .15s',
            filter:`drop-shadow(0 4px 12px ${bld.color}88)`,
            animation:bld.dragging?'none':`objF${bld.id%6} ${3+bld.id*.2}s ease-in-out infinite`,
            pointerEvents:tab==='build'?'auto':'none',
          }}>{bld.emoji}</div>
      ))}

      {/* CITIZENS */}
      {citizens.map(ch=>{
        const showBubble = ch.bubbleTimer>Date.now();
        const critNeed = (Object.entries(ch.needs) as [Need,number][]).find(([,v])=>v<25);
        return (
          <div key={ch.id} style={{position:'absolute',left:`${ch.x}%`,top:`${ch.y}%`,zIndex:ch.dragging?90:ch.zIndex,touchAction:'none'}}>
            {(showBubble||critNeed)&&(
              <div style={{position:'absolute',bottom:'108%',left:'50%',transform:'translateX(-50%)',
                background:'rgba(255,255,255,.95)',borderRadius:16,padding:'5px 11px',
                fontSize:11,fontWeight:700,color:'#111',whiteSpace:'nowrap',
                boxShadow:'0 4px 16px rgba(0,0,0,.3)',zIndex:95,pointerEvents:'none',
                animation:'bubblePop .3s ease-out'}}>
                {showBubble?ch.bubble:`${NEED_ICONS[critNeed![0]]} ¡${NEED_LABEL[critNeed![0]]}!`}
                <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',
                  width:0,height:0,borderLeft:'6px solid transparent',borderRight:'6px solid transparent',
                  borderTop:'7px solid rgba(255,255,255,.95)'}}/>
              </div>
            )}
            {/* Need bars — visible when selected */}
            <div style={{position:'absolute',bottom:'100%',left:'50%',transform:'translateX(-50%)',
              display:'flex',gap:2,marginBottom:2,
              opacity:selectedCit===ch.id?1:0,transition:'opacity .2s'}}>
              {(Object.entries(ch.needs) as [Need,number][]).map(([need,val])=>(
                <div key={need} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                  <div style={{fontSize:7}}>{NEED_ICONS[need]}</div>
                  <div style={{width:4,height:22,background:'rgba(255,255,255,.2)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{position:'relative',width:'100%',height:`${val}%`,
                      background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',
                      borderRadius:2,transition:'height .5s',marginTop:'auto'}}/>
                  </div>
                </div>
              ))}
            </div>
            <div
              onPointerDown={e=>{onCitDown(e,ch.id);setSelectedCit(ch.id);}}
              onPointerMove={e=>onCitMove(e,ch.id)}
              onPointerUp={e=>onCitUp(e,ch.id)}
              style={{cursor:ch.dragging?'grabbing':'grab',userSelect:'none',
                display:'flex',flexDirection:'column',alignItems:'center',
                transform:`scale(${ch.scale})`,transition:'transform .2s',
                filter:`drop-shadow(0 0 ${ch.dragging?20:10}px ${ch.color})`,
                animation:ch.dragging?'none':ch.mood==='happy'?'charHappy .8s ease-in-out infinite alternate':ch.mood==='excited'?'charExcited .4s ease-in-out infinite alternate':ch.mood==='sleepy'?'charSleepy 3s ease-in-out infinite':'charFloat 2.5s ease-in-out infinite alternate',
              }}>
              <div style={{fontSize:10}}>{ACC_OPTS[ch.acc]}</div>
              <div style={{fontSize:28}}>{ch.emoji}</div>
              <div style={{fontSize:9,marginTop:-2}}>{SUIT_OPTS[ch.suit]}</div>
              <div style={{fontSize:9,fontWeight:700,color:'white',textShadow:'0 1px 4px rgba(0,0,0,.8)',
                background:`${ch.color}44`,borderRadius:8,padding:'1px 6px',marginTop:2}}>{ch.name}</div>
            </div>
          </div>
        );
      })}

      {/* Stickers */}
      {stickers.map(s=>(
        <div key={s.id} onClick={()=>setStickers(prev=>prev.filter(x=>x.id!==s.id))}
          style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,fontSize:s.sz,lineHeight:1,userSelect:'none',zIndex:8,cursor:'pointer',transform:`rotate(${s.rotation}deg)`}}>{s.emoji}</div>
      ))}

      {/* Particles */}
      {particles.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,fontSize:ri(20,32),pointerEvents:'none',zIndex:100,lineHeight:1,animation:'burstP .9s ease-out forwards'}}>{p.e}</div>
      ))}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{position:'absolute',left:`${toqwowPos.x}%`,top:`${toqwowPos.y}%`,
          width:'min(120px,21vw)',cursor:draggingTq?'grabbing':'grab',zIndex:20,touchAction:'none',
          filter:`drop-shadow(0 0 ${draggingTq?'36px':'22px'} ${currentDistrict.accent}cc)`,
          animation:toqwowMood==='dance'?'tqDance .35s ease-in-out infinite alternate':toqwowMood==='happy'?'tqHappy .4s ease-in-out 3':'tqFloat 3.5s ease-in-out infinite',
          transform:draggingTq?'scale(1.18)':'scale(1)',transition:'filter .2s,transform .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={120} height={152}
          style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen',pointerEvents:'none'}} priority/>
      </div>

      {/* Combo */}
      {showCombo&&(
        <div style={{position:'absolute',top:'28%',left:'50%',transform:'translateX(-50%)',zIndex:110,textAlign:'center',animation:'comboIn .4s ease-out',pointerEvents:'none'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',background:'rgba(0,0,0,.7)',borderRadius:24,padding:'12px 24px',backdropFilter:'blur(14px)',boxShadow:`0 0 40px ${currentDistrict.accent}88`}}>{comboMsg}</div>
        </div>
      )}

      {/* DISTRICT MAP */}
      {showDistMap&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',padding:16,overflowY:'auto'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',marginBottom:14}}>🏙️ Elige Distrito</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,maxWidth:480,width:'100%'}}>
            {DISTRICTS.map(d=>(
              <div key={d.id} onClick={()=>{setDistrict(d.id);setShowDistMap(false);note(523,0.2,0.2);}}
                style={{background:d.id===district?`${d.accent}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${d.id===district?d.accent:'rgba(255,255,255,.15)'}`,
                  borderRadius:12,padding:'8px 4px',cursor:'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .2s'}}>
                <div style={{fontSize:20}}>{d.emoji}</div>
                <div style={{fontSize:9,color:'white',textAlign:'center',lineHeight:1.2}}>{d.name}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowDistMap(false)}
            style={{marginTop:16,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'8px 24px',color:'white',cursor:'pointer',fontSize:14}}>Cerrar</button>
        </div>
      )}

      {/* CUSTOMIZE MODAL */}
      {showCustomize&&selectedCit!==null&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',zIndex:195,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
          <div style={{background:'rgba(10,5,30,.96)',borderRadius:24,padding:20,maxWidth:340,width:'90%',border:`1.5px solid ${citizens[selectedCit]?.color||'#B8A9FF'}44`}}>
            <div style={{fontSize:16,fontWeight:800,color:'white',marginBottom:12,textAlign:'center'}}>✨ Personalizar {citizens[selectedCit]?.name}</div>
            {(['hair','suit','acc'] as const).map(attr=>(
              <div key={attr} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:6}}>{attr==='hair'?'Pelo':attr==='suit'?'Traje':'Accesorio'}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {(attr==='hair'?HAIR_OPTS:attr==='suit'?SUIT_OPTS:ACC_OPTS).map((opt,i)=>(
                    <div key={i} onClick={()=>{setCitizens(prev=>prev.map(c=>c.id===selectedCit?{...c,[attr]:i}:c));note(ri(600,900),0.15,0.15);vib(10);}}
                      style={{fontSize:22,cursor:'pointer',padding:4,borderRadius:8,
                        background:citizens[selectedCit]?.[attr]===i?`${citizens[selectedCit].color}33`:'transparent',
                        border:citizens[selectedCit]?.[attr]===i?`1.5px solid ${citizens[selectedCit].color}`:'1.5px solid transparent',
                        transition:'all .15s'}}>{opt}</div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>setShowCustomize(false)}
              style={{width:'100%',marginTop:8,background:'rgba(255,255,255,.1)',border:'none',borderRadius:12,padding:'10px',color:'white',cursor:'pointer',fontSize:14,fontWeight:700}}>✅ Listo</button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',zIndex:60,background:'rgba(0,0,0,.4)',backdropFilter:'blur(10px)'}}>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer'}}>← Inicio</button>
        <button onClick={()=>setShowDistMap(true)} style={{background:`${currentDistrict.accent}22`,border:`1px solid ${currentDistrict.accent}66`,borderRadius:50,padding:'6px 16px',fontSize:13,fontWeight:700,color:'white',cursor:'pointer'}}>
          {currentDistrict.emoji} {currentDistrict.name} ▾
        </button>
        <button onClick={()=>{if(selectedCit!==null)setShowCustomize(true);}} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer',opacity:selectedCit!==null?1:0.4}}>✨</button>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:60,background:'rgba(2,4,20,.94)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.1)',padding:'8px 12px 12px'}}>
        {/* TABS */}
        <div style={{display:'flex',justifyContent:'center',gap:5,marginBottom:8}}>
          {[
            {id:'citizens',icon:'👨‍👩‍👧‍👦',label:'Personas'},
            {id:'build',   icon:'🏙️',label:'Construir'},
            {id:'paint',   icon:'🎨',label:'Pintar'},
            {id:'customize',icon:'✨',label:'Cambiar'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              style={{background:tab===t.id?`${currentDistrict.accent}33`:'rgba(255,255,255,.07)',
                border:tab===t.id?`2px solid ${currentDistrict.accent}`:'1px solid rgba(255,255,255,.15)',
                borderRadius:50,padding:'5px 12px',fontSize:11,fontWeight:tab===t.id?700:400,
                color:'white',cursor:'pointer',transition:'all .2s'}}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* CITIZENS TAB */}
        {tab==='citizens'&&(
          <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
            {citizens.map(ch=>(
              <div key={ch.id} onClick={()=>setSelectedCit(selectedCit===ch.id?null:ch.id)}
                style={{background:selectedCit===ch.id?`${ch.color}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${selectedCit===ch.id?ch.color:'rgba(255,255,255,.15)'}`,
                  borderRadius:14,padding:'8px 10px',cursor:'pointer',flexShrink:0,minWidth:80,textAlign:'center',transition:'all .2s'}}>
                <div style={{fontSize:22}}>{ch.emoji}</div>
                <div style={{fontSize:10,color:'white',fontWeight:700,marginBottom:4}}>{ch.name}</div>
                <div style={{display:'flex',gap:2,justifyContent:'center'}}>
                  {(Object.entries(ch.needs) as [Need,number][]).map(([need,val])=>(
                    <div key={need} style={{width:3,height:14,background:'rgba(255,255,255,.15)',borderRadius:2,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',bottom:0,width:'100%',height:`${val}%`,background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',borderRadius:2,transition:'height .5s'}}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {selectedCit!==null&&(
              <div style={{flexShrink:0,display:'flex',flexDirection:'column',gap:4,minWidth:130}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,.4)',marginBottom:2}}>Arrastrá objetos ↑</div>
                {(Object.entries(citizens[selectedCit].needs) as [Need,number][]).map(([need,val])=>(
                  <div key={need} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 8px',
                    background:'rgba(255,255,255,.07)',borderRadius:8,
                    border:`1px solid ${val<30?'#FF6B6B':val<60?'#FFD700':'rgba(255,255,255,.1)'}`}}>
                    <span style={{fontSize:13}}>{NEED_ICONS[need]}</span>
                    <div style={{flex:1,height:5,background:'rgba(255,255,255,.15)',borderRadius:3,minWidth:40}}>
                      <div style={{height:'100%',width:`${val}%`,background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',borderRadius:3,transition:'width .5s'}}/>
                    </div>
                    <button onClick={()=>interact(selectedCit,need)}
                      style={{fontSize:11,background:'rgba(255,255,255,.15)',border:'none',borderRadius:6,padding:'2px 7px',color:'white',cursor:'pointer'}}>+</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BUILD TAB */}
        {tab==='build'&&(
          <div>
            <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,alignItems:'center'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)',whiteSpace:'nowrap',minWidth:60}}>🏙️ Arrastrá al mundo</div>
              <div style={{display:'flex',gap:7,flex:1,overflowX:'auto'}}>
                {pageItems.map(item=>(
                  <div key={item.label}
                    style={{fontSize:item.special?40:32,flexShrink:0,cursor:'grab',
                      filter:item.special?`drop-shadow(0 0 12px ${item.color})`:`drop-shadow(0 2px 6px ${item.color}66)`,
                      animation:item.special?'specialPulse 1.8s ease-in-out infinite':'none'}}
                    title={item.label}>{item.emoji}</div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:6}}>
              <button onClick={()=>setBuildPage(p=>Math.max(0,p-1))} disabled={buildPage===0}
                style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'4px 12px',color:'white',cursor:'pointer',fontSize:12,opacity:buildPage===0?0.4:1}}>◀</button>
              <span style={{fontSize:11,color:'rgba(255,255,255,.4)',alignSelf:'center'}}>{buildPage+1}/{totalPages}</span>
              <button onClick={()=>setBuildPage(p=>Math.min(totalPages-1,p+1))} disabled={buildPage===totalPages-1}
                style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'4px 12px',color:'white',cursor:'pointer',fontSize:12,opacity:buildPage===totalPages-1?0.4:1}}>▶</button>
              <button onClick={()=>setBuildings(prev=>prev.map((b,i)=>({...b,x:5+(i%8)*11.5,y:8+Math.floor(i/8)*22})))}
                style={{background:'rgba(255,80,80,.25)',border:'1px solid rgba(255,100,100,.4)',borderRadius:12,padding:'4px 12px',color:'white',fontSize:11,cursor:'pointer'}}>🔄</button>
            </div>
          </div>
        )}

        {/* PAINT TAB */}
        {tab==='paint'&&(
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Paleta:</div>
              {PALETTES.map((p,i)=>(
                <button key={i} onClick={()=>setPaletteIdx(i)}
                  style={{fontSize:10,background:paletteIdx===i?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)',border:paletteIdx===i?'1.5px solid white':'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'3px 9px',color:'white',cursor:'pointer'}}>{p.name}</button>
              ))}
              <button onClick={clearCanvas} style={{marginLeft:'auto',background:'rgba(255,80,80,.25)',border:'1px solid rgba(255,100,100,.4)',borderRadius:12,padding:'3px 10px',color:'white',fontSize:10,cursor:'pointer'}}>🗑️</button>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {currentPalette.colors.map(c=>(
                <div key={c} onClick={()=>setColor(c)}
                  style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',border:color===c?'3px solid white':'2px solid rgba(255,255,255,.25)',transform:color===c?'scale(1.25)':'scale(1)',transition:'transform .12s',boxShadow:color===c?`0 0 10px ${c}`:'none'}}/>
              ))}
            </div>
            <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Pincel:</div>
              {BRUSHES.map(b=>(
                <button key={b.id} onClick={()=>setBrush(b.id)}
                  style={{background:brush===b.id?`${currentDistrict.accent}33`:'rgba(255,255,255,.07)',border:brush===b.id?`2px solid ${currentDistrict.accent}`:'1px solid rgba(255,255,255,.15)',borderRadius:10,padding:'3px 9px',fontSize:13,color:'white',cursor:'pointer'}}>{b.icon}</button>
              ))}
              <input type="range" min="6" max="60" value={brushSize} onChange={e=>setBrushSize(+e.target.value)} style={{width:70,marginLeft:4}}/>
              <input type="range" min="10" max="100" value={Math.round(opacity*100)} onChange={e=>setOpacity(+e.target.value/100)} style={{width:60}}/>
            </div>
          </div>
        )}

        {/* CUSTOMIZE TAB */}
        {tab==='customize'&&(
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Toca un ciudadano ↑ para seleccionar</div>
            <div style={{display:'flex',gap:8}}>
              {citizens.map(ch=>(
                <div key={ch.id} onClick={()=>{setSelectedCit(ch.id);setShowCustomize(true);}}
                  style={{fontSize:28,cursor:'pointer',filter:`drop-shadow(0 0 8px ${ch.color})`}}>{ch.emoji}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.1}50%{opacity:.9}}
        @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.05}}
        @keyframes tw2{0%,100%{opacity:.4}50%{opacity:.85}}
        @keyframes tw3{0%,100%{opacity:.55}50%{opacity:.08}}
        @keyframes tqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
        @keyframes tqHappy{0%{transform:scale(1) rotate(0)}33%{transform:scale(1.22) rotate(10deg)}66%{transform:scale(1.22) rotate(-10deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes tqDance{0%{transform:rotate(-14deg) scale(1.15)}100%{transform:rotate(14deg) scale(1.15)}}
        @keyframes charFloat{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}
        @keyframes charHappy{0%{transform:translateY(0) rotate(-5deg)}100%{transform:translateY(-10px) rotate(5deg)}}
        @keyframes charExcited{0%{transform:scale(1) rotate(-8deg)}100%{transform:scale(1.1) rotate(8deg)}}
        @keyframes charSleepy{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(4px) rotate(3deg)}}
        @keyframes specialPulse{0%,100%{filter:brightness(1) drop-shadow(0 0 8px gold)}50%{filter:brightness(1.5) drop-shadow(0 0 22px gold)}}
        @keyframes objF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes objF1{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes objF2{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
        @keyframes objF3{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
        @keyframes objF4{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-5px) translateX(4px)}}
        @keyframes objF5{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.05) rotate(2deg)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.4) translateY(0)}100%{opacity:0;transform:scale(2.5) translateY(-80px)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.3)}70%{opacity:1;transform:translateX(-50%) scale(1.08)}100%{transform:translateX(-50%) scale(1)}}
        @keyframes bubblePop{0%{opacity:0;transform:translateX(-50%) scale(.6)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
