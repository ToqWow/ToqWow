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
let uid = 3000;

type DinoObj = { id:number; emoji:string; label:string; x:number; y:number; sz:number; color:string; dragging:boolean; scale:number; zIndex:number; placed:boolean; sound:()=>void; special:boolean; era:number; };
type Particle = {id:number;x:number;y:number;e:string;};
type Sticker = {id:number;emoji:string;x:number;y:number;sz:number;rotation:number;};

const ERAS = [
  {id:0, name:'Triásico Volcánico', emoji:'🌋', bg:'linear-gradient(180deg,#1a0500 0%,#3a0a00 40%,#1a0800 100%)', accent:'#FF6B6B', glow:'rgba(255,107,107,.5)'},
  {id:1, name:'Jurásico Selvático', emoji:'🌿', bg:'linear-gradient(180deg,#001500 0%,#003300 40%,#001500 100%)', accent:'#7CFC00', glow:'rgba(124,252,0,.5)'},
  {id:2, name:'Cretácico Oceánico', emoji:'🌊', bg:'linear-gradient(180deg,#000a18 0%,#001835 40%,#000a18 100%)', accent:'#00BFFF', glow:'rgba(0,191,255,.5)'},
  {id:3, name:'Ártico Helado', emoji:'❄️', bg:'linear-gradient(180deg,#000510 0%,#001028 40%,#000510 100%)', accent:'#87CEEB', glow:'rgba(135,206,235,.5)'},
  {id:4, name:'Desierto Ardiente', emoji:'☀️', bg:'linear-gradient(180deg,#1a0a00 0%,#3a2000 40%,#1a0a00 100%)', accent:'#FFD700', glow:'rgba(255,215,0,.5)'},
  {id:5, name:'Cielo Espacial', emoji:'🌌', bg:'linear-gradient(180deg,#000010 0%,#00002a 40%,#000010 100%)', accent:'#B8A9FF', glow:'rgba(184,169,255,.5)'},
  {id:6, name:'Pantano Mágico', emoji:'🍄', bg:'linear-gradient(180deg,#050510 0%,#0a0a25 40%,#050510 100%)', accent:'#C77DFF', glow:'rgba(199,125,255,.5)'},
  {id:7, name:'Mundo Cristal', emoji:'💎', bg:'linear-gradient(180deg,#001015 0%,#002030 40%,#001015 100%)', accent:'#00D4C8', glow:'rgba(0,212,200,.5)'},
  {id:8, name:'Pradera Floral', emoji:'🌸', bg:'linear-gradient(180deg,#0a0010 0%,#1a0025 40%,#0a0010 100%)', accent:'#FF6B9D', glow:'rgba(255,107,157,.5)'},
  {id:9, name:'Cueva Luminosa', emoji:'✨', bg:'linear-gradient(180deg,#050500 0%,#101000 40%,#050500 100%)', accent:'#FFD700', glow:'rgba(255,215,0,.5)'},
  {id:10,name:'Lago Estelar', emoji:'⭐', bg:'linear-gradient(180deg,#000008 0%,#000018 40%,#000008 100%)', accent:'#B8A9FF', glow:'rgba(184,169,255,.5)'},
  {id:11,name:'Bosque Neon', emoji:'🟢', bg:'linear-gradient(180deg,#001000 0%,#002500 40%,#001000 100%)', accent:'#39FF14', glow:'rgba(57,255,20,.5)'},
  {id:12,name:'Montaña Nevada', emoji:'🏔️', bg:'linear-gradient(180deg,#080510 0%,#100a20 40%,#080510 100%)', accent:'#FFFFFF', glow:'rgba(255,255,255,.4)'},
  {id:13,name:'Arrecife Coral', emoji:'🪸', bg:'linear-gradient(180deg,#000a12 0%,#001525 40%,#000a12 100%)', accent:'#FF6B9D', glow:'rgba(255,107,157,.5)'},
  {id:14,name:'Selva Tropical', emoji:'🌴', bg:'linear-gradient(180deg,#001200 0%,#002600 40%,#001200 100%)', accent:'#7CFC00', glow:'rgba(124,252,0,.5)'},
  {id:15,name:'Volcán Activo', emoji:'🌋', bg:'linear-gradient(180deg,#1a0000 0%,#350000 40%,#1a0000 100%)', accent:'#FF4500', glow:'rgba(255,69,0,.5)'},
  {id:16,name:'Tundra Aurora', emoji:'🌌', bg:'linear-gradient(180deg,#000510 0%,#001020 40%,#000510 100%)', accent:'#00D4C8', glow:'rgba(0,212,200,.5)'},
  {id:17,name:'Cañón Rocoso', emoji:'🏜️', bg:'linear-gradient(180deg,#180800 0%,#301500 40%,#180800 100%)', accent:'#DEB887', glow:'rgba(222,184,135,.5)'},
  {id:18,name:'Río Plateado', emoji:'💧', bg:'linear-gradient(180deg,#000a15 0%,#00152a 40%,#000a15 100%)', accent:'#87CEEB', glow:'rgba(135,206,235,.5)'},
  {id:19,name:'Cueva de Gemas', emoji:'💎', bg:'linear-gradient(180deg,#05000f 0%,#0a001e 40%,#05000f 100%)', accent:'#C77DFF', glow:'rgba(199,125,255,.5)'},
  {id:20,name:'Isla Flotante', emoji:'🏝️', bg:'linear-gradient(180deg,#000a1a 0%,#001535 40%,#000a1a 100%)', accent:'#FFD700', glow:'rgba(255,215,0,.5)'},
  {id:21,name:'Planeta Rojo', emoji:'🪐', bg:'linear-gradient(180deg,#150000 0%,#2a0000 40%,#150000 100%)', accent:'#FF6B6B', glow:'rgba(255,107,107,.5)'},
  {id:22,name:'Bosque Bambú', emoji:'🎋', bg:'linear-gradient(180deg,#001000 0%,#002500 40%,#001000 100%)', accent:'#98FF98', glow:'rgba(152,255,152,.5)'},
  {id:23,name:'Cascada Arcoíris', emoji:'🌈', bg:'linear-gradient(180deg,#0a0010 0%,#150020 40%,#0a0010 100%)', accent:'#FF6B9D', glow:'rgba(255,107,157,.5)'},
  {id:24,name:'Desierto Lunar', emoji:'🌕', bg:'linear-gradient(180deg,#080808 0%,#151515 40%,#080808 100%)', accent:'#DEB887', glow:'rgba(222,184,135,.5)'},
  {id:25,name:'Cueva de Hielo', emoji:'🧊', bg:'linear-gradient(180deg,#000510 0%,#000a20 40%,#000510 100%)', accent:'#00BFFF', glow:'rgba(0,191,255,.5)'},
  {id:26,name:'Jardín Estelar', emoji:'🌟', bg:'linear-gradient(180deg,#000008 0%,#000015 40%,#000008 100%)', accent:'#FFD700', glow:'rgba(255,215,0,.5)'},
  {id:27,name:'Tierra Primigenia', emoji:'🌍', bg:'linear-gradient(180deg,#0a0800 0%,#1a1400 40%,#0a0800 100%)', accent:'#7CFC00', glow:'rgba(124,252,0,.5)'},
];

const DINOS_BY_ERA: Record<number, {emoji:string;label:string;special:boolean;sound:()=>void;color:string}[]> = {
  0: [ // Triásico Volcánico
    {emoji:'🦕',label:'Braquiosaurio',special:false,sound:()=>note(120,0.6,0.3,'sine'),color:'#7CFC00'},
    {emoji:'🦖',label:'T-Rex',special:true,sound:()=>{note(80,0.8,0.4,'sawtooth');setTimeout(()=>sweep(200,600,0.4),300);},color:'#FF6B6B'},
    {emoji:'🐉',label:'Dragón Verde',special:true,sound:()=>melody([300,400,500,400,300]),color:'#98FF98'},
    {emoji:'🦎',label:'Iguanodón',special:false,sound:()=>note(180,0.4,0.25),color:'#7CFC00'},
    {emoji:'🐊',label:'Cocodrilo Dino',special:false,sound:()=>note(100,0.5,0.3,'square'),color:'#228B22'},
    {emoji:'🦅',label:'Pterodáctilo',special:false,sound:()=>sweep(400,800,0.3),color:'#87CEEB'},
    {emoji:'🌋',label:'Volcán',special:true,sound:()=>{note(60,1,0.4,'sawtooth');setTimeout(()=>sweep(200,900,0.5),200);},color:'#FF4500'},
    {emoji:'🌊',label:'Ola de Lava',special:false,sound:()=>sweep(300,600,0.4),color:'#FF4500'},
    {emoji:'🌿',label:'Helecho Gigante',special:false,sound:()=>note(330,0.3,0.2),color:'#7CFC00'},
    {emoji:'🌺',label:'Flor Prehistórica',special:false,sound:()=>note(660,0.2,0.15),color:'#FF6B9D'},
    {emoji:'🌳',label:'Árbol Primitivo',special:false,sound:()=>note(220,0.4,0.2),color:'#228B22'},
    {emoji:'🌲',label:'Pino Gigante',special:false,sound:()=>note(262,0.35,0.2),color:'#7CFC00'},
    {emoji:'🪨',label:'Roca Volcánica',special:false,sound:()=>note(100,0.3,0.2,'square'),color:'#8B4513'},
    {emoji:'💧',label:'Gota de Lava',special:false,sound:()=>note(440,0.2,0.15),color:'#FF6B6B'},
    {emoji:'🔥',label:'Fuego Sagrado',special:false,sound:()=>sweep(400,800,0.3),color:'#FF4500'},
    {emoji:'🐢',label:'Tortuga Antigua',special:false,sound:()=>note(110,0.5,0.25),color:'#228B22'},
    {emoji:'🦋',label:'Mariposa Prehis',special:false,sound:()=>{note(880,0.2,0.15);setTimeout(()=>note(1100,0.2,0.1),120);},color:'#C77DFF'},
    {emoji:'🌸',label:'Flor Triásica',special:false,sound:()=>note(784,0.2,0.15),color:'#FFB3D1'},
    {emoji:'🍄',label:'Hongo Gigante',special:false,sound:()=>note(196,0.4,0.2,'triangle'),color:'#FF6B6B'},
    {emoji:'🌾',label:'Gramínea Prehis',special:false,sound:()=>sweep(300,500,0.25),color:'#FFD700'},
    {emoji:'🪸',label:'Coral Fósil',special:false,sound:()=>note(440,0.3,0.18),color:'#FF6B9D'},
    {emoji:'🦟',label:'Insecto Ámbar',special:false,sound:()=>note(2000,0.1,0.08,'square'),color:'#FFD700'},
    {emoji:'🐝',label:'Abeja Prehis',special:false,sound:()=>note(440,0.2,0.15,'square'),color:'#FFD700'},
    {emoji:'🌙',label:'Luna Triásica',special:false,sound:()=>melody([528,660,792]),color:'#B8A9FF'},
    {emoji:'⭐',label:'Estrella',special:false,sound:()=>note(880,0.2,0.18),color:'#FFD700'},
    {emoji:'☄️',label:'Meteorito',special:true,sound:()=>sweep(1200,200,0.5),color:'#FF8E53'},
    {emoji:'🌈',label:'Arcoíris Prehis',special:false,sound:()=>melody([523,659,784,1047]),color:'#FF6B9D'},
    {emoji:'🐬',label:'Plesiosaurio',special:false,sound:()=>sweep(600,1200,0.3),color:'#87CEEB'},
    {emoji:'🦈',label:'Meg Tiburón',special:false,sound:()=>note(80,0.7,0.35,'sawtooth'),color:'#4D96FF'},
    {emoji:'🐙',label:'Pulpo Prehis',special:false,sound:()=>melody([200,300,250,350]),color:'#C77DFF'},
    {emoji:'🦑',label:'Calamar Gigante',special:false,sound:()=>sweep(200,400,0.4),color:'#87CEEB'},
    {emoji:'🐚',label:'Amonita',special:false,sound:()=>note(330,0.4,0.2),color:'#FFD700'},
    {emoji:'🌻',label:'Girasol Prehis',special:false,sound:()=>note(659,0.25,0.18),color:'#FFD700'},
    {emoji:'🎋',label:'Bambú Primitivo',special:false,sound:()=>note(392,0.3,0.2),color:'#7CFC00'},
    {emoji:'💎',label:'Cristal Volcán',special:false,sound:()=>melody([1047,1319,1568]),color:'#00D4C8'},
    {emoji:'🏔️',label:'Montaña Fuego',special:false,sound:()=>note(100,0.6,0.3,'sawtooth'),color:'#FF6B6B'},
    {emoji:'🌵',label:'Cactus Prehis',special:false,sound:()=>note(330,0.35,0.2),color:'#7CFC00'},
    {emoji:'🦔',label:'Erizo Primitivo',special:false,sound:()=>note(440,0.3,0.2),color:'#8B4513'},
    {emoji:'🐿️',label:'Ardilla Prehis',special:false,sound:()=>note(660,0.2,0.18),color:'#DEB887'},
    {emoji:'🦦',label:'Nutria Prehis',special:false,sound:()=>sweep(500,800,0.3),color:'#8B4513'},
    {emoji:'🐸',label:'Rana Gigante',special:false,sound:()=>note(196,0.5,0.25,'square'),color:'#7CFC00'},
    {emoji:'🦗',label:'Grillo Gigante',special:false,sound:()=>note(1200,0.15,0.1,'square'),color:'#228B22'},
  ],
};

// Default objects for other eras — 42 items each
const DEFAULT_ERA_ITEMS: {emoji:string;label:string;special:boolean;sound:()=>void;color:string}[] = [
  {emoji:'🦕',label:'Saurópodo',special:false,sound:()=>note(120,0.6,0.3),color:'#7CFC00'},
  {emoji:'🦖',label:'Carnívoro',special:true,sound:()=>{note(80,0.8,0.4,'sawtooth');},color:'#FF6B6B'},
  {emoji:'🐉',label:'Dragón',special:true,sound:()=>melody([300,400,500]),color:'#98FF98'},
  {emoji:'🦎',label:'Reptil',special:false,sound:()=>note(180,0.4,0.25),color:'#7CFC00'},
  {emoji:'🦅',label:'Pterosaurio',special:false,sound:()=>sweep(400,800,0.3),color:'#87CEEB'},
  {emoji:'🐊',label:'Cocodrilo',special:false,sound:()=>note(100,0.5,0.3,'square'),color:'#228B22'},
  {emoji:'🦋',label:'Mariposa',special:false,sound:()=>note(880,0.2,0.15),color:'#C77DFF'},
  {emoji:'🌿',label:'Helecho',special:false,sound:()=>note(330,0.3,0.2),color:'#7CFC00'},
  {emoji:'🌺',label:'Flor',special:false,sound:()=>note(660,0.2,0.15),color:'#FF6B9D'},
  {emoji:'🌳',label:'Árbol',special:false,sound:()=>note(220,0.4,0.2),color:'#228B22'},
  {emoji:'🌸',label:'Cerezo',special:false,sound:()=>note(784,0.2,0.15),color:'#FFB3D1'},
  {emoji:'🍄',label:'Hongo',special:false,sound:()=>note(196,0.4,0.2,'triangle'),color:'#FF6B6B'},
  {emoji:'🌊',label:'Ola',special:false,sound:()=>sweep(300,600,0.4),color:'#00BFFF'},
  {emoji:'🔥',label:'Fuego',special:false,sound:()=>sweep(400,800,0.3),color:'#FF4500'},
  {emoji:'🌋',label:'Volcán',special:true,sound:()=>note(60,1,0.4,'sawtooth'),color:'#FF4500'},
  {emoji:'🪨',label:'Roca',special:false,sound:()=>note(100,0.3,0.2,'square'),color:'#8B4513'},
  {emoji:'💧',label:'Gota',special:false,sound:()=>note(440,0.2,0.15),color:'#00BFFF'},
  {emoji:'⭐',label:'Estrella',special:false,sound:()=>note(880,0.2,0.18),color:'#FFD700'},
  {emoji:'🌙',label:'Luna',special:false,sound:()=>melody([528,660,792]),color:'#B8A9FF'},
  {emoji:'🌈',label:'Arcoíris',special:false,sound:()=>melody([523,659,784,1047]),color:'#FF6B9D'},
  {emoji:'🐢',label:'Tortuga',special:false,sound:()=>note(110,0.5,0.25),color:'#228B22'},
  {emoji:'🐬',label:'Delfín',special:false,sound:()=>sweep(600,1200,0.3),color:'#87CEEB'},
  {emoji:'🐙',label:'Pulpo',special:false,sound:()=>melody([200,300,250,350]),color:'#C77DFF'},
  {emoji:'🦈',label:'Tiburón',special:false,sound:()=>note(80,0.7,0.35,'sawtooth'),color:'#4D96FF'},
  {emoji:'🌻',label:'Girasol',special:false,sound:()=>note(659,0.25,0.18),color:'#FFD700'},
  {emoji:'🎋',label:'Bambú',special:false,sound:()=>note(392,0.3,0.2),color:'#7CFC00'},
  {emoji:'💎',label:'Cristal',special:false,sound:()=>melody([1047,1319,1568]),color:'#00D4C8'},
  {emoji:'🏔️',label:'Montaña',special:false,sound:()=>note(100,0.6,0.3,'sawtooth'),color:'#87CEEB'},
  {emoji:'☄️',label:'Cometa',special:true,sound:()=>sweep(1200,200,0.5),color:'#FF8E53'},
  {emoji:'🌲',label:'Pino',special:false,sound:()=>note(262,0.35,0.2),color:'#7CFC00'},
  {emoji:'🌴',label:'Palmera',special:false,sound:()=>note(294,0.35,0.2),color:'#7CFC00'},
  {emoji:'🌵',label:'Cactus',special:false,sound:()=>note(330,0.35,0.2),color:'#7CFC00'},
  {emoji:'🐸',label:'Rana',special:false,sound:()=>note(196,0.5,0.25,'square'),color:'#7CFC00'},
  {emoji:'🦔',label:'Erizo',special:false,sound:()=>note(440,0.3,0.2),color:'#8B4513'},
  {emoji:'🐿️',label:'Ardilla',special:false,sound:()=>note(660,0.2,0.18),color:'#DEB887'},
  {emoji:'🦜',label:'Loro',special:false,sound:()=>melody([440,550,440,550]),color:'#FF6B9D'},
  {emoji:'🦚',label:'Pavo Real',special:false,sound:()=>melody([523,659,784]),color:'#00CED1'},
  {emoji:'🦩',label:'Flamenco',special:false,sound:()=>note(440,0.4,0.2),color:'#FF69B4'},
  {emoji:'🐦',label:'Pájaro',special:false,sound:()=>melody([880,1100,880]),color:'#87CEEB'},
  {emoji:'🌾',label:'Gramínea',special:false,sound:()=>sweep(300,500,0.25),color:'#FFD700'},
  {emoji:'🪸',label:'Coral',special:false,sound:()=>note(440,0.3,0.18),color:'#FF6B9D'},
  {emoji:'🐚',label:'Concha',special:false,sound:()=>note(330,0.4,0.2),color:'#FFD700'},
];

const getEraItems = (eraId: number) => DINOS_BY_ERA[eraId] || DEFAULT_ERA_ITEMS;

export default function Mundo1() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);

  const [era, setEra] = useState(0);
  const [showEraMap, setShowEraMap] = useState(false);
  const [objects, setObjects] = useState<DinoObj[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
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

  const currentEra = ERAS[era];
  const eraItems = getEraItems(era);
  const PAGE_SIZE = 14;
  const totalPages = Math.ceil(eraItems.length/PAGE_SIZE);
  const pageItems = eraItems.slice(objPage*PAGE_SIZE,(objPage+1)*PAGE_SIZE);

  useEffect(() => {
    const items = getEraItems(era);
    setObjects(items.map((item,i) => ({
      id: uid++, emoji:item.emoji, label:item.label,
      x: 5 + (i%7)*13, y: 8 + Math.floor(i/7)*20,
      sz: item.special?60:44, color:item.color,
      dragging:false, scale:1, zIndex:i+1, placed:false,
      sound:item.sound, special:item.special, era,
    })));
    setObjPage(0);
  },[era]);

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
    // Special effect on special dinos
    if (obj.special) {
      setComboMsg(`${obj.emoji} ¡${obj.label} liberado!`);
      setShowCombo(true);
      setTimeout(()=>setShowCombo(false),2500);
      setToqwowMood('dance'); setTimeout(()=>setToqwowMood('idle'),2000);
      for (let i=0;i<10;i++) setTimeout(()=>{
        const pe: Particle[] = [{id:uid++,x:r(20,80)*window.innerWidth/100,y:r(20,70)*window.innerHeight/100,e:['⭐','🌟','✨','💫','🎉'][ri(0,5)]}];
        setParticles(p=>[...p,...pe]);
        setTimeout(()=>setParticles(p=>p.filter(pp=>!pe.find(x=>x.id===pp.id))),900);
      },i*70);
    } else {
      note(ri(300,600),0.12,0.12); vib(10);
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
      background:currentEra.bg, transition:'background 0.6s ease',
    }}>
      {/* BG Stars */}
      {useMemo(()=>Array.from({length:90},(_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',zIndex:1,
          width:`${r(1,i%4===0?3.5:2)}px`,height:`${r(1,i%4===0?3.5:2)}px`,
          background:i%6===0?currentEra.accent:'white',
          opacity:r(.05,.8),top:`${r(0,92)}%`,left:`${r(0,100)}%`,
          animation:`tw${i%4} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      )),[era])}

      {/* Objects in world */}
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
            filter:obj.dragging?`drop-shadow(0 12px 28px ${obj.color}) drop-shadow(0 0 20px white)`:`drop-shadow(0 4px 14px ${obj.color}88)`,
            animation:obj.dragging?'none':obj.special?`specialPulse ${r(1.5,2.5)}s ease-in-out infinite`:`objF${obj.id%6} ${r(2.5,4.5)}s ease-in-out infinite`,
          }}>{obj.emoji}</div>
      ))}

      {/* Stickers */}
      {stickers.map(s=>(
        <div key={s.id} onClick={()=>setStickers(prev=>prev.filter(x=>x.id!==s.id))}
          style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,fontSize:s.sz,lineHeight:1,userSelect:'none',zIndex:8,cursor:'pointer',transform:`rotate(${s.rotation}deg)`}}>{s.emoji}</div>
      ))}

      {/* Particles */}
      {particles.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,fontSize:ri(20,32),pointerEvents:'none',zIndex:90,lineHeight:1,animation:'burstP .9s ease-out forwards'}}>{p.e}</div>
      ))}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{position:'absolute',left:`${toqwowPos.x}%`,top:`${toqwowPos.y}%`,
          width:'min(110px,20vw)',cursor:draggingTq?'grabbing':'grab',zIndex:20,touchAction:'none',
          filter:`drop-shadow(0 0 ${draggingTq?'32px':'18px'} ${currentEra.glow})`,
          animation:toqwowMood==='dance'?'tqDance .35s ease-in-out infinite alternate':toqwowMood==='happy'?'tqHappy .4s ease-in-out 3':'tqFloat 3.5s ease-in-out infinite',
          transform:draggingTq?'scale(1.15)':'scale(1)',transition:'filter .2s,transform .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={110} height={140}
          style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen',pointerEvents:'none'}} priority/>
      </div>

      {/* Combo */}
      {showCombo && (
        <div style={{position:'absolute',top:'28%',left:'50%',transform:'translateX(-50%)',zIndex:100,textAlign:'center',animation:'comboIn .4s ease-out',pointerEvents:'none'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',background:'rgba(0,0,0,.7)',borderRadius:24,padding:'12px 24px',backdropFilter:'blur(14px)',boxShadow:`0 0 40px ${currentEra.glow}`}}>{comboMsg}</div>
        </div>
      )}

      {/* ERA MAP */}
      {showEraMap && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.88)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',backdropFilter:'blur(12px)',padding:16,overflowY:'auto'}}>
          <div style={{fontSize:18,fontWeight:800,color:'white',marginBottom:14}}>🦕 Elige Tu Era</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,maxWidth:480,width:'100%'}}>
            {ERAS.map(er=>(
              <div key={er.id} onClick={()=>{setEra(er.id);setShowEraMap(false);note(523,0.2,0.2);}}
                style={{background:er.id===era?`${er.accent}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${er.id===era?er.accent:'rgba(255,255,255,.15)'}`,
                  borderRadius:12,padding:'8px 4px',cursor:'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all .2s'}}>
                <div style={{fontSize:22}}>{er.emoji}</div>
                <div style={{fontSize:9,color:'white',textAlign:'center',lineHeight:1.2}}>{er.name}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowEraMap(false)}
            style={{marginTop:16,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'8px 24px',color:'white',cursor:'pointer',fontSize:14}}>Cerrar</button>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',zIndex:60,background:'rgba(0,0,0,.4)',backdropFilter:'blur(10px)'}}>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer'}}>← Inicio</button>
        <button onClick={()=>setShowEraMap(true)} style={{background:`${currentEra.accent}22`,border:`1px solid ${currentEra.accent}66`,borderRadius:50,padding:'6px 16px',fontSize:13,fontWeight:700,color:'white',cursor:'pointer'}}>
          {currentEra.emoji} {currentEra.name} ▾
        </button>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>{objects.filter(o=>o.placed).length}/{objects.length}</div>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:60,background:'rgba(2,4,16,.93)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.1)',padding:'10px 12px 14px'}}>
        <div style={{fontSize:10,color:'rgba(255,255,255,.35)',textAlign:'center',marginBottom:6}}>⬆ Arrastrá al mundo • Toca para sonido especial</div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,alignItems:'center'}}>
          {pageItems.map(item=>{
            const obj = objects.find(o=>o.emoji===item.emoji&&!o.placed);
            return (
              <div key={item.label}
                style={{fontSize:item.special?38:32,flexShrink:0,cursor:'grab',
                  filter:item.special?`drop-shadow(0 0 10px ${item.color})`:`drop-shadow(0 2px 6px ${item.color}66)`,
                  opacity:obj?1:0.3,
                  animation:item.special?'specialPulse 1.8s ease-in-out infinite':'none',
                  transition:'opacity .3s'}}
                onPointerDown={e=>{
                  if (!obj) return;
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture(e.pointerId);
                  // Place in world at random position
                  draggingId.current = obj.id; maxZ.current++;
                  const wr = worldRef.current!.getBoundingClientRect();
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
          <button onClick={()=>{setObjects(prev=>prev.map(o=>({...o,placed:false,x:5+(o.id%7)*13,y:8+Math.floor(o.id%42/7)*20})));setStickers([]);}}
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
        @keyframes specialPulse{0%,100%{filter:brightness(1) drop-shadow(0 0 8px gold)}50%{filter:brightness(1.4) drop-shadow(0 0 20px gold)}}
        @keyframes objF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes objF1{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes objF2{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
        @keyframes objF3{0%,100%{transform:rotate(0)}50%{transform:rotate(9deg)}}
        @keyframes objF4{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-5px) translateX(4px)}}
        @keyframes objF5{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.05) rotate(3deg)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.4) translateY(0)}100%{opacity:0;transform:scale(2.2) translateY(-75px)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.3)}70%{opacity:1;transform:translateX(-50%) scale(1.1)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
