'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

/* ══ AUDIO ENGINE ══ */
let AC: AudioContext | null = null;
const ac = (): AudioContext => { if (!AC) AC = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return AC!; };
const note = (f: number, d = 0.3, v = 0.2, t: OscillatorType = 'sine') => {
  try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.start(); o.stop(c.currentTime + d); } catch {}
};
const melody = (fs: number[], gap = 90, d = 0.32, v = 0.18) => fs.forEach((f,i) => setTimeout(() => note(f,d,v), i*gap));
const vib = (p: number | number[]) => { try { (navigator as any).vibrate?.(p); } catch {} };
const r  = (a: number, b: number) => a + Math.random()*(b-a);
const ri = (a: number, b: number) => Math.floor(r(a,b));
let uid = 1000;

/* ══ TYPES ══ */
type Need  = 'hunger'|'sleep'|'fun'|'bath'|'love';
type Mood  = 'happy'|'neutral'|'excited'|'sleepy'|'sad';

interface Citizen {
  id:number; name:string; emoji?:string; img?:string; color:string; isMascot?:boolean;
  x:number; y:number; zIndex:number; // x/y en % DE LA IMAGEN, no del viewport
  needs:Record<Need,number>; mood:Mood;
  bubble:string; bubbleTimer:number;
  hair:number; suit:number; acc:number;
  dragging:boolean; scale:number;
}
interface BuildingItem {
  id:number; emoji:string; label:string;
  x:number; y:number; sz:number; color:string;
  zIndex:number; dragging:boolean; scale:number;
  action:Need; zoneHint:string; // qué zona da el bonus de feedback
}
type Sticker  = {id:number; emoji:string; x:number; y:number; sz:number; rotation:number;};
type Particle = {id:number; x:number; y:number; e:string;};

/* ══ PERSONAJES DE PLANETA TIQUI (sin relación a ninguna franquicia) ══ */
const CITIZENS_DEF = [
  {name:'Tizi',   emoji:'👧', color:'#FF6B9D'},
  {name:'Coti',   emoji:'👦', color:'#7CFC00'},
  {name:'Zoe',    emoji:'👩', color:'#C77DFF'},
  {name:'Nano',   emoji:'🧑', color:'#4D96FF'},
  {name:'Tico',   emoji:'🐕', color:'#DEB887'},
  {name:'ToqWow', img:'/toqwow-character-full.png', color:'#B8A9FF', isMascot:true},
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
  bath:   ()=>melody([400,500,600,800]),
  love:   ()=>melody([659,784,880,1047,880,784]),
};
const MOOD_BUBBLE: Record<Mood,string> = {
  happy:'😊 ¡Feliz!', neutral:'😐 Hmm...', excited:'🤩 ¡Genial!',
  sleepy:'😴 Sueño...', sad:'😢 Necesito algo',
};
const GREET_SND = ()=>melody([784,988,1175],70,0.22,0.16);
const GREET_BUBBLES = ['👋😊','😄✨','🥰','😊💫'];
function calcMood(n: Record<Need,number>): Mood {
  const avg = Object.values(n).reduce((a,b)=>a+b,0)/5;
  if (n.sleep<20) return 'sleepy';
  if (avg>80) return 'happy';
  if (avg>65) return 'excited';
  if (avg<28) return 'sad';
  return 'neutral';
}

/* ══ ZONAS DE PLANETA TIQUI ══
   Coordenadas en % DE LA IMAGEN (planeta-tiqui-bg.jpg, 2544×1456), no del
   viewport — son aproximadas a ojo sobre el arte generado. Activá el botón
   🔧 (debug) en el juego para ver los rectángulos dibujados encima de la
   imagen real y ajustar estos números a mano si no calzan perfecto. */
interface Zone { id:string; name:string; x:number; y:number; w:number; h:number; needs:Need[]; }
const ZONES: Zone[] = [
  { id:'cloud-house',    name:'Casa Nube',            x:19, y:22, w:16, h:21, needs:['sleep','love'] },
  { id:'garden',         name:'Jardín Estelar',       x:34, y:17, w:17, h:19, needs:['love','fun'] },
  { id:'kitchen',        name:'Cocina de Estrellas',  x:52, y:15, w:13, h:23, needs:['hunger'] },
  { id:'snack-stand',    name:'Puesto de Meriendas',  x:66, y:27, w:15, h:18, needs:['hunger'] },
  { id:'pool',           name:'Pileta Burbujeante',   x:42, y:38, w:20, h:22, needs:['bath'] },
  { id:'candy-counter',  name:'Mostrador de Golosinas', x:67, y:50, w:18, h:19, needs:['hunger','fun'] },
  { id:'music-stage',    name:'Escenario Brillante',  x:52, y:59, w:20, h:25, needs:['fun'] },
  { id:'rocket-garage',  name:'Garaje del Cohete',    x:27, y:57, w:18, h:24, needs:['fun'] },
  { id:'hammock',        name:'Rincón Hamaca',        x:15, y:47, w:13, h:18, needs:['sleep'] },
];

/* ══ OBJETOS ARRASTRABLES (100% originales, sin nombres de marcas) ══ */
const ZONE_ITEMS: {emoji:string;label:string;action:Need;color:string;zoneHint:string}[] = [
  {emoji:'🍕',label:'Pizza Estelar',   action:'hunger',color:'#FF6B6B',zoneHint:'kitchen'},
  {emoji:'🍔',label:'Hamburguesa',     action:'hunger',color:'#DEB887',zoneHint:'kitchen'},
  {emoji:'🍜',label:'Sopa Cósmica',    action:'hunger',color:'#FFD700',zoneHint:'kitchen'},
  {emoji:'🧁',label:'Cupcake',         action:'hunger',color:'#FFB3BA',zoneHint:'snack-stand'},
  {emoji:'🍦',label:'Helado Neón',     action:'hunger',color:'#00D4C8',zoneHint:'snack-stand'},
  {emoji:'🧃',label:'Jugo Galaxia',    action:'hunger',color:'#FF6B6B',zoneHint:'snack-stand'},
  {emoji:'🍭',label:'Chupetín',        action:'hunger',color:'#FF69B4',zoneHint:'candy-counter'},
  {emoji:'🍬',label:'Caramelo',        action:'hunger',color:'#C77DFF',zoneHint:'candy-counter'},
  {emoji:'💤',label:'Almohada Suave',  action:'sleep', color:'#B8A9FF',zoneHint:'hammock'},
  {emoji:'🌙',label:'Manta de Luna',   action:'sleep', color:'#87CEEB',zoneHint:'cloud-house'},
  {emoji:'🧸',label:'Osito',           action:'sleep', color:'#DEB887',zoneHint:'cloud-house'},
  {emoji:'🎵',label:'Nota Musical',    action:'fun',   color:'#FF69B4',zoneHint:'music-stage'},
  {emoji:'🎤',label:'Micrófono',       action:'fun',   color:'#C77DFF',zoneHint:'music-stage'},
  {emoji:'🚀',label:'Cohetecito',      action:'fun',   color:'#87CEEB',zoneHint:'rocket-garage'},
  {emoji:'🛸',label:'Platillo Volador',action:'fun',   color:'#00D4C8',zoneHint:'rocket-garage'},
  {emoji:'🌸',label:'Flor Mágica',     action:'fun',   color:'#FFB3D1',zoneHint:'garden'},
  {emoji:'🦋',label:'Mariposa',        action:'fun',   color:'#C77DFF',zoneHint:'garden'},
  {emoji:'🎈',label:'Globo',           action:'fun',   color:'#FF6B9D',zoneHint:'garden'},
  {emoji:'🫧',label:'Burbujas',        action:'bath',  color:'#00BFFF',zoneHint:'pool'},
  {emoji:'🦆',label:'Patito de Baño',  action:'bath',  color:'#FFD700',zoneHint:'pool'},
  {emoji:'💧',label:'Gotita',          action:'bath',  color:'#00CED1',zoneHint:'pool'},
  {emoji:'💝',label:'Corazón',         action:'love',  color:'#FF4500',zoneHint:'cloud-house'},
  {emoji:'🎁',label:'Regalo',          action:'love',  color:'#FF6B9D',zoneHint:'garden'},
  {emoji:'🌟',label:'Estrella de Cariño',action:'love', color:'#FFD700',zoneHint:'cloud-house'},
];

const STICKERS_SET = ['⭐','🌟','💫','✨','🌈','🦋','🌸','💎','🎈','🪐'];

const IMG_W = 2544, IMG_H = 1456;

export default function Mundo0() {
  const router = useRouter();
  const worldRef = useRef<HTMLDivElement>(null);

  const [citizens, setCitizens]       = useState<Citizen[]>(() =>
    CITIZENS_DEF.map((c,i) => ({
      id:i, name:c.name, emoji:c.emoji, img:c.img, color:c.color, isMascot:c.isMascot,
      x:10+i*14, y:72, zIndex:10+i,
      needs:{hunger:80,sleep:80,fun:80,bath:80,love:80},
      mood:'happy', bubble:'', bubbleTimer:0,
      hair:i%8, suit:i%8, acc:i%8,
      dragging:false, scale:1,
    }))
  );
  const [buildings, setBuildings]     = useState<BuildingItem[]>(() =>
    ZONE_ITEMS.map((item,i) => ({
      id:uid++, emoji:item.emoji, label:item.label, action:item.action, zoneHint:item.zoneHint,
      x:4+(i%6)*15.5, y:6+Math.floor(i/6)*5, sz:34, color:item.color,
      zIndex:i+1, dragging:false, scale:1,
    }))
  );
  const [particles, setParticles]     = useState<Particle[]>([]);
  const [stickers,  setStickers]      = useState<Sticker[]>([]);
  const [comboMsg, setComboMsg]       = useState('');
  const [showCombo, setShowCombo]     = useState(false);
  const [selectedCit, setSelectedCit] = useState<number|null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showZoneDebug, setShowZoneDebug] = useState(false);
  const [dragSticker, setDragSticker] = useState<{emoji:string,sx:number,sy:number}|null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null); // el "mundo" real, tamaño fijo, con scroll horizontal
  const draggingId   = useRef<number|null>(null);
  const draggingBld  = useRef<number|null>(null);
  const dragOff      = useRef({x:0,y:0});
  const maxZ         = useRef(50);
  const dragStickerRef = useRef(false);
  const needTimer    = useRef<ReturnType<typeof setInterval>|null>(null);

  /* Centrar el scroll horizontal al entrar, para que arranque mostrando la
     pileta central en vez del borde izquierdo de la imagen. */
  useEffect(()=>{
    const sc = scrollRef.current; if(!sc) return;
    requestAnimationFrame(()=>{ sc.scrollLeft = (sc.scrollWidth - sc.clientWidth)/2; });
  },[]);

  /* Mano tutorial: solo la primera vez que un chico entra al mundo, sin
     texto — desaparece sola apenas hay un primer toque real. */
  useEffect(()=>{
    try{ if(!localStorage.getItem('tq_m0_tutorial_seen')) setShowTutorial(true); }catch{}
  },[]);
  const dismissTutorial = useCallback(()=>{
    setShowTutorial(false);
    try{ localStorage.setItem('tq_m0_tutorial_seen','1'); }catch{}
  },[]);

  /* Personaje con la necesidad más urgente ahora mismo (para guiar con
     brillo, sin palabras, qué tocar). null si todos están bien. */
  const neediest = useMemo(()=>{
    let worst:{id:number,need:Need,val:number}|null = null;
    citizens.forEach(c=>{
      if(c.isMascot) return;
      (Object.entries(c.needs) as [Need,number][]).forEach(([k,v])=>{
        if(v<45 && (!worst || v<worst.val)) worst = {id:c.id,need:k,val:v};
      });
    });
    return worst;
  },[citizens]);

  /* % de la imagen a partir de un punto de pantalla — usa el rectángulo
     real del contenido (contentRef), que el navegador ya calcula solo
     (aspect-ratio CSS + flex), sin necesidad de recalcular a mano en JS
     ni de escuchar resize/orientationchange. Funciona igual haya scroll
     horizontal o no. */
  const toImgPct = useCallback((clientX:number, clientY:number)=>{
    const box = contentRef.current!.getBoundingClientRect();
    return { x:((clientX-box.left)/box.width)*100, y:((clientY-box.top)/box.height)*100 };
  },[]);

  const zoneAt = useCallback((xPct:number, yPct:number): Zone|null=>{
    return ZONES.find(z => xPct>=z.x && xPct<=z.x+z.w && yPct>=z.y && yPct<=z.y+z.h) || null;
  },[]);

  useEffect(()=>{
    needTimer.current = setInterval(()=>{
      setCitizens(prev=>prev.map(ch=>{
        if(ch.isMascot) return ch;
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

  const interact = useCallback((citId:number, action:Need, bonus:boolean)=>{
    setCitizens(prev=>prev.map(ch=>{
      if(ch.id!==citId) return ch;
      const gain = bonus?45:28;
      const n={...ch.needs,[action]:Math.min(100,ch.needs[action]+gain)};
      const mood=calcMood(n);
      NEED_SND[action](); vib([30,15,30]);
      for(let i=0;i<(bonus?12:6);i++) setTimeout(()=>{
        const box = contentRef.current?.getBoundingClientRect();
        const pxv = (box?.left||0) + r(20,80)/100*(box?.width||0);
        const pyv = (box?.top ||0) + r(25,70)/100*(box?.height||0);
        const pe:Particle[]=[{id:uid++,x:pxv,y:pyv,e:NEED_ICONS[action]}];
        setParticles(p=>[...p,...pe]);
        setTimeout(()=>setParticles(p=>p.filter(pp=>!pe.find(x=>x.id===pp.id))),800);
      },i*60);
      setComboMsg(bonus?`✨ ¡${NEED_LABEL[action]} al máximo! ✨`:`${NEED_ICONS[action]} ¡${NEED_LABEL[action]} satisfecho!`);
      setShowCombo(true); setTimeout(()=>setShowCombo(false),2400);
      return{...ch,needs:n,mood,bubble:MOOD_BUBBLE[mood],bubbleTimer:Date.now()+3000};
    }));
  },[]);

  const onBldDown = useCallback((e:React.PointerEvent,id:number)=>{
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    draggingBld.current=id;maxZ.current++;
    const bld=buildings.find(b=>b.id===id)!;
    const p = toImgPct(e.clientX,e.clientY);
    dragOff.current={x:p.x-bld.x,y:p.y-bld.y};
    setBuildings(prev=>prev.map(b=>b.id===id?{...b,dragging:true,zIndex:maxZ.current,scale:1.25}:b));
    note(ri(300,600),0.1,0.12);vib(12);
  },[buildings,toImgPct]);
  const onBldMove = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingBld.current!==id)return;
    const p = toImgPct(e.clientX,e.clientY);
    setBuildings(prev=>prev.map(b=>b.id===id?{...b,x:Math.max(0,Math.min(96,p.x-dragOff.current.x)),y:Math.max(0,Math.min(94,p.y-dragOff.current.y))}:b));
  },[toImgPct]);
  const onBldUp = useCallback((e:React.PointerEvent, bldId:number)=>{
    if(draggingBld.current!==bldId) return;
    draggingBld.current=null;
    const bld=buildings.find(b=>b.id===bldId);
    setBuildings(prev=>prev.map(b=>b.id===bldId?{...b,dragging:false,scale:1}:b));
    if(!bld) return;
    const p = toImgPct(e.clientX,e.clientY);
    const target = citizens.find(c=>Math.abs(c.x-p.x)<10&&Math.abs(c.y-p.y)<12);
    const z = zoneAt(p.x,p.y);
    const inRightZone = !!z && z.id===bld.zoneHint;
    if (target) interact(target.id, bld.action, inRightZone);
    else if (inRightZone) {
      note(ri(700,1100),0.2,0.16); vib([20,10,20]);
      setComboMsg(`✨ ¡${bld.label} en su lugar! ✨`); setShowCombo(true); setTimeout(()=>setShowCombo(false),1800);
    }
  },[buildings,citizens,interact,toImgPct,zoneAt]);

  /* Reacción universal: CUALQUIER toque a un personaje (en cualquier
     momento, sin necesitar ningún "modo") rebota + suena + muestra un
     globito amistoso. Esto es lo que hace que el juego responda siempre,
     sin que el chico tenga que entender nada primero. */
  const greet = useCallback((id:number)=>{
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,bubble:GREET_BUBBLES[ri(0,GREET_BUBBLES.length)],bubbleTimer:Date.now()+1400}:c));
    GREET_SND(); vib(15);
  },[]);

  const onCitDown = useCallback((e:React.PointerEvent,id:number)=>{
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    dismissTutorial();
    draggingId.current=id;maxZ.current++;
    const ch = citizens.find(c=>c.id===id)!;
    const p = toImgPct(e.clientX,e.clientY);
    dragOff.current={x:p.x-ch.x,y:p.y-ch.y};
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,dragging:true,zIndex:maxZ.current,scale:1.15}:c));
    greet(id);
  },[citizens,toImgPct,greet,dismissTutorial]);
  const onCitMove = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingId.current!==id)return;
    const p = toImgPct(e.clientX,e.clientY);
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,x:Math.max(2,Math.min(94,p.x-dragOff.current.x)),y:Math.max(5,Math.min(92,p.y-dragOff.current.y))}:c));
  },[toImgPct]);
  const onCitUp = useCallback((e:React.PointerEvent,id:number)=>{
    if(draggingId.current!==id)return;
    draggingId.current=null;
    setCitizens(prev=>prev.map(c=>c.id===id?{...c,dragging:false,scale:1}:c));
    note(ri(300,500),0.15,0.12);vib(10);
  },[]);

  /* Tocar el avatar de un personaje en la bandeja de abajo lo selecciona,
     lo saluda, y desliza el mundo hasta donde está — sin texto, sin
     pestañas: "tocá la carita, aparece el amigo". */
  const scrollToCitizen = useCallback((id:number)=>{
    const ch = citizens.find(c=>c.id===id); if(!ch) return;
    const sc = scrollRef.current, ct = contentRef.current; if(!sc||!ct) return;
    const targetLeft = (ch.x/100)*ct.offsetWidth - sc.clientWidth/2;
    sc.scrollTo({left:Math.max(0,Math.min(sc.scrollWidth-sc.clientWidth,targetLeft)),behavior:'smooth'});
  },[citizens]);
  const onTrayCitTap = useCallback((id:number)=>{
    dismissTutorial();
    setSelectedCit(id);
    greet(id);
    scrollToCitizen(id);
  },[greet,scrollToCitizen,dismissTutorial]);

  /* Arrastrar un sticker desde la bandeja hasta el mundo — reemplaza el
     viejo "modo decorar": ahora es la misma acción de drag-and-drop que
     ya usan los objetos, sin necesitar activar nada antes. */
  const onStickerTrayDown = useCallback((e:React.PointerEvent, emoji:string)=>{
    e.stopPropagation();(e.target as Element).setPointerCapture(e.pointerId);
    dismissTutorial();
    dragStickerRef.current = true;
    setDragSticker({emoji, sx:e.clientX, sy:e.clientY});
    note(ri(500,800),0.12,0.14);vib(10);
  },[dismissTutorial]);
  const onStickerTrayMove = useCallback((e:React.PointerEvent)=>{
    if(!dragStickerRef.current)return;
    setDragSticker(d=>d?{...d,sx:e.clientX,sy:e.clientY}:d);
  },[]);
  const onStickerTrayUp = useCallback((e:React.PointerEvent)=>{
    if(!dragStickerRef.current)return;
    dragStickerRef.current=false;
    const box = contentRef.current?.getBoundingClientRect();
    setDragSticker(d=>{
      if(box && d){
        const x=((e.clientX-box.left)/box.width)*100, y=((e.clientY-box.top)/box.height)*100;
        if(x>=0&&x<=100&&y>=0&&y<=100){
          const s:Sticker={id:uid++,emoji:d.emoji,x,y,sz:ri(30,50),rotation:r(-20,20)};
          setStickers(prev=>[...prev,s]);
          note(ri(700,1100),0.2,0.16);vib([15,10,15]);
        }
      }
      return null;
    });
  },[]);

  return (
    <div ref={worldRef} className="tq-m0-root" onPointerDownCapture={dismissTutorial}
      style={{width:'100vw',overflow:'hidden',position:'relative',fontFamily:'system-ui,sans-serif',background:'#1a1040'}}>

      {/* Contenedor con scroll horizontal: el mundo se ve a tamaño completo
          (altura de pantalla) y se desliza de lado a lado para explorarlo,
          en vez de achicarse para entrar todo de una vez (eso era lo que
          causaba que todo apareciera amontonado en una franja chiquita). */}
      <div ref={scrollRef}
        style={{position:'absolute',inset:0,overflowX:'auto',overflowY:'hidden',
          display:'flex',WebkitOverflowScrolling:'touch'}}>
        <div ref={contentRef}
          style={{position:'relative',height:'100%',aspectRatio:`${IMG_W} / ${IMG_H}`,flexShrink:0,touchAction:'pan-x',isolation:'isolate'}}>

          <img src="/planeta-tiqui-bg.jpg" alt="Planeta Tiqui" draggable={false}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'fill',pointerEvents:'none',zIndex:0}}/>

          {showZoneDebug && ZONES.map(z=>(
            <div key={z.id} style={{position:'absolute',left:`${z.x}%`,top:`${z.y}%`,width:`${z.w}%`,height:`${z.h}%`,
              border:'2px dashed rgba(255,255,255,.8)',background:'rgba(255,0,150,.15)',zIndex:3,pointerEvents:'none',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:'1.1vh',fontWeight:800,color:'white',background:'rgba(0,0,0,.6)',padding:'2px 6px',borderRadius:6,whiteSpace:'nowrap'}}>{z.name}</span>
            </div>
          ))}

          {buildings.map(bld=>{
            const isGuide = !!neediest && bld.action===neediest.need;
            return (
            <div key={bld.id}
              onPointerDown={e=>onBldDown(e,bld.id)}
              onPointerMove={e=>onBldMove(e,bld.id)}
              onPointerUp={e=>onBldUp(e,bld.id)}
              style={{position:'absolute',left:`${bld.x}%`,top:`${bld.y}%`,
                fontSize:'4.2vh',lineHeight:1,touchAction:'none',userSelect:'none',
                zIndex:bld.dragging?80:bld.zIndex+3,
                cursor:bld.dragging?'grabbing':'grab',
                transform:`scale(${bld.scale})`,
                transition:bld.dragging?'none':'transform .15s',
                filter:isGuide?`drop-shadow(0 0 10px gold) drop-shadow(0 4px 12px ${bld.color}88)`:`drop-shadow(0 4px 12px ${bld.color}88)`,
                animation:bld.dragging?'none':`objF${bld.id%6} ${3+bld.id*.2}s ease-in-out infinite${isGuide?', guideGlow 1s ease-in-out infinite':''}`,
                pointerEvents:'auto',
              }}>{bld.emoji}</div>
          );})}

          {citizens.map(ch=>{
            const showBubble = ch.bubbleTimer>Date.now();
            const critNeed = !ch.isMascot && (Object.entries(ch.needs) as [Need,number][]).find(([,v])=>v<25);
            const isGuide = !!neediest && neediest.id===ch.id;
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
                {!ch.isMascot&&(
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
                )}
                <div
                  onPointerDown={e=>{onCitDown(e,ch.id);setSelectedCit(ch.id);}}
                  onPointerMove={e=>onCitMove(e,ch.id)}
                  onPointerUp={e=>onCitUp(e,ch.id)}
                  style={{cursor:ch.dragging?'grabbing':'grab',userSelect:'none',touchAction:'none',
                    display:'flex',flexDirection:'column',alignItems:'center',
                    transform:`scale(${ch.scale})`,transition:'transform .2s',
                    filter:`drop-shadow(0 0 ${ch.dragging?20:isGuide?18:10}px ${isGuide?'gold':ch.color})`,
                    animation:(ch.dragging?'none':ch.mood==='happy'?'charHappy .8s ease-in-out infinite alternate':ch.mood==='excited'?'charExcited .4s ease-in-out infinite alternate':ch.mood==='sleepy'?'charSleepy 3s ease-in-out infinite':'charFloat 2.5s ease-in-out infinite alternate')+(isGuide?', guideGlow 1s ease-in-out infinite':''),
                  }}>
                  {ch.img ? (
                    <img src={ch.img} alt={ch.name} draggable={false}
                      style={{width:'9vh',height:'auto',objectFit:'contain'}}/>
                  ) : (<>
                    <div style={{fontSize:'1.6vh'}}>{ACC_OPTS[ch.acc]}</div>
                    <div style={{fontSize:'4.4vh'}}>{ch.emoji}</div>
                    <div style={{fontSize:'1.5vh',marginTop:-2}}>{SUIT_OPTS[ch.suit]}</div>
                  </>)}
                  <div style={{fontSize:'1.4vh',fontWeight:700,color:'white',textShadow:'0 1px 4px rgba(0,0,0,.8)',
                    background:`${ch.color}44`,borderRadius:8,padding:'1px 6px',marginTop:2,whiteSpace:'nowrap'}}>{ch.name}</div>
                </div>
              </div>
            );
          })}

          {stickers.map(s=>(
            <div key={s.id} onClick={()=>setStickers(prev=>prev.filter(x=>x.id!==s.id))}
              style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,fontSize:s.sz,lineHeight:1,userSelect:'none',zIndex:8,cursor:'pointer',transform:`rotate(${s.rotation}deg)`}}>{s.emoji}</div>
          ))}

          {/* Mano tutorial (solo la primera vez): apunta al personaje que
              más necesita algo, o a ToqWow si todos están bien. Sin texto. */}
          {showTutorial&&(()=>{
            const target = neediest ? citizens.find(c=>c.id===neediest.id) : citizens[citizens.length-1];
            if(!target) return null;
            return (
              <div style={{position:'absolute',left:`${target.x}%`,top:`${target.y}%`,
                transform:'translate(60%,-10%)',fontSize:'6vh',zIndex:96,pointerEvents:'none',
                filter:'drop-shadow(0 4px 10px rgba(0,0,0,.5))',animation:'tutorialHand 1.1s ease-in-out infinite'}}>👆</div>
            );
          })()}
        </div>
      </div>

      {/* Partículas: van fuera del contenedor de scroll, en coordenadas
          reales de pantalla (ya vienen calculadas así desde interact()). */}
      {particles.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,fontSize:ri(20,32),pointerEvents:'none',zIndex:100,lineHeight:1,animation:'burstP .9s ease-out forwards'}}>{p.e}</div>
      ))}

      {showCombo&&(
        <div style={{position:'absolute',top:'20%',left:'50%',transform:'translateX(-50%)',zIndex:110,textAlign:'center',animation:'comboIn .4s ease-out',pointerEvents:'none'}}>
          <div style={{fontSize:16,fontWeight:800,color:'white',background:'rgba(0,0,0,.7)',borderRadius:24,padding:'10px 22px',backdropFilter:'blur(14px)',boxShadow:'0 0 40px #B8A9FF88'}}>{comboMsg}</div>
        </div>
      )}

      {showCustomize&&selectedCit!==null&&!citizens[selectedCit]?.isMascot&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.82)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
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

      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',zIndex:300,background:'rgba(0,0,0,.4)',backdropFilter:'blur(10px)'}}>
        <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer'}}>← Inicio</button>
        <div style={{fontSize:13,fontWeight:700,color:'white'}}>🪐 Planeta Tiqui</div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setShowZoneDebug(v=>!v)} title="Ver zonas (debug)"
            style={{background:showZoneDebug?'rgba(255,0,150,.3)':'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 10px',fontSize:12,color:'white',cursor:'pointer'}}>🔧</button>
          <button onClick={()=>{if(selectedCit!==null&&!citizens[selectedCit]?.isMascot)setShowCustomize(true);}}
            style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:12,color:'white',cursor:'pointer',opacity:(selectedCit!==null&&!citizens[selectedCit]?.isMascot)?1:0.4}}>✨</button>
        </div>
      </div>

      <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:300,background:'rgba(2,4,20,.94)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,.1)',padding:'8px 12px calc(10px + env(safe-area-inset-bottom))'}}>
        {/* Fila de personajes: tocar selecciona + saluda + desliza el mundo
            hasta ahí. Sin palabras — solo caritas y colores. */}
        <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:7}}>
          {citizens.map(ch=>{
            const isGuide = !!neediest && neediest.id===ch.id;
            return (
              <div key={ch.id} onClick={()=>onTrayCitTap(ch.id)}
                style={{background:selectedCit===ch.id?`${ch.color}33`:'rgba(255,255,255,.07)',
                  border:`1.5px solid ${isGuide?'gold':selectedCit===ch.id?ch.color:'rgba(255,255,255,.15)'}`,
                  borderRadius:16,padding:'6px 8px',cursor:'pointer',flexShrink:0,minWidth:52,textAlign:'center',
                  transition:'all .2s',animation:isGuide?'guideGlow 1s ease-in-out infinite':'none'}}>
                {ch.img ? (
                  <img src={ch.img} alt={ch.name} style={{width:28,height:28,objectFit:'contain',margin:'0 auto'}}/>
                ) : (
                  <div style={{fontSize:24}}>{ch.emoji}</div>
                )}
                {!ch.isMascot&&(
                  <div style={{display:'flex',gap:2,justifyContent:'center',marginTop:4}}>
                    {(Object.entries(ch.needs) as [Need,number][]).map(([need,val])=>(
                      <div key={need} style={{width:3,height:12,background:'rgba(255,255,255,.15)',borderRadius:2,overflow:'hidden',position:'relative'}}>
                        <div style={{position:'absolute',bottom:0,width:'100%',height:`${val}%`,background:val>60?'#7CFC00':val>30?'#FFD700':'#FF6B6B',borderRadius:2,transition:'height .5s'}}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fila de stickers: se arrastran directo desde acá hasta el mundo.
            Tocar un sticker ya puesto en el mundo lo borra (sin botón
            "limpiar" que haya que leer). */}
        <div style={{display:'flex',gap:8,overflowX:'auto'}}>
          {STICKERS_SET.map((emoji,i)=>(
            <div key={i}
              onPointerDown={e=>onStickerTrayDown(e,emoji)}
              onPointerMove={onStickerTrayMove}
              onPointerUp={onStickerTrayUp}
              style={{fontSize:26,flexShrink:0,cursor:'grab',touchAction:'none',userSelect:'none',
                filter:'drop-shadow(0 2px 6px rgba(255,255,255,.25))'}}>{emoji}</div>
          ))}
        </div>
      </div>

      {/* Sticker siguiendo el dedo mientras se arrastra desde la bandeja */}
      {dragSticker&&(
        <div style={{position:'fixed',left:dragSticker.sx,top:dragSticker.sy,transform:'translate(-50%,-50%)',
          fontSize:40,pointerEvents:'none',zIndex:500,filter:'drop-shadow(0 4px 10px rgba(0,0,0,.4))'}}>{dragSticker.emoji}</div>
      )}

      <style>{`
        .tq-m0-root{height:100vh;height:100dvh;}
        @keyframes guideGlow{0%,100%{filter:drop-shadow(0 0 6px gold)}50%{filter:drop-shadow(0 0 20px gold)}}
        @keyframes tutorialHand{0%,100%{transform:translate(60%,-10%) scale(1)}50%{transform:translate(50%,0%) scale(1.15)}}
        @keyframes tqFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
        @keyframes tqHappy{0%{transform:scale(1) rotate(0)}33%{transform:scale(1.22) rotate(10deg)}66%{transform:scale(1.22) rotate(-10deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes tqDance{0%{transform:rotate(-14deg) scale(1.15)}100%{transform:rotate(14deg) scale(1.15)}}
        @keyframes charFloat{0%{transform:translateY(0)}100%{transform:translateY(-8px)}}
        @keyframes charHappy{0%{transform:translateY(0) rotate(-5deg)}100%{transform:translateY(-10px) rotate(5deg)}}
        @keyframes charExcited{0%{transform:scale(1) rotate(-8deg)}100%{transform:scale(1.1) rotate(8deg)}}
        @keyframes charSleepy{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(4px) rotate(3deg)}}
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
