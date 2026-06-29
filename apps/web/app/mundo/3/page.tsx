'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

/* ══════════════════════════════════════
   🎵 AUDIO
══════════════════════════════════════ */
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 90, d = 0.35, v = 0.18) => fs.forEach((f, i) => setTimeout(() => note(f, d, v), i * gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };

/* ══════════════════════════════════════
   📐 TIPOS
══════════════════════════════════════ */
type Need = 'hunger' | 'sleep' | 'fun' | 'bath' | 'love';
type Mood = 'happy' | 'hungry' | 'sleepy' | 'excited' | 'sad' | 'playful' | 'clean' | 'loved';
type Outfit = { hair: string; top: string; acc: string };

type Character = {
  id: number; name: string; baseEmoji: string;
  x: number; y: number; sz: number;
  needs: Record<Need, number>; // 0-100
  mood: Mood; action: string; // current animation label
  dragging: boolean; zIndex: number;
  outfit: Outfit;
  eating: boolean; sleeping: boolean; bathing: boolean; dancing: boolean;
  speechBubble: string; bubbleTimer: number;
  layer: 'front' | 'back';
};

type FurnitureItem = {
  id: number; emoji: string; label: string;
  x: number; y: number; sz: number;
  room: string; placed: boolean; dragging: boolean; zIndex: number;
  action: Need | 'fun' | 'deco'; // what need it satisfies
  color: string;
  layer: 'front' | 'back';
};

type Particle = { id: number; x: number; y: number; emoji: string; vy: number };
type SpeechBubble = { charId: number; text: string; x: number; y: number };

/* ══════════════════════════════════════
   🎭 CONSTANTES
══════════════════════════════════════ */
const HAIR_OPTIONS  = ['👱','🧑','👩','🧒','👧','🧔','👴','👵'];
const TOP_OPTIONS   = ['👕','🧥','👗','🥼','🎽','👘','🥻','🩱'];
const ACC_OPTIONS   = ['🎩','👑','🌂','🎀','🕶️','💍','⌚','🎓'];

const MOODS_EMOJI: Record<Mood, string> = {
  happy: '😊', hungry: '😋', sleepy: '😴', excited: '🤩',
  sad: '😢', playful: '😄', clean: '🤗', loved: '🥰',
};
const MOOD_COLORS: Record<Mood, string> = {
  happy:'#7CFC00', hungry:'#FF8E53', sleepy:'#B8A9FF', excited:'#FFD700',
  sad:'#87CEEB', playful:'#FF6B9D', clean:'#00D4C8', loved:'#FF69B4',
};

const NEED_ICONS: Record<Need, string> = {
  hunger:'🍕', sleep:'💤', fun:'🎮', bath:'🛁', love:'❤️',
};

const ACTION_RESPONSES: Record<string, { speech: string[]; sound: () => void; particle: string }> = {
  eat:   { speech:['¡Qué rico!','¡Mmm delicioso!','¡Más por favor!','¡Yummy!'], sound:()=>melody([523,659,784,1047]),  particle:'🍕' },
  sleep: { speech:['Zzz...','Buenas noches...','Qué sueño tengo...','Zzzz...'], sound:()=>note(200,1.5,0.15,'sine'),     particle:'💤' },
  bath:  { speech:['¡Qué fresco!','¡Me encanta bañarme!','¡Splash!','¡Limpio!'], sound:()=>{ note(600,0.2,0.2); setTimeout(()=>note(800,0.2,0.15),150); setTimeout(()=>note(1000,0.2,0.1),300); }, particle:'🫧' },
  play:  { speech:['¡Woohoo!','¡Soy el mejor!','¡Más!','¡Otra vez!'], sound:()=>melody([659,784,880,1047,1175]),         particle:'⭐' },
  hug:   { speech:['¡Te quiero!','¡Abrazo!','¡Eres mi amigo!','💕'], sound:()=>melody([523,659,784]),                     particle:'❤️' },
};

const INIT_CHARACTERS: Omit<Character, 'dragging'|'zIndex'|'eating'|'sleeping'|'bathing'|'dancing'|'speechBubble'|'bubbleTimer'>[] = [
  { id:1, name:'Luna',   baseEmoji:'👧', x:18, y:42, sz:72, needs:{hunger:80,sleep:90,fun:70,bath:85,love:75}, mood:'happy',   action:'idle', outfit:{hair:'👧',top:'👗',acc:'🎀'}, layer:'front' },
  { id:2, name:'Orión',  baseEmoji:'👦', x:52, y:42, sz:72, needs:{hunger:60,sleep:75,fun:90,bath:70,love:80}, mood:'playful', action:'idle', outfit:{hair:'👦',top:'👕',acc:'🎩'}, layer:'front' },
  { id:3, name:'Cosmo',  baseEmoji:'🐱', x:34, y:44, sz:60, needs:{hunger:90,sleep:65,fun:80,bath:60,love:95}, mood:'happy',   action:'idle', outfit:{hair:'🐱',top:'👕',acc:''}, layer:'front' },
  { id:4, name:'Nebula', baseEmoji:'🐶', x:70, y:44, sz:60, needs:{hunger:75,sleep:80,fun:95,bath:75,love:85}, mood:'excited', action:'idle', outfit:{hair:'🐶',top:'🎽',acc:''}, layer:'front' },
];

const INIT_FURNITURE: Omit<FurnitureItem,'placed'|'dragging'|'zIndex'>[] = [
  // Sala
  { id:10, emoji:'🛋️', label:'Sofá',      x:3,  y:20, sz:62, room:'sala',   action:'fun',    color:'#C77DFF', layer:'back' },
  { id:11, emoji:'📺', label:'Tele',       x:3,  y:32, sz:52, room:'sala',   action:'fun',    color:'#4D96FF', layer:'back' },
  { id:12, emoji:'🎮', label:'Consola',    x:3,  y:44, sz:50, room:'sala',   action:'fun',    color:'#FF6B9D', layer:'front' },
  { id:13, emoji:'🎵', label:'Parlante',   x:3,  y:56, sz:48, room:'sala',   action:'fun',    color:'#FFD700', layer:'front' },
  { id:14, emoji:'🪴', label:'Planta',     x:3,  y:68, sz:46, room:'sala',   action:'fun',    color:'#7CFC00', layer:'back' },
  // Cocina
  { id:20, emoji:'🍕', label:'Pizza',      x:97, y:20, sz:52, room:'cocina', action:'hunger', color:'#FF8E53', layer:'front' },
  { id:21, emoji:'🎂', label:'Torta',      x:97, y:32, sz:54, room:'cocina', action:'hunger', color:'#FF6B9D', layer:'front' },
  { id:22, emoji:'🍦', label:'Helado',     x:97, y:44, sz:50, room:'cocina', action:'hunger', color:'#87CEEB', layer:'front' },
  { id:23, emoji:'🍓', label:'Fresas',     x:97, y:56, sz:46, room:'cocina', action:'hunger', color:'#FF4444', layer:'front' },
  { id:24, emoji:'🧁', label:'Cupcake',    x:97, y:68, sz:48, room:'cocina', action:'hunger', color:'#DDA0DD', layer:'front' },
  // Dormitorio
  { id:30, emoji:'🛏️', label:'Cama',       x:3,  y:77, sz:66, room:'dormi',  action:'sleep',  color:'#B8A9FF', layer:'back' },
  { id:31, emoji:'🧸', label:'Osito',      x:3,  y:87, sz:50, room:'dormi',  action:'love',   color:'#FFD700', layer:'front' },
  // Baño
  { id:40, emoji:'🛁', label:'Bañera',     x:97, y:77, sz:64, room:'banyo',  action:'bath',   color:'#00D4C8', layer:'back' },
  { id:41, emoji:'🪥', label:'Cepillo',    x:97, y:87, sz:46, room:'banyo',  action:'bath',   color:'#87CEEB', layer:'front' },
  // Jardín
  { id:50, emoji:'🌺', label:'Flores',     x:46, y:4,  sz:48, room:'jardin', action:'love',   color:'#FFB7C5', layer:'back' },
  { id:51, emoji:'🦋', label:'Mariposa',   x:52, y:4,  sz:44, room:'jardin', action:'fun',    color:'#FF99CC', layer:'front' },
  { id:52, emoji:'⚽', label:'Pelota',     x:58, y:4,  sz:48, room:'jardin', action:'fun',    color:'#7CFC00', layer:'front' },
  { id:53, emoji:'🎨', label:'Pintura',    x:64, y:4,  sz:46, room:'jardin', action:'fun',    color:'#4D96FF', layer:'front' },
  { id:54, emoji:'❤️', label:'Corazón',    x:70, y:4,  sz:42, room:'jardin', action:'love',   color:'#FF69B4', layer:'front' },
];

const ROOMS = [
  { id:'sala',   label:'🛋️ Sala',     x:5,  y:12, w:40, h:42, bg:'rgba(180,120,255,.1)', bdr:'rgba(180,120,255,.35)', emoji:'🛋️' },
  { id:'cocina', label:'🍕 Cocina',   x:55, y:12, w:40, h:42, bg:'rgba(255,160,80,.1)',  bdr:'rgba(255,160,80,.35)',  emoji:'🍕' },
  { id:'dormi',  label:'🛏️ Dormi',   x:5,  y:60, w:40, h:32, bg:'rgba(130,100,220,.1)', bdr:'rgba(130,100,220,.35)', emoji:'🛏️' },
  { id:'banyo',  label:'🛁 Baño',     x:55, y:60, w:40, h:32, bg:'rgba(0,200,200,.08)',  bdr:'rgba(0,200,200,.35)',   emoji:'🛁' },
];

const r  = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.floor(r(a, b));
let uid = 5000;

export default function Mundo3() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);

  const [chars, setChars] = useState<Character[]>(() =>
    INIT_CHARACTERS.map(c => ({ ...c, dragging:false, zIndex:c.id*10, eating:false, sleeping:false, bathing:false, dancing:false, speechBubble:'', bubbleTimer:0 }))
  );
  const [furniture, setFurniture] = useState<FurnitureItem[]>(() =>
    INIT_FURNITURE.map(f => ({ ...f, placed:false, dragging:false, zIndex:f.id }))
  );
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedChar, setSelectedChar] = useState<number | null>(null);
  const [editingChar, setEditingChar] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverRoom, setHoverRoom] = useState<string | null>(null);
  const [comboMsg, setComboMsg] = useState('');
  const [showCombo, setShowCombo] = useState(false);
  const [toqwowPos, setToqwowPos] = useState({ x:44, y:44 });
  const [toqwowMood, setToqwowMood] = useState('idle');
  const [draggingTq, setDraggingTq] = useState(false);
  const [needsTick, setNeedsTick] = useState(0);

  const draggingFurId = useRef<number | null>(null);
  const draggingCharId = useRef<number | null>(null);
  const dragOff = useRef({ x:0, y:0 });
  const maxZ = useRef(300);
  const tqDragging = useRef(false);
  const tqOff = useRef({ x:0, y:0 });

  /* ── Needs decay over time (slow) ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setChars(prev => prev.map(c => {
        if (c.sleeping || c.eating || c.bathing) return c;
        const n = { ...c.needs };
        n.hunger = Math.max(0, n.hunger - 0.8);
        n.sleep  = Math.max(0, n.sleep  - 0.6);
        n.fun    = Math.max(0, n.fun    - 0.5);
        n.bath   = Math.max(0, n.bath   - 0.4);
        n.love   = Math.max(0, n.love   - 0.3);
        // Derive mood from lowest need
        const lowest = Object.entries(n).sort((a,b)=>a[1]-b[1])[0];
        let mood: Mood = c.mood;
        if (lowest[1] < 25) {
          if (lowest[0]==='hunger') mood='hungry';
          else if (lowest[0]==='sleep') mood='sleepy';
          else if (lowest[0]==='fun') mood='sad';
          else if (lowest[0]==='bath') mood='sad';
          else if (lowest[0]==='love') mood='sad';
        } else if (Math.min(...Object.values(n)) > 70) mood='happy';
        return { ...c, needs:n, mood };
      }));
      setNeedsTick(t => t+1);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  /* ── Particles ── */
  const addParticles = useCallback((x: number, y: number, emoji: string, count=6) => {
    const np: Particle[] = Array.from({length:count}, () => ({
      id:uid++, x:x+r(-30,30), y:y+r(-20,10), emoji, vy:r(-2,-4),
    }));
    setParticles(p => [...p,...np]);
    setTimeout(() => setParticles(p => p.filter(pp => !np.find(n=>n.id===pp.id))), 1000);
  }, []);

  /* ── Speech bubble ── */
  const speak = useCallback((charId: number, text: string) => {
    setChars(prev => prev.map(c => c.id===charId ? {...c, speechBubble:text, bubbleTimer:2500} : c));
    setTimeout(() => setChars(prev => prev.map(c => c.id===charId ? {...c, speechBubble:''} : c)), 2500);
  }, []);

  /* ── Combo message ── */
  const showComboMsg = useCallback((msg: string, snd:()=>void) => {
    setComboMsg(msg); setShowCombo(true); snd(); vib([60,30,60]);
    setToqwowMood('dance'); setTimeout(()=>{ setToqwowMood('idle'); setShowCombo(false); }, 2800);
  }, []);

  /* ── Trigger action when furniture dropped on character ── */
  const triggerCharAction = useCallback((charId: number, action: Need|'fun'|'deco', furEmoji: string, dropX:number, dropY:number) => {
    const resp = action==='hunger' ? ACTION_RESPONSES.eat
                : action==='sleep'  ? ACTION_RESPONSES.sleep
                : action==='bath'   ? ACTION_RESPONSES.bath
                : action==='love'   ? ACTION_RESPONSES.hug
                :                     ACTION_RESPONSES.play;
    const speech = resp.speech[ri(0,resp.speech.length)];
    speak(charId, speech);
    resp.sound();
    vib([30,15,30]);
    addParticles(dropX, dropY, resp.particle, 8);

    setChars(prev => prev.map(c => {
      if (c.id!==charId) return c;
      const n = { ...c.needs };
      if (action==='hunger') { n.hunger=Math.min(100,n.hunger+40); }
      if (action==='sleep')  { n.sleep =Math.min(100,n.sleep +40); }
      if (action==='bath')   { n.bath  =Math.min(100,n.bath  +40); }
      if (action==='love')   { n.love  =Math.min(100,n.love  +30); }
      if (action==='fun')    { n.fun   =Math.min(100,n.fun   +35); }

      const allHigh = Object.values(n).every(v=>v>70);
      const mood: Mood = allHigh ? 'happy'
        : action==='hunger' ? 'happy'
        : action==='sleep'  ? 'sleepy'
        : action==='bath'   ? 'clean'
        : action==='love'   ? 'loved'
        : 'excited';

      return {
        ...c, needs:n, mood,
        eating:  action==='hunger',
        sleeping:action==='sleep',
        bathing: action==='bath',
        dancing: action==='fun',
      };
    }));

    // Stop animations after 2s
    setTimeout(() => setChars(prev => prev.map(c => c.id===charId ? {...c,eating:false,sleeping:false,bathing:false,dancing:false} : c)), 2200);

    if (action==='hunger' && furEmoji==='🎂') showComboMsg('🎂🎉 ¡Fiesta de cumpleaños!', ()=>melody([523,523,659,523,784,740,784],100));
    if (action==='fun'    && furEmoji==='⚽') showComboMsg('⚽🏆 ¡Gooool!', ()=>melody([523,659,784,1047,1319]));
    if (action==='bath'   && furEmoji==='🛁') showComboMsg('🛁✨ ¡Súper limpio!', ()=>melody([660,784,1047,1319]));
    if (action==='love'   && furEmoji==='❤️') showComboMsg('❤️🦄 ¡Amor infinito!', ()=>melody([784,1047,1319,1568,2093]));
  }, [speak, addParticles, showComboMsg]);

  /* ══ FURNITURE DRAG ══ */
  const onFurnDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingFurId.current = id; maxZ.current++;
    const wr = worldRef.current!.getBoundingClientRect();
    const f = furniture.find(f=>f.id===id)!;
    dragOff.current = { x:e.clientX-wr.left-(f.x/100)*wr.width, y:e.clientY-wr.top-(f.y/100)*wr.height };
    setFurniture(prev=>prev.map(f=>f.id===id?{...f,dragging:true,zIndex:maxZ.current,placed:false}:f));
    setIsDragging(true);
    note(ri(400,700),0.1,0.12); vib(12);
  }, [furniture]);

  const onFurnMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingFurId.current!==id) return;
    const wr = worldRef.current!.getBoundingClientRect();
    const nx = ((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny = ((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setFurniture(prev=>prev.map(f=>f.id===id?{...f,x:Math.max(0,Math.min(93,nx)),y:Math.max(0,Math.min(90,ny))}:f));
    const px=e.clientX-wr.left, py=e.clientY-wr.top;
    const rm=ROOMS.find(rm=>px>(rm.x/100)*wr.width&&px<((rm.x+rm.w)/100)*wr.width&&py>(rm.y/100)*wr.height&&py<((rm.y+rm.h)/100)*wr.height);
    setHoverRoom(rm?.id||null);
  }, []);

  const onFurnUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingFurId.current!==id) return;
    draggingFurId.current=null; setIsDragging(false); setHoverRoom(null);
    const wr = worldRef.current!.getBoundingClientRect();
    const px=e.clientX-wr.left, py=e.clientY-wr.top;
    const furn = furniture.find(f=>f.id===id)!;

    // Check if dropped ON a character
    const hitChar = chars.find(c => {
      const cx=(c.x/100)*wr.width+(c.sz/2), cy=(c.y/100)*wr.height+(c.sz/2);
      return Math.sqrt((px-cx)**2+(py-cy)**2) < c.sz*0.7;
    });

    if (hitChar) {
      triggerCharAction(hitChar.id, furn.action, furn.emoji, px, py);
      setFurniture(prev=>prev.map(f=>f.id===id?{...f,dragging:false}:f));
      note(ri(600,900),0.2,0.22); vib([25,12,25]);
    } else {
      // Check room placement
      const rm=ROOMS.find(rm=>px>(rm.x/100)*wr.width&&px<((rm.x+rm.w)/100)*wr.width&&py>(rm.y/100)*wr.height&&py<((rm.y+rm.h)/100)*wr.height);
      setFurniture(prev=>prev.map(f=>f.id===id?{...f,dragging:false,placed:!!rm}:f));
      if (rm) { note(ri(500,800),0.2,0.18); addParticles(px,py,'✨',5); }
      else note(ri(300,500),0.12,0.1);
    }
  }, [furniture, chars, triggerCharAction, addParticles]);

  /* ══ CHARACTER DRAG ══ */
  const onCharDown = useCallback((e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingCharId.current=id; maxZ.current++;
    const wr=worldRef.current!.getBoundingClientRect();
    const c=chars.find(c=>c.id===id)!;
    dragOff.current={x:e.clientX-wr.left-(c.x/100)*wr.width, y:e.clientY-wr.top-(c.y/100)*wr.height};
    setChars(prev=>prev.map(c=>c.id===id?{...c,dragging:true,zIndex:maxZ.current}:c));
    setSelectedChar(id);
    note(ri(400,700),0.12,0.15); vib(15);
  }, [chars]);

  const onCharMove = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current!==id) return;
    const wr=worldRef.current!.getBoundingClientRect();
    const nx=((e.clientX-wr.left-dragOff.current.x)/wr.width)*100;
    const ny=((e.clientY-wr.top-dragOff.current.y)/wr.height)*100;
    setChars(prev=>prev.map(c=>c.id===id?{...c,x:Math.max(0,Math.min(90,nx)),y:Math.max(8,Math.min(85,ny))}:c));
  }, []);

  const onCharUp = useCallback((e: React.PointerEvent, id: number) => {
    if (draggingCharId.current!==id) return;
    draggingCharId.current=null;
    const wr=worldRef.current!.getBoundingClientRect();
    const px=e.clientX-wr.left, py=e.clientY-wr.top;

    // Check if character dropped ON placed furniture
    const hitFurn=furniture.find(f=>{
      if (!f.placed && !['front','back'].includes(f.layer)) return false;
      const fx=(f.x/100)*wr.width+(f.sz/2), fy=(f.y/100)*wr.height+(f.sz/2);
      return Math.sqrt((px-fx)**2+(py-fy)**2)<f.sz*0.75;
    });

    if (hitFurn) triggerCharAction(id, hitFurn.action, hitFurn.emoji, px, py);

    // Check if char dropped on another char → hug
    const hitOtherChar=chars.find(c=>{
      if (c.id===id) return false;
      const cx=(c.x/100)*wr.width+(c.sz/2), cy=(c.y/100)*wr.height+(c.sz/2);
      return Math.sqrt((px-cx)**2+(py-cy)**2)<c.sz*0.8;
    });
    if (hitOtherChar) {
      speak(id,'¡Abrazoooo! 💕');
      speak(hitOtherChar.id,'¡Eres mi amigo! 🥰');
      addParticles(px,py,'❤️',10);
      melody([523,659,784,1047,1319]);
      vib([30,15,30,15,60]);
      setChars(prev=>prev.map(c=>(c.id===id||c.id===hitOtherChar.id)?{...c,mood:'loved',needs:{...c.needs,love:Math.min(100,c.needs.love+30)}}:c));
    }

    setChars(prev=>prev.map(c=>c.id===id?{...c,dragging:false}:c));
    addParticles(px,py,'✨',3);
    note(ri(400,700),0.15,0.15); vib(12);
  }, [chars, furniture, triggerCharAction, speak, addParticles]);

  /* ══ TOQWOW ══ */
  const onTqDown=(e:React.PointerEvent)=>{e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);tqDragging.current=true;setDraggingTq(true);const wr=worldRef.current!.getBoundingClientRect();tqOff.current={x:e.clientX-wr.left-(toqwowPos.x/100)*wr.width,y:e.clientY-wr.top-(toqwowPos.y/100)*wr.height};melody([523,659,784]);vib(18);};
  const onTqMove=(e:React.PointerEvent)=>{if(!tqDragging.current)return;const wr=worldRef.current!.getBoundingClientRect();setToqwowPos({x:Math.max(2,Math.min(84,((e.clientX-wr.left-tqOff.current.x)/wr.width)*100)),y:Math.max(8,Math.min(82,((e.clientY-wr.top-tqOff.current.y)/wr.height)*100))});setToqwowMood('dance');};
  const onTqUp=()=>{tqDragging.current=false;setDraggingTq(false);setToqwowMood('happy');setTimeout(()=>setToqwowMood('idle'),1500);melody([784,1047,1319]);vib([25,12,25]);};

  /* ══ OUTFIT EDITOR ══ */
  const updateOutfit = (charId: number, part: keyof Outfit, val: string) => {
    setChars(prev=>prev.map(c=>c.id===charId?{...c,outfit:{...c.outfit,[part]:val}}:c));
    note(ri(600,1000),0.15,0.15); vib(10);
  };

  const tqAnims:Record<string,string>={idle:'tqFloat 3.5s ease-in-out infinite',happy:'tqHappy .4s ease-in-out 3',dance:'tqDance .35s ease-in-out infinite alternate'};

  return (
    <div ref={worldRef}
      style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative',touchAction:'none',fontFamily:'system-ui,sans-serif',
        background:'linear-gradient(135deg,#0a0520 0%,#1a0a40 35%,#0a1a3a 65%,#050d1a 100%)'}}>

      {/* BG sparkles */}
      {Array.from({length:55}).map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',
          width:`${r(1,3)}px`,height:`${r(1,3)}px`,
          background:['#B8A9FF','#FFD700','#FF6B9D','#00D4C8','white'][i%5],
          opacity:r(.1,.7),top:`${r(0,92)}%`,left:`${r(0,100)}%`,
          animation:`tw${i%3} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      ))}

      {/* ROOMS */}
      {ROOMS.map(rm=>(
        <div key={rm.id} style={{position:'absolute',left:`${rm.x}%`,top:`${rm.y}%`,width:`${rm.w}%`,height:`${rm.h}%`,
          borderRadius:20,border:`2px solid ${hoverRoom===rm.id?'rgba(255,255,255,.75)':rm.bdr}`,
          background:hoverRoom===rm.id?rm.bg.replace('.1','.22').replace('.08','.18'):rm.bg,
          transition:'all .2s',pointerEvents:'none',zIndex:2}}>
          <div style={{position:'absolute',top:8,left:12,fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',letterSpacing:1}}>{rm.label}</div>
        </div>
      ))}

      {/* BACK LAYER furniture */}
      {furniture.filter(f=>f.layer==='back'&&!f.dragging).map(f=>(
        <div key={f.id} onPointerDown={e=>onFurnDown(e,f.id)} onPointerMove={e=>onFurnMove(e,f.id)} onPointerUp={e=>onFurnUp(e,f.id)}
          style={{position:'absolute',left:`${f.x}%`,top:`${f.y}%`,fontSize:f.sz,lineHeight:1,touchAction:'none',userSelect:'none',
            zIndex:f.placed?f.zIndex+1:f.zIndex,cursor:'grab',
            filter:f.placed?`drop-shadow(0 0 10px ${f.color})`:`drop-shadow(0 2px 6px ${f.color}55)`,
            animation:`fF${f.id%4} ${3.5+f.id*.15}s ease-in-out infinite`,transition:'filter .2s'}}
          title={f.label}>{f.emoji}</div>
      ))}

      {/* CHARACTERS */}
      {chars.map(c=>(
        <div key={c.id} style={{position:'absolute',left:`${c.x}%`,top:`${c.y}%`,zIndex:c.dragging?200:c.zIndex,touchAction:'none',userSelect:'none',cursor:c.dragging?'grabbing':'grab'}}>
          {/* Speech bubble */}
          {c.speechBubble&&(
            <div style={{position:'absolute',bottom:'105%',left:'50%',transform:'translateX(-50%)',
              background:'white',color:'#333',borderRadius:16,padding:'6px 14px',fontSize:13,fontWeight:700,
              whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.25)',zIndex:300,
              animation:'bubbleIn .3s ease-out'}}>
              {c.speechBubble}
              <div style={{position:'absolute',bottom:-8,left:'50%',transform:'translateX(-50%)',
                width:0,height:0,borderLeft:'8px solid transparent',borderRight:'8px solid transparent',borderTop:'8px solid white'}}/>
            </div>
          )}

          {/* Mood indicator */}
          <div style={{position:'absolute',top:-22,left:'50%',transform:'translateX(-50%)',
            fontSize:20,animation:'moodFloat 2s ease-in-out infinite',pointerEvents:'none'}}>
            {MOODS_EMOJI[c.mood]}
          </div>

          {/* Character body */}
          <div
            onPointerDown={e=>onCharDown(e,c.id)}
            onPointerMove={e=>onCharMove(e,c.id)}
            onPointerUp={e=>onCharUp(e,c.id)}
            onClick={()=>setEditingChar(c.id===editingChar?null:c.id)}
            style={{fontSize:c.sz,lineHeight:1,
              filter:`drop-shadow(0 4px 12px ${MOOD_COLORS[c.mood]}88)`,
              transform:`scale(${c.dragging?1.18:1})`,transition:'transform .18s',
              animation: c.eating   ? 'charEat .4s ease-in-out infinite alternate'
                        : c.sleeping ? 'charSleep 1.5s ease-in-out infinite'
                        : c.bathing  ? 'charBath .6s ease-in-out infinite'
                        : c.dancing  ? 'charDance .4s ease-in-out infinite alternate'
                        : c.dragging ? 'none'
                        : `charIdle${c.id%3} ${2.5+c.id*.3}s ease-in-out infinite`}}>
            {c.baseEmoji}
          </div>

          {/* Outfit accessories */}
          <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',fontSize:20,pointerEvents:'none'}}>
            {c.outfit.acc}
          </div>

          {/* Name tag */}
          <div style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,.7)',fontWeight:700,marginTop:2,pointerEvents:'none'}}>{c.name}</div>

          {/* Needs bar (tiny) */}
          <div style={{display:'flex',gap:2,marginTop:3,justifyContent:'center',pointerEvents:'none'}}>
            {(Object.entries(c.needs) as [Need,number][]).map(([need,val])=>(
              <div key={need} style={{width:6,height:6,borderRadius:'50%',
                background:val>60?'#7CFC00':val>30?'#FFD700':'#FF4444',
                opacity:.9}} title={`${need}: ${Math.round(val)}`}/>
            ))}
          </div>
        </div>
      ))}

      {/* FRONT LAYER furniture + dragging */}
      {furniture.filter(f=>f.layer==='front'||f.dragging).map(f=>(
        <div key={f.id} onPointerDown={e=>onFurnDown(e,f.id)} onPointerMove={e=>onFurnMove(e,f.id)} onPointerUp={e=>onFurnUp(e,f.id)}
          style={{position:'absolute',left:`${f.x}%`,top:`${f.y}%`,fontSize:f.sz,lineHeight:1,touchAction:'none',userSelect:'none',
            zIndex:f.dragging?250:f.placed?f.zIndex+2:f.zIndex,cursor:f.dragging?'grabbing':'grab',
            transform:`scale(${f.dragging?1.2:1})`,transition:f.dragging?'none':'transform .18s, filter .2s',
            filter:f.dragging?`drop-shadow(0 14px 32px ${f.color}) drop-shadow(0 0 20px white)`:f.placed?`drop-shadow(0 0 12px ${f.color})`:`drop-shadow(0 2px 8px ${f.color}66)`,
            animation:f.dragging?'none':`fF${f.id%4} ${3+f.id*.12}s ease-in-out infinite`}}
          title={f.label}>{f.emoji}</div>
      ))}

      {/* TOQWOW */}
      <div onPointerDown={onTqDown} onPointerMove={onTqMove} onPointerUp={onTqUp}
        style={{position:'absolute',left:`${toqwowPos.x}%`,top:`${toqwowPos.y}%`,
          width:'min(110px,18vw)',cursor:draggingTq?'grabbing':'grab',zIndex:190,touchAction:'none',
          filter:`drop-shadow(0 0 ${draggingTq?'30px':'18px'} rgba(184,169,255,.85))`,
          animation:tqAnims[toqwowMood],transition:'filter .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={110} height={140}
          style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen',pointerEvents:'none'}} priority/>
      </div>

      {/* Particles */}
      {particles.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,fontSize:ri(18,28),
          pointerEvents:'none',zIndex:280,lineHeight:1,animation:'burstP .9s ease-out forwards'}}>{p.emoji}</div>
      ))}

      {/* Combo */}
      {showCombo&&(
        <div style={{position:'absolute',top:'28%',left:'50%',transform:'translateX(-50%)',zIndex:290,
          background:'rgba(0,0,0,.72)',backdropFilter:'blur(14px)',borderRadius:24,padding:'16px 28px',
          fontSize:20,fontWeight:800,color:'#FFD700',textAlign:'center',animation:'comboIn .4s ease-out',
          boxShadow:'0 0 40px rgba(255,200,0,.4)',whiteSpace:'nowrap'}}>{comboMsg}</div>
      )}

      {/* OUTFIT EDITOR PANEL */}
      {editingChar!==null&&(()=>{
        const c=chars.find(ch=>ch.id===editingChar)!;
        if(!c) return null;
        return(
          <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:400,
            background:'rgba(10,5,40,.95)',backdropFilter:'blur(16px)',
            borderTop:'2px solid rgba(184,169,255,.4)',padding:'12px 14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontSize:15,fontWeight:700,color:'rgba(255,255,255,.85)'}}>
                ✏️ Personalizar a {c.name}
              </div>
              <button onClick={()=>setEditingChar(null)}
                style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'4px 14px',color:'white',cursor:'pointer',fontSize:13}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[{label:'💇 Cabello/Cara',opts:HAIR_OPTIONS,part:'hair'},{label:'👕 Ropa',opts:TOP_OPTIONS,part:'top'},{label:'🎩 Accesorio',opts:ACC_OPTIONS,part:'acc'}].map(row=>(
                <div key={row.part} style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.5)',minWidth:80,whiteSpace:'nowrap'}}>{row.label}</div>
                  <div style={{display:'flex',gap:5,overflowX:'auto',flex:1}}>
                    {row.opts.map(opt=>(
                      <div key={opt} onClick={()=>updateOutfit(c.id,row.part as keyof Outfit,opt)}
                        style={{fontSize:28,cursor:'pointer',flexShrink:0,transition:'transform .12s',
                          transform:c.outfit[row.part as keyof Outfit]===opt?'scale(1.4)':'scale(1)',
                          filter:c.outfit[row.part as keyof Outfit]===opt?'drop-shadow(0 0 8px gold)':'none'}}>
                        {opt}
                      </div>
                    ))}
                    <div onClick={()=>updateOutfit(c.id,row.part as keyof Outfit,'')}
                      style={{fontSize:20,cursor:'pointer',flexShrink:0,opacity:.5,alignSelf:'center'}}>✕</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* TOP BAR */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',zIndex:50,background:'rgba(0,0,0,.4)',backdropFilter:'blur(8px)'}}>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.18)',borderRadius:50,padding:'7px 16px',fontSize:13,color:'white',cursor:'pointer'}}>← Inicio</button>
        <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.85)'}}>🏠 Casa Galáctica</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',textAlign:'right'}}>
          Tocá {'\n'}los personajes
        </div>
      </div>

      {/* HINT */}
      <div style={{position:'absolute',bottom:editingChar!==null?200:14,left:'50%',transform:'translateX(-50%)',
        color:'rgba(255,255,255,.35)',fontSize:11,pointerEvents:'none',zIndex:40,whiteSpace:'nowrap',textAlign:'center'}}>
        🍕 Arrastrá comida a los personajes · 🛁 Baño · 🎮 Diversión · 💕 Toca los personajes para vestirlos
      </div>

      <style>{`
        @keyframes tw0{0%,100%{opacity:.12}50%{opacity:.9}} @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.08}} @keyframes tw2{0%,100%{opacity:.45}50%{opacity:.9}}
        @keyframes tqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes tqHappy{0%{transform:scale(1)}40%{transform:scale(1.2) rotate(10deg)}80%{transform:scale(1.2) rotate(-10deg)}100%{transform:scale(1)}}
        @keyframes tqDance{0%{transform:rotate(-13deg) scale(1.12)}100%{transform:rotate(13deg) scale(1.12)}}
        @keyframes charIdle0{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes charIdle1{0%,100%{transform:scale(1)}50%{transform:scale(1.06) rotate(3deg)}}
        @keyframes charIdle2{0%,100%{transform:translateX(0)}25%{transform:translateX(8px)}75%{transform:translateX(-8px)}}
        @keyframes charEat{0%{transform:scale(1) rotate(-5deg)}100%{transform:scale(1.15) rotate(5deg)}}
        @keyframes charSleep{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(.95) rotate(3deg)}}
        @keyframes charBath{0%{transform:scale(1) rotate(-8deg)}100%{transform:scale(1.1) rotate(8deg)}}
        @keyframes charDance{0%{transform:scale(1.1) rotate(-12deg) translateY(0)}100%{transform:scale(1.1) rotate(12deg) translateY(-8px)}}
        @keyframes fF0{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes fF1{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes fF2{0%,100%{transform:rotate(0deg)}50%{transform:rotate(5deg)}}
        @keyframes fF3{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
        @keyframes moodFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}
        @keyframes bubbleIn{0%{opacity:0;transform:translateX(-50%) scale(.6)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.3) translateY(0)}100%{opacity:0;transform:scale(2) translateY(-80px) rotate(180deg)}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.4)}60%{opacity:1;transform:translateX(-50%) scale(1.1)}100%{transform:translateX(-50%) scale(1)}}
      `}</style>
    </div>
  );
}
