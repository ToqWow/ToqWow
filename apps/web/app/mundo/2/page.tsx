'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
let uid = 4000;

type ForestObj = {id:number;emoji:string;label:string;x:number;y:number;sz:number;color:string;dragging:boolean;scale:number;zIndex:number;placed:boolean;sound:()=>void;special:boolean;zone:number;};
type Particle = {id:number;x:number;y:number;e:string;};
type Firefly = {id:number;x:number;y:number;opacity:number;};

const ZONES = [
  {id:0,name:'Pradera Mágica',emoji:'🌸',bg:'linear-gradient(180deg,#050015 0%,#0f0030 40%,#050015 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:1,name:'Laguna Encantada',emoji:'💧',bg:'linear-gradient(180deg,#000a15 0%,#001830 40%,#000a15 100%)',accent:'#00BFFF',glow:'rgba(0,191,255,.5)'},
  {id:2,name:'Caverna de Cristal',emoji:'💎',bg:'linear-gradient(180deg,#050010 0%,#0a0020 40%,#050010 100%)',accent:'#C77DFF',glow:'rgba(199,125,255,.5)'},
  {id:3,name:'Jardín de Hadas',emoji:'🧚',bg:'linear-gradient(180deg,#080010 0%,#150020 40%,#080010 100%)',accent:'#FFD700',glow:'rgba(255,215,0,.5)'},
  {id:4,name:'Árbol Milenario',emoji:'🌳',bg:'linear-gradient(180deg,#001200 0%,#002800 40%,#001200 100%)',accent:'#7CFC00',glow:'rgba(124,252,0,.5)'},
  {id:5,name:'Valle de Unicornios',emoji:'🦄',bg:'linear-gradient(180deg,#0a0015 0%,#18002a 40%,#0a0015 100%)',accent:'#FFB3D1',glow:'rgba(255,179,209,.5)'},
  {id:6,name:'Nido de Dragones',emoji:'🐉',bg:'linear-gradient(180deg,#100000 0%,#220000 40%,#100000 100%)',accent:'#FF8E53',glow:'rgba(255,142,83,.5)'},
  {id:7,name:'Río de Estrellas',emoji:'⭐',bg:'linear-gradient(180deg,#000008 0%,#000018 40%,#000008 100%)',accent:'#B8A9FF',glow:'rgba(184,169,255,.5)'},
  {id:8,name:'Aldea de Gnomos',emoji:'🍄',bg:'linear-gradient(180deg,#050800 0%,#0a1200 40%,#050800 100%)',accent:'#98FF98',glow:'rgba(152,255,152,.5)'},
  {id:9,name:'Montaña Arcoíris',emoji:'🌈',bg:'linear-gradient(180deg,#0a0010 0%,#150020 40%,#0a0010 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:10,name:'Isla de las Nubes',emoji:'☁️',bg:'linear-gradient(180deg,#050510 0%,#0a0a20 40%,#050510 100%)',accent:'#87CEEB',glow:'rgba(135,206,235,.5)'},
  {id:11,name:'Selva de Mariposas',emoji:'🦋',bg:'linear-gradient(180deg,#001000 0%,#002200 40%,#001000 100%)',accent:'#C77DFF',glow:'rgba(199,125,255,.5)'},
  {id:12,name:'Cueva de Hongos',emoji:'🍄',bg:'linear-gradient(180deg,#08000f 0%,#12001e 40%,#08000f 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:13,name:'Bosque de Bambú',emoji:'🎋',bg:'linear-gradient(180deg,#001000 0%,#002500 40%,#001000 100%)',accent:'#98FF98',glow:'rgba(152,255,152,.5)'},
  {id:14,name:'Cascada Arcoíris',emoji:'🌈',bg:'linear-gradient(180deg,#000a15 0%,#001530 40%,#000a15 100%)',accent:'#00D4C8',glow:'rgba(0,212,200,.5)'},
  {id:15,name:'Campo de Lucíérnagas',emoji:'✨',bg:'linear-gradient(180deg,#000008 0%,#000015 40%,#000008 100%)',accent:'#FFD700',glow:'rgba(255,215,0,.5)'},
  {id:16,name:'Valle de Flores',emoji:'🌺',bg:'linear-gradient(180deg,#0a0010 0%,#180020 40%,#0a0010 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:17,name:'Lago de Loto',emoji:'🪷',bg:'linear-gradient(180deg,#000a12 0%,#001525 40%,#000a12 100%)',accent:'#FFB3D1',glow:'rgba(255,179,209,.5)'},
  {id:18,name:'Gruta de Esmeraldas',emoji:'💚',bg:'linear-gradient(180deg,#001000 0%,#002000 40%,#001000 100%)',accent:'#00FF7F',glow:'rgba(0,255,127,.5)'},
  {id:19,name:'Prado de Estrellas',emoji:'🌟',bg:'linear-gradient(180deg,#000005 0%,#000012 40%,#000005 100%)',accent:'#FFD700',glow:'rgba(255,215,0,.5)'},
  {id:20,name:'Cueva de Gemas',emoji:'💎',bg:'linear-gradient(180deg,#050010 0%,#0a001e 40%,#050010 100%)',accent:'#00D4C8',glow:'rgba(0,212,200,.5)'},
  {id:21,name:'Bosque de Sueños',emoji:'💤',bg:'linear-gradient(180deg,#050010 0%,#0a0020 40%,#050010 100%)',accent:'#B8A9FF',glow:'rgba(184,169,255,.5)'},
  {id:22,name:'Jardín de Rosas',emoji:'🌹',bg:'linear-gradient(180deg,#0f0005 0%,#200010 40%,#0f0005 100%)',accent:'#FF4500',glow:'rgba(255,69,0,.5)'},
  {id:23,name:'Pantano Estelar',emoji:'🌿',bg:'linear-gradient(180deg,#000a08 0%,#001510 40%,#000a08 100%)',accent:'#7CFC00',glow:'rgba(124,252,0,.5)'},
  {id:24,name:'Valle de Colibríes',emoji:'🐦',bg:'linear-gradient(180deg,#080010 0%,#120020 40%,#080010 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:25,name:'Cueva de Coral',emoji:'🪸',bg:'linear-gradient(180deg,#000a10 0%,#001520 40%,#000a10 100%)',accent:'#FF6B9D',glow:'rgba(255,107,157,.5)'},
  {id:26,name:'Bosque de Cerezos',emoji:'🌸',bg:'linear-gradient(180deg,#0a0010 0%,#160020 40%,#0a0010 100%)',accent:'#FFB3D1',glow:'rgba(255,179,209,.5)'},
  {id:27,name:'Reino de la Luna',emoji:'🌙',bg:'linear-gradient(180deg,#000008 0%,#00001a 40%,#000008 100%)',accent:'#B8A9FF',glow:'rgba(184,169,255,.5)'},
];

const CREATURES_BY_ZONE: Record<number,{emoji:string;label:string;special:boolean;sound:()=>void;color:string}[]> = {
  0: [ // Pradera Mágica
    {emoji:'🦄',label:'Unicornio',special:true,sound:()=>melody([523,659,784,1047,1319,1568]),color:'#FF69B4'},
    {emoji:'🧚',label:'Hada',special:true,sound:()=>melody([1047,1319,1568,2093]),color:'#FFD700'},
    {emoji:'🦋',label:'Mariposa Arcoíris',special:true,sound:()=>{note(880,0.2,0.18);setTimeout(()=>note(1100,0.2,0.14),120);},color:'#C77DFF'},
    {emoji:'🌸',label:'Cerezo Mágico',special:false,sound:()=>note(784,0.25,0.18),color:'#FFB3D1'},
    {emoji:'🌺',label:'Hibisco',special:false,sound:()=>note(659,0.2,0.15),color:'#FF6B9D'},
    {emoji:'🌻',label:'Girasol Gigante',special:false,sound:()=>note(523,0.3,0.2),color:'#FFD700'},
    {emoji:'🌷',label:'Tulipán Rosa',special:false,sound:()=>note(698,0.2,0.15),color:'#FF69B4'},
    {emoji:'🌼',label:'Margarita',special:false,sound:()=>note(740,0.2,0.15),color:'#FFD700'},
    {emoji:'🌹',label:'Rosa Encantada',special:false,sound:()=>note(622,0.25,0.18),color:'#FF4500'},
    {emoji:'🍀',label:'Trébol de la Suerte',special:false,sound:()=>melody([523,659,784]),color:'#7CFC00'},
    {emoji:'🌿',label:'Helecho Mágico',special:false,sound:()=>note(330,0.3,0.2),color:'#7CFC00'},
    {emoji:'🌱',label:'Brote Mágico',special:false,sound:()=>sweep(300,600,0.3),color:'#98FF98'},
    {emoji:'🐝',label:'Abeja Dorada',special:false,sound:()=>note(440,0.2,0.15,'square'),color:'#FFD700'},
    {emoji:'🦗',label:'Grillo Cantor',special:false,sound:()=>note(1200,0.15,0.1,'square'),color:'#7CFC00'},
    {emoji:'🐛',label:'Oruga Arcoíris',special:false,sound:()=>melody([330,392,440]),color:'#98FF98'},
    {emoji:'🐞',label:'Vaquita de San Antonio',special:false,sound:()=>note(660,0.2,0.15),color:'#FF4500'},
    {emoji:'🦎',label:'Lagartija Esmeralda',special:false,sound:()=>note(220,0.3,0.2),color:'#7CFC00'},
    {emoji:'🐸',label:'Rana Canturreando',special:false,sound:()=>note(196,0.4,0.25,'square'),color:'#7CFC00'},
    {emoji:'🐇',label:'Conejito Mágico',special:false,sound:()=>melody([523,659,523]),color:'#FFB3BA'},
    {emoji:'🦔',label:'Erizo de Flores',special:false,sound:()=>note(440,0.3,0.2),color:'#8B4513'},
    {emoji:'🐿️',label:'Ardilla Voladora',special:false,sound:()=>note(660,0.2,0.18),color:'#DEB887'},
    {emoji:'🦊',label:'Zorrito Amigo',special:false,sound:()=>melody([440,523,440]),color:'#FF8E53'},
    {emoji:'🐰',label:'Conejo Blanco',special:false,sound:()=>melody([659,784,659]),color:'#FFFFFF'},
    {emoji:'🦁',label:'León Gentil',special:false,sound:()=>note(150,0.5,0.3,'sawtooth'),color:'#FFD700'},
    {emoji:'🐻',label:'Osito Panda',special:false,sound:()=>note(180,0.5,0.28),color:'#FFFFFF'},
    {emoji:'🦒',label:'Jirafa Mágica',special:false,sound:()=>note(130,0.6,0.25),color:'#FFD700'},
    {emoji:'🦓',label:'Cebra Estelar',special:false,sound:()=>note(165,0.5,0.25),color:'#FFFFFF'},
    {emoji:'🐘',label:'Elefante Azul',special:false,sound:()=>note(87,0.7,0.3,'sawtooth'),color:'#87CEEB'},
    {emoji:'🦋',label:'Mariposa Azul',special:false,sound:()=>note(990,0.2,0.15),color:'#4D96FF'},
    {emoji:'🌙',label:'Luna de Cristal',special:false,sound:()=>melody([528,660,792]),color:'#B8A9FF'},
    {emoji:'⭐',label:'Estrella Cazada',special:false,sound:()=>note(880,0.2,0.18),color:'#FFD700'},
    {emoji:'🌈',label:'Arcoíris Mágico',special:true,sound:()=>melody([523,659,784,1047,1319]),color:'#FF6B9D'},
    {emoji:'✨',label:'Polvo de Hadas',special:false,sound:()=>melody([1319,1568,2093]),color:'#FFD700'},
    {emoji:'💫',label:'Destello Mágico',special:false,sound:()=>sweep(600,1200,0.3),color:'#C77DFF'},
    {emoji:'🎀',label:'Lazo Encantado',special:false,sound:()=>note(784,0.2,0.15),color:'#FF6B9D'},
    {emoji:'💐',label:'Ramo de Hadas',special:false,sound:()=>melody([659,784,880]),color:'#FF6B9D'},
    {emoji:'🌾',label:'Caña de Azúcar',special:false,sound:()=>sweep(300,500,0.25),color:'#FFD700'},
    {emoji:'🪷',label:'Flor de Loto',special:false,sound:()=>note(698,0.25,0.18),color:'#FFB3D1'},
    {emoji:'🍄',label:'Hongo de los Deseos',special:false,sound:()=>note(196,0.4,0.2,'triangle'),color:'#FF6B6B'},
    {emoji:'🌊',label:'Fuente Mágica',special:false,sound:()=>sweep(300,600,0.4),color:'#00BFFF'},
    {emoji:'💎',label:'Cristal de Hadas',special:false,sound:()=>melody([1047,1319,1568]),color:'#00D4C8'},
    {emoji:'🕯️',label:'Vela Mágica',special:false,sound:()=>note(523,0.3,0.18),color:'#FFD700'},
  ],
};

const DEFAULT_FOREST: {emoji:string;label:string;special:boolean;sound:()=>void;color:string}[] = [
  {emoji:'🦄',label:'Unicornio',special:true,sound:()=>melody([523,659,784,1047,1319]),color:'#FF69B4'},
  {emoji:'🧚',label:'Hada',special:true,sound:()=>melody([1047,1319,1568,2093]),color:'#FFD700'},
  {emoji:'🦋',label:'Mariposa Mágica',special:true,sound:()=>note(880,0.2,0.18),color:'#C77DFF'},
  {emoji:'🌸',label:'Cerezo',special:false,sound:()=>note(784,0.25,0.18),color:'#FFB3D1'},
  {emoji:'🌺',label:'Hibisco',special:false,sound:()=>note(659,0.2,0.15),color:'#FF6B9D'},
  {emoji:'🌻',label:'Girasol',special:false,sound:()=>note(523,0.3,0.2),color:'#FFD700'},
  {emoji:'🌷',label:'Tulipán',special:false,sound:()=>note(698,0.2,0.15),color:'#FF69B4'},
  {emoji:'🌼',label:'Margarita',special:false,sound:()=>note(740,0.2,0.15),color:'#FFD700'},
  {emoji:'🌹',label:'Rosa',special:false,sound:()=>note(622,0.25,0.18),color:'#FF4500'},
  {emoji:'🍀',label:'Trébol',special:false,sound:()=>melody([523,659,784]),color:'#7CFC00'},
  {emoji:'🌿',label:'Helecho',special:false,sound:()=>note(330,0.3,0.2),color:'#7CFC00'},
  {emoji:'🍄',label:'Hongo Mágico',special:false,sound:()=>note(196,0.4,0.2,'triangle'),color:'#FF6B6B'},
  {emoji:'🐝',label:'Abeja',special:false,sound:()=>note(440,0.2,0.15,'square'),color:'#FFD700'},
  {emoji:'🦋',label:'Mariposa',special:false,sound:()=>note(880,0.2,0.14),color:'#C77DFF'},
  {emoji:'🐞',label:'Vaquita',special:false,sound:()=>note(660,0.2,0.15),color:'#FF4500'},
  {emoji:'🐸',label:'Rana',special:false,sound:()=>note(196,0.4,0.25,'square'),color:'#7CFC00'},
  {emoji:'🐇',label:'Conejito',special:false,sound:()=>melody([523,659,523]),color:'#FFB3BA'},
  {emoji:'🦊',label:'Zorrito',special:false,sound:()=>melody([440,523,440]),color:'#FF8E53'},
  {emoji:'🦁',label:'León',special:false,sound:()=>note(150,0.5,0.3,'sawtooth'),color:'#FFD700'},
  {emoji:'🐻',label:'Oso',special:false,sound:()=>note(180,0.5,0.28),color:'#DEB887'},
  {emoji:'🌙',label:'Luna',special:false,sound:()=>melody([528,660,792]),color:'#B8A9FF'},
  {emoji:'⭐',label:'Estrella',special:false,sound:()=>note(880,0.2,0.18),color:'#FFD700'},
  {emoji:'🌈',label:'Arcoíris',special:true,sound:()=>melody([523,659,784,1047,1319]),color:'#FF6B9D'},
  {emoji:'✨',label:'Polvo de Hadas',special:false,sound:()=>melody([1319,1568,2093]),color:'#FFD700'},
  {emoji:'💫',label:'Destello',special:false,sound:()=>sweep(600,1200,0.3),color:'#C77DFF'},
  {emoji:'💎',label:'Cristal Mágico',special:false,sound:()=>melody([1047,1319,1568]),color:'#00D4C8'},
  {emoji:'🪷',label:'Loto',special:false,sound:()=>note(698,0.25,0.18),color:'#FFB3D1'},
  {emoji:'🌊',label:'Fuente',special:false,sound:()=>sweep(300,600,0.4),color:'#00BFFF'},
  {emoji:'🦚',label:'Pavo Real',special:false,sound:()=>melody([523,659,784]),color:'#00CED1'},
  {emoji:'🦩',label:'Flamenco',special:false,sound:()=>note(440,0.4,0.2),color:'#FF69B4'},
  {emoji:'🦜',label:'Loro',special:false,sound:()=>melody([440,550,440,550]),color:'#7CFC00'},
  {emoji:'🐦',label:'Pájaro Cantante',special:false,sound:()=>melody([880,1100,880]),color:'#87CEEB'},
  {emoji:'🦢',label:'Cisne',special:false,sound:()=>note(440,0.5,0.2),color:'#FFFFFF'},
  {emoji:'🦅',label:'Águila Dorada',special:false,sound:()=>sweep(400,800,0.3),color:'#FFD700'},
  {emoji:'🐬',label:'Delfín',special:false,sound:()=>sweep(600,1200,0.3),color:'#87CEEB'},
  {emoji:'🐠',label:'Pez Tropical',special:false,sound:()=>note(660,0.2,0.15),color:'#FF6B9D'},
  {emoji:'🐢',label:'Tortuga Sabia',special:false,sound:()=>note(110,0.5,0.25),color:'#7CFC00'},
  {emoji:'🌲',label:'Árbol Encantado',special:false,sound:()=>note(262,0.35,0.2),color:'#7CFC00'},
  {emoji:'🎋',label:'Bambú',special:false,sound:()=>note(392,0.3,0.2),color:'#98FF98'},
  {emoji:'🌳',label:'Roble Mágico',special:false,sound:()=>note(220,0.4,0.2),color:'#228B22'},
  {emoji:'🌴',label:'Palmera Mágica',special:false,sound:()=>note(294,0.35,0.2),color:'#7CFC00'},
  {emoji:'🕯️',label:'Vela de Hadas',special:false,sound:()=>note(523,0.3,0.18),color:'#FFD700'},
];

const getZoneItems = (zoneId: number) => CREATURES_BY_ZONE[zoneId] || DEFAULT_FOREST;

export default function Mundo2() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);

  const [zone, setZone] = useState(0);
  const [showZoneMap, setShowZoneMap] = useState(false);
  const [objects, setObjects] = useState<ForestObj[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [fireflies, setFireflies] = useState<Firefly[]>([]);
  const [comboMsg, setComboMsg] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowPos, setToqwowPos] = useState({x:44,y:62});
  const [toqwowMood, setToqwowMood] = useState<'idle'|'happy'|'dance'>('idle');
  const [draggingTq, setDraggingTq] = useState(false);
  const [objPage, setObjPage] = useState(0);

  const draggingId = useRef<number|null>(null);
  const dragOff = useRef({x:0,y:0});
  const maxZ = useRef(20);
  const tqDragging = useRef(false);
  const tqOff = useRef({x:0,y:0});

  const currentZone = ZONES[zone];
  const zoneItems = getZoneItems(zone);
  const PAGE_SIZE = 14;
  const totalPages = Math.ceil(zoneItems.length/PAGE_SIZE);
  const pageItems = zoneItems.slice(objPage*PAGE_SIZE,(objPage+1)*PAGE_SIZE);

  // Fireflies
  useEffect(() => {
    setFireflies(Array.from({length:55},(_,i)=>({id:i,x:r(2,98),y:r(5,90),opacity:r(0.1,0.9)})));
    const iv = setInterval(()=>{
      setFireflies(prev=>prev.map(f=>({...f,x:Math.max(2,Math.min(98,f.x+r(-1.5,1.5))),y:Math.max(5,Math.min(88,f.y+r(-1,1))),opacity:r(0.05,0.95)})));
    },1200);
    return ()=>clearInterval(iv);
  },[zone]);

  useEffect(() => {
    const items = getZoneItems(zone);
    setObjects(items.map((item,i) => ({
      id: uid++, emoji:item.emoji, label:item.label,
      x: 5 + (i%7)*13, y: 8 + Math.floor(i/7)*20,
      sz: item.special?62:44, color:item.color,
      dragging:false, scale:1, zIndex:i+1, placed:false,
      sound:item.sound, special:item.special, zone,
    })));
    setObjPage(0);
  },[zone]);

  const onObjDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const obj = objects.find(o=>o.id===id)!;
    dragOff.current = {x:e.clientX-wr.left-(obj.x/100)*wr.width, y:e.clientY-wr.top-(obj.y/100)*wr.height};
    setObjects(prev=>prev.map(o=>o.id===id?{...o,dragging:true,zIndex:maxZ.current,scale:1.2}:o));
    obj.sound(); vib(15);
  },[objects]);

  const onObjMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current!==id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setObjects(prev=>prev.map(o=>o.id===id?{...o,x:Math.max(0,Math.min(90,nx)),y:Math.max(0,Math.min(82,ny))}:o));
  },[]);

  const onObjUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingId.current!==id) return;
    draggingId.current = null;
    const obj = objects.find(o=>o.id===id)!;
    setObjects(prev=>prev.map(o=>o.id===id?{...o,dragging:false,scale:1,placed:true}:o));
    if (obj.special) {
      setComboMsg(`${obj.emoji} ¡${obj.label} apareció!`);
      setShowCombo(true);
      setTimeout(()=>setShowCombo(false),2500);
      setToqwowMood('dance'); setTimeout(()=>setToqwowMood('idle'),2000);
      for (let i=0;i<12;i++) setTimeout(()=>{
        const pe: Particle[] = [{id:uid++,x:r(15,85)*window.innerWidth/100,y:r(15,75)*window.innerHeight/100,e:['✨','🌟','💫','🌸','🦋','💎'][ri(0,6)]}];
        setParticles(p=>[...p,...pe]);
        setTimeout(()=>setParticles(p=>p.filter(pp=>!pe.find(x=>x.id===pp.id))),1000);
      },i*60);
      melody([784,1047,1319,1568,2093,1568,1319,1047,784]);
    } else {
      note(ri(400,800),0.15,0.15); vib(10);
      setToqwowMood('happy'); setTimeout(()=>setToqwowMood('idle'),1200);
    }
  },[objects]);

  const onTqDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    tqDragging.current = true; setDraggingTq(true);
    const wr = worldRef.current!.getBoundingClientRect();
    tqOff.current = {x:e.clientX-wr.left-(toqwowPos.x/100)*wr.width, y:e.clientY-wr.top-(toqwowPos.y/100)*wr.height};
    melody([523,659,784]); vib(20);
  },[toqwowPos]);

  const onTqMove = useCallback((e: React.PointerEvent) => {
    if (!tqDragging.current) return;
    const wr = worldRef.current!.getBoundingClientRect();
    setToqwowPos({x:Math.max(2,Math.min(84,((e.clientX-wr.left-tqOff.current.x)/wr.width)*100)), y:Math.max(5,Math.min(80,((e.clientY-wr.top-tqOff.current.y)/wr.height)*100))});
    setToqwowMood('dance');
  },[]);

  const onTqUp = useCallback(() => {
    tqDragging.current = false; setDraggingTq(false);
    setToqwowMood('happy'); setTimeout(()=>setToqwowMood('idle'),1500);
    melody([784,1047,1319]); vib([25,12,25]);
  },[]);

  return (
    <div ref={worldRef} style={{
      width:'100vw',height:'100vh',overflow:'hidden',position:'relative',
      touchAction:'none',fontFamily:'system-ui,sans-serif',
      background:currentZone.bg, transition:'background 0.6s ease',
    }}>
      {/* BG Stars */}
      {useMemo(()=>Array.from({length:70},(_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',zIndex:1,
          width:`${r(1,2)}px`,height:`${r(1,2)}px`,background:'white',
          opacity:r(.03,.5),top:`${r(0,92)}%`,left:`${r(0,100)}%`,
          animation:`tw${i%4} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      )),[zone])}

      {/* FIREFLIES */}
      {fireflies.map(f=>(
        <div key={f.id} style={{
          position:'absolute',left:`${f.x}%`,top:`${f.y}%`,
          width:5,height:5,borderRadius:'50%',
          background:currentZone.accent,
          opacity:f.opacity,
          boxShadow:`0 0 8px 3px ${currentZone.glow}`,
          zIndex:2,pointerEvents:'none',
          transition:'all 1.2s ease',
        }}/>
      ))}

      {/* Objects placed in world */}
      {objects.filter(o=>o.placed).map(obj=>(
        <div key={obj.id}
          onPointerDown={e=>onObjDown(e,obj.id)}
          onPointerMove={e=>onObjMove(e,obj.id)}
          onPointerUp={e=>onObjUp(e,obj.id)}
          style={{position:'absolute',left:`${obj.x}%`,top:`${obj.y}%`,
            fontSize:obj.sz,lineHeight:1,touchAction:'none',userSelect:'none',
            zIndex:obj.dragging?80:obj.zIndex,
            cursor:obj.dragging?'grabbing':'grab',
            transform:`scale(${obj.scale})`,
            transition:obj.dragging?'none':'transform .2s',
            filter:obj.dragging?`drop-shadow(0 12px 28px ${obj.color}) drop-shadow(0 0 20px white)`:obj.special?`drop-shadow(0 0 18px ${obj.color})`:`drop-shadow(0 4px 12px ${obj.color}66)`,
            animation:obj.dragging?'none':obj.special?`magicPulse ${r(1.5,2.5)}s ease-in-out infinite`:`objF${obj.id%6} ${r(2.5,4.5)}s ease-in-out infinite`,
          }}>{obj.emoji}</div>
      ))}

      {/* Particles */}
      {particles.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,fontSize:ri(22,38),pointerEvents:'none',zIndex:90,lineHeight:1,animation:'burstP 1s ease-out forwards'}}>{p.e}</div>
      ))}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{position:'absolute',left:`${toqwowPos.x}%`,top:`${toqwowPos.y}%`,
          width:'min(110px,20vw)',cursor:draggingTq?'grabbing':'grab',zIndex:20,touchAction:'none',
          filter:`drop-shadow(0 0 ${draggingTq?'32px':'18px'} ${currentZone.glow})`,
          animation:toqwowMood==='dance'?'tqDance .35s ease-in-out infinite alternate':toqwowMood==='happy'?'tqHappy .4s ease-in-out 3':'tqFloat 3.5s ease-in-out infinite',
          transform:draggingTq?'scale(1.15)':'scale(1)',transition:'filter .2s,transform .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={110} height={140}
          style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen',pointerEvents:'none'}} priority/>
      </div>

      {/* Combo */}
      {showCombo && (
        <div style={{position:'absolute',top:'28%',left:'50%',transform:'translateX(-50%)',zIndex:100,textAlign:'center',animation:'comboIn .4s ease-out',pointerEvents:'none'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',background:'rgba(0,0,0,.7)',borderRadius:24,padding:'12px 24px',backdropFilter:'blur(14px)',boxShadow:`0 0 40px ${currentZone.glow}`}}>{comboMsg}</div>
        </div>
      )}

      {/* ZONE MAP */}
      {showZoneMap && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',padding:16,overflowY:'auto'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',marginBottom:14}}>🌿 Elige Tu Zona Mágica</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,maxWidth:480,width:'100%'}}>
            {ZONES.map(z=>(
              <div key={z.id} onClick={()=>{setZone(z.id);setShowZoneMap(false);note(659,0.2,0.2);}}
                style={{background:z.id===zone?`${z.accent}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${z.id===zone?z.accent:'rgba(255,255,255,.15)'}`,
                  borderRadius:12,padding:'8px 4px',cursor:'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .2s'}}>
                <div style={{fontSize:22}}>{z.emoji}</div>
                <div style={{fontSize:9,color:'white',textAlign:'center',lineHeight:1.2}}>{z.name}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowZoneMap(false)}
            style={{marginTop:16,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'8px 24px',color:'white',cursor:'pointer',fontSize:14}}>Cerrar</button>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',zIndex:60,background:'rgba(0,0,0,.4)',backdropFilter:'blur(10px)'}}>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer'}}>← Inicio</button>
        <button onClick={()=>setShowZoneMap(true)} style={{background:`${currentZone.accent}22`,border:`1px solid ${currentZone.accent}66`,borderRadius:50,padding:'6px 16px',fontSize:13,fontWeight:700,color:'white',cursor:'pointer'}}>
          {currentZone.emoji} {currentZone.name} ▾
        </button>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{objects.filter(o=>o.placed).length}/{objects.length}</div>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:60,background:'rgba(2,4,16,.93)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.1)',padding:'10px 12px 14px'}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,.35)',textAlign:'center',marginBottom:6}}>🌟 Arrastrá al bosque • Los especiales hacen magia</div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,alignItems:'center'}}>
          {pageItems.map(item=>{
            const obj = objects.find(o=>o.emoji===item.emoji&&!o.placed);
            return (
              <div key={item.label}
                style={{fontSize:item.special?40:32,flexShrink:0,cursor:'grab',
                  filter:item.special?`drop-shadow(0 0 12px ${item.color})`:`drop-shadow(0 2px 6px ${item.color}66)`,
                  opacity:obj?1:0.3,
                  animation:item.special?'magicPulse 1.8s ease-in-out infinite':'none',
                  transition:'opacity .3s'}}
                onPointerDown={e=>{
                  if (!obj) return;
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture(e.pointerId);
                  draggingId.current = obj.id; maxZ.current++;
                  dragOff.current = {x:0,y:0};
                  setObjects(prev=>prev.map(o=>o.id===obj.id?{...o,placed:true,dragging:true,x:ri(5,80),y:ri(10,70),zIndex:maxZ.current,scale:1.2}:o));
                  obj.sound(); vib(15);
                }}
                title={item.label}>{item.emoji}</div>
            );
          })}
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:6}}>
          <button onClick={()=>setObjPage(p=>Math.max(0,p-1))} disabled={objPage===0}
            style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'4px 12px',color:'white',cursor:'pointer',fontSize:12,opacity:objPage===0?0.4:1}}>◀</button>
          <span style={{fontSize:11,color:'rgba(255,255,255,.4)',alignSelf:'center'}}>{objPage+1}/{totalPages}</span>
          <button onClick={()=>setObjPage(p=>Math.min(totalPages-1,p+1))} disabled={objPage===totalPages-1}
            style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:20,padding:'4px 12px',color:'white',cursor:'pointer',fontSize:12,opacity:objPage===totalPages-1?0.4:1}}>▶</button>
          <button onClick={()=>setObjects(prev=>prev.map(o=>({...o,placed:false,x:5+(o.id%7)*13,y:8+Math.floor(o.id%42/7)*20})))}
            style={{background:'rgba(255,80,80,.25)',border:'1px solid rgba(255,100,100,.4)',borderRadius:12,padding:'4px 12px',color:'white',fontSize:11,cursor:'pointer'}}>🔄</button>
        </div>
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.1}50%{opacity:.9}}
        @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.05}}
        @keyframes tw2{0%,100%{opacity:.4}50%{opacity:.85}}
        @keyframes tw3{0%,100%{opacity:.55}50%{opacity:.08}}
        @keyframes tqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes tqHappy{0%{transform:scale(1) rotate(0)}33%{transform:scale(1.2) rotate(10deg)}66%{transform:scale(1.2) rotate(-10deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes tqDance{0%{transform:rotate(-12deg) scale(1.12)}100%{transform:rotate(12deg) scale(1.12)}}
        @keyframes magicPulse{0%,100%{filter:brightness(1) drop-shadow(0 0 10px #FFD700)}50%{filter:brightness(1.5) drop-shadow(0 0 25px #FFD700)}}
        @keyframes objF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes objF1{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes objF2{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
        @keyframes objF3{0%,100%{transform:rotate(0)}50%{transform:rotate(9deg)}}
        @keyframes objF4{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-5px) translateX(4px)}}
        @keyframes objF5{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.05) rotate(3deg)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.4) translateY(0)}100%{opacity:0;transform:scale(2.5) translateY(-80px)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.3)}70%{opacity:1;transform:translateX(-50%) scale(1.1)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
