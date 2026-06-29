'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

/* ══════════════════════════════════════════════════
   AUDIO ENGINE — sintetizador web inline
══════════════════════════════════════════════════ */
let actx: AudioContext | null = null;
const getCtx = () => {
  if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return actx;
};
const note = (freq: number, dur = 0.3, vol = 0.28, type: OscillatorType = 'sine', attack = 0.01) => {
  try {
    const c = getCtx(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.start(); o.stop(c.currentTime + dur);
  } catch {}
};
const chord = (freqs: number[], gap = 100, dur = 0.4, vol = 0.2) =>
  freqs.forEach((f, i) => setTimeout(() => note(f, dur, vol), i * gap));
const playPlanet = (f: number) => { note(f, 0.25, 0.25); note(f * 1.5, 0.15, 0.1, 'sine', 0.05); };
const playMoon   = () => chord([528, 660, 792, 880], 80, 0.5, 0.22);
const playToqwow = () => chord([523,659,784,1047,1319,1568], 90, 0.6, 0.2);
const playWin    = () => { chord([523,659,784,1047,784,1047,1319], 110, 0.7, 0.2); setTimeout(()=>chord([1047,1319,1568],80,0.8,0.25),800); };
const playBlackHole = () => { note(55, 1.5, 0.4, 'sawtooth'); note(110, 0.8, 0.2, 'square', 0.3); };
const playComet  = () => { const c=getCtx(); try{const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.type='sine';o.frequency.setValueAtTime(880,c.currentTime);o.frequency.exponentialRampToValueAtTime(220,c.currentTime+0.4);g.gain.setValueAtTime(0.3,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.4);o.start();o.stop(c.currentTime+0.4);}catch{} };
const vib = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

/* ══════════════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════════════ */
const EMOJIS = ['✨','🌟','💫','⚡','🎉','🌈','💥','🎊','💎','🔮','🪄','🌠','🦋','🌺','🍀','🎈','🎆'];
const COLS   = ['#B8A9FF','#00D4C8','#FFD700','#FFB3D1','#A8EDEA','#87CEEB','#98FB98','#FFA07A','#FF85A1','#85FFBD'];

const PLANETS = [
  { x:9,  y:11, sz:62, bg:'radial-gradient(circle at 35% 30%,#ff9a9e,#c0392b 70%,#7b241c)', gl:'rgba(255,80,80,.7)',   pts:2, freq:330, rings:true },
  { x:74, y:7,  sz:52, bg:'radial-gradient(circle at 40% 35%,#a8edea,#27ae60 60%,#1a6a3a)', gl:'rgba(39,174,96,.7)',   pts:2, freq:440, rings:false},
  { x:87, y:46, sz:40, bg:'radial-gradient(circle at 35% 30%,#ffecd2,#f39c12 60%,#d68910)', gl:'rgba(243,156,18,.7)',  pts:2, freq:550, rings:false},
  { x:3,  y:46, sz:46, bg:'radial-gradient(circle at 40% 30%,#d7bde2,#8e44ad 60%,#5b2c6f)', gl:'rgba(142,68,173,.7)', pts:2, freq:392, rings:true },
  { x:57, y:3,  sz:34, bg:'radial-gradient(circle at 35% 35%,#aed6f1,#2980b9 60%,#1a5276)', gl:'rgba(41,128,185,.7)', pts:2, freq:494, rings:false},
  { x:30, y:6,  sz:28, bg:'radial-gradient(circle at 40% 30%,#f8c8f8,#c84fc8 60%,#8a1a8a)', gl:'rgba(200,80,200,.7)', pts:2, freq:587, rings:false},
  { x:62, y:52, sz:36, bg:'radial-gradient(circle at 35% 30%,#c8f8d8,#2ecc71 60%,#1a7a40)', gl:'rgba(46,204,113,.7)', pts:2, freq:659, rings:false},
];

type SpecialObj = { id:string; emoji:string; label:string; pts:number; onSound:()=>void; onVib:number|number[]; anim:string; special?:string };
const SPECIALS: SpecialObj[] = [
  { id:'rocket',  emoji:'🚀', label:'cohete',   pts:4, onSound:()=>note(660,0.4,0.3,'square'), onVib:50,           anim:'rocketAnim' },
  { id:'ufo',     emoji:'🛸', label:'ovni',     pts:5, onSound:()=>chord([220,277,330],60,0.6,0.2), onVib:[30,20,30,20,30], anim:'ufoAnim', special:'ufo' },
  { id:'comet',   emoji:'☄️',  label:'cometa',  pts:3, onSound:playComet, onVib:40,              anim:'cometAnim' },
  { id:'sat',     emoji:'🛰️',  label:'satélite',pts:3, onSound:()=>note(370,0.3,0.25,'triangle'), onVib:30,        anim:'satAnim' },
  { id:'rainbow', emoji:'🌈', label:'arcoíris', pts:2, onSound:()=>chord([523,659,784,880,1047],80,0.5,0.18), onVib:20, anim:'rainbowAnim' },
  { id:'black',   emoji:'🕳️', label:'agujero',  pts:8, onSound:playBlackHole, onVib:[80,40,80,40,80,40,150],    anim:'blackAnim', special:'blackhole' },
  { id:'meteor',  emoji:'🌑', label:'meteorito',pts:4, onSound:()=>note(200,0.5,0.35,'sawtooth'), onVib:[60,30,60], anim:'meteorAnim' },
  { id:'galaxy',  emoji:'🌌', label:'galaxia',  pts:6, onSound:()=>chord([262,330,392,523],100,0.7,0.2), onVib:[50,25,50,25,100], anim:'galaxyAnim', special:'galaxy' },
  { id:'alien',   emoji:'👾', label:'alien',    pts:5, onSound:()=>chord([440,550,440,330],80,0.4,0.25), onVib:[40,20,40],      anim:'alienAnim', special:'alien' },
  { id:'star4',   emoji:'💥', label:'supernova',pts:7, onSound:()=>chord([880,660,440,220],60,0.8,0.3), onVib:[100,50,100,50,200], anim:'supernovaAnim', special:'supernova' },
];

const r  = (a:number,b:number) => a + Math.random()*(b-a);
const ri = (a:number,b:number) => Math.floor(r(a,b));
let uid = 0;

type Particle = { id:number; x:number; y:number; emoji:string; vx:number; vy:number };
type Bubble   = { id:number; x:number; y:number; color:string; sz:number };
type FObj     = { id:number; x:number; y:number; sz:number; spec:SpecialObj };
type FStar    = { id:number; x:number; y:number; sz:number; emoji:string };
type Ring     = { id:number; x:number; y:number; sz:number; color:string };
type Shockwave= { id:number; x:number; y:number; color:string };

export default function Mundo0() {
  const [parts,    setParts]    = useState<Particle[]>([]);
  const [bubbles,  setBubbles]  = useState<Bubble[]>([]);
  const [fobjs,    setFobjs]    = useState<FObj[]>([]);
  const [fstars,   setFstars]   = useState<FStar[]>([]);
  const [rings,    setRings]    = useState<Ring[]>([]);
  const [shocks,   setShocks]   = useState<Shockwave[]>([]);
  const [score,    setScore]    = useState(0);
  const [comboTxt, setComboTxt] = useState('');
  const [showCombo,setShowCombo]= useState(false);
  const [tqScale,  setTqScale]  = useState(1);
  const [tqDance,  setTqDance]  = useState(false);
  const [tqHint,   setTqHint]   = useState(false);
  const [moonScale,setMoonScale]= useState(1);
  const [win,      setWin]      = useState(false);
  const [bgFlash,  setBgFlash]  = useState('');
  const [aurora,   setAurora]   = useState(false);

  const scoreRef  = useRef(0);
  const comboRef  = useRef(0);
  const comboTimer= useRef<any>(null);
  const idleTimer = useRef<any>(null);
  const winFired  = useRef(false);
  const WIN_SCORE = 50;

  /* ─── Shockwave ─── */
  const addShock = useCallback((x:number,y:number,color:string) => {
    const id=uid++;
    setShocks(s=>[...s,{id,x,y,color}]);
    setTimeout(()=>setShocks(s=>s.filter(sh=>sh.id!==id)),700);
  },[]);

  /* ─── Anillo ─── */
  const addRing = useCallback((x:number,y:number,sz:number,color:string) => {
    const id=uid++;
    setRings(rr=>[...rr,{id,x,y,sz,color}]);
    setTimeout(()=>setRings(rr=>rr.filter(r=>r.id!==id)),600);
  },[]);

  /* ─── Burst de partículas ─── */
  const burst = useCallback((x:number,y:number,count=8,cols=COLS) => {
    const newP: Particle[] = Array.from({length:count},()=>({
      id:uid++, x, y,
      emoji: EMOJIS[ri(0,EMOJIS.length)],
      vx: r(-3,3), vy: r(-4,-1),
    }));
    setParts(p=>[...p,...newP]);
    setTimeout(()=>setParts(p=>p.filter(pp=>!newP.find(n=>n.id===pp.id))),1000);
    const newB: Bubble[] = Array.from({length:6},()=>({
      id:uid++, x:x+r(-30,30), y:y+r(-10,10), color:cols[ri(0,cols.length)], sz:r(5,16),
    }));
    setBubbles(b=>[...b,...newB]);
    setTimeout(()=>setBubbles(b=>b.filter(bb=>!newB.find(n=>n.id===bb.id))),1800);
  },[]);

  /* ─── Score ─── */
  const addScore = useCallback((pts:number,x:number,y:number,sound:()=>void,vibPattern:number|number[]=25,special?:string) => {
    burst(x,y,pts>3?14:8);
    addShock(x,y,COLS[ri(0,COLS.length)]);
    sound();
    vib(vibPattern);

    comboRef.current+=1;
    if(comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current=setTimeout(()=>{comboRef.current=0;},1600);
    const actual=Math.round(pts*(comboRef.current>3?2.5:comboRef.current>1?1.5:1));
    scoreRef.current=Math.min(scoreRef.current+actual,WIN_SCORE);
    setScore(scoreRef.current);

    if(comboRef.current>1){
      setComboTxt(comboRef.current>5?`🔥🔥 x${comboRef.current} COMBO!`:comboRef.current>3?`🔥 x${comboRef.current}!`:`✨ x${comboRef.current}`);
      setShowCombo(true);
      setTimeout(()=>setShowCombo(false),1000);
    }

    // Special FX
    if(special==='blackhole'){ setBgFlash('rgba(0,0,0,.7)'); setTimeout(()=>setBgFlash(''),400); }
    if(special==='supernova'){ setBgFlash('rgba(255,200,50,.4)'); setTimeout(()=>setBgFlash(''),500); for(let i=0;i<20;i++) setTimeout(()=>burst(r(0,window.innerWidth),r(0,window.innerHeight),4),i*60); }
    if(special==='galaxy')  { setAurora(true); setTimeout(()=>setAurora(false),2000); }
    if(special==='alien')   { setBgFlash('rgba(0,255,100,.15)'); setTimeout(()=>setBgFlash(''),300); }
    if(special==='ufo')     { for(let i=0;i<6;i++) setTimeout(()=>burst(r(x-100,x+100),r(y-80,y+80),5),i*80); }

    // Reset idle
    if(idleTimer.current) clearTimeout(idleTimer.current);
    setTqHint(false);
    idleTimer.current=setTimeout(()=>setTqHint(true),8000);

    // Win
    if(scoreRef.current>=WIN_SCORE&&!winFired.current){
      winFired.current=true;
      setTqDance(true);
      playWin();
      vib([100,50,100,50,100,50,200]);
      for(let i=0;i<30;i++) setTimeout(()=>burst(r(0,window.innerWidth),r(0,window.innerHeight),6),i*80);
      setTimeout(()=>setWin(true),2000);
    }
  },[burst,addShock]);

  /* ─── Spawn objetos especiales ─── */
  const spawnObj=useCallback(()=>{
    const spec=SPECIALS[ri(0,SPECIALS.length)];
    setFobjs(fo=>[...fo,{id:uid++,x:r(5,85),y:r(8,70),sz:ri(30,48),spec}]);
  },[]);
  const clickObj=useCallback((id:number,x:number,y:number,fo:FObj)=>{
    addScore(fo.spec.pts,x,y,fo.spec.onSound,fo.spec.onVib,fo.spec.special);
    addRing(x,y,fo.sz*2,'rgba(255,255,255,.6)');
    setFobjs(f=>f.filter(o=>o.id!==id));
    setTimeout(spawnObj,r(3000,7000));
  },[addScore,addRing,spawnObj]);

  /* ─── Spawn estrellas ─── */
  const spawnStar=useCallback(()=>{
    setFstars(fs=>[...fs,{id:uid++,x:r(5,88),y:r(5,78),sz:ri(22,36),emoji:['⭐','🌟','💫','✨','🌠'][ri(0,5)]}]);
  },[]);
  const clickStar=useCallback((id:number,x:number,y:number)=>{
    addScore(1,x,y,()=>note(660,0.2,0.2),20);
    setFstars(fs=>fs.filter(s=>s.id!==id));
    setTimeout(spawnStar,r(1500,4000));
  },[addScore,spawnStar]);

  useEffect(()=>{
    for(let i=0;i<5;i++) setTimeout(spawnStar,i*600);
    for(let i=0;i<3;i++) setTimeout(spawnObj,i*1800+800);
    const i1=setInterval(()=>{if(Math.random()<.45)spawnStar();},4000);
    const i2=setInterval(()=>{if(Math.random()<.6)spawnObj();},6000);
    idleTimer.current=setTimeout(()=>setTqHint(true),8000);
    return()=>{clearInterval(i1);clearInterval(i2);};
  },[spawnStar,spawnObj]);

  const filled=Math.min(5,Math.floor(scoreRef.current/(WIN_SCORE/5)));

  return(
    <div id="world" onClick={e=>{if((e.target as HTMLElement).id==='world') addScore(1,e.nativeEvent.offsetX,e.nativeEvent.offsetY,()=>note(ri(400,700),0.2,0.15),15);}}
      style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative',
        background:'linear-gradient(180deg,#060a1f 0%,#0d1a4a 38%,#0a3565 68%,#0a5070 100%)',
        cursor:'default',fontFamily:'system-ui,sans-serif',transition:'background .3s'}}>

      {/* Aurora boreal */}
      {aurora&&<div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2,
        background:'linear-gradient(180deg,rgba(0,255,180,.08) 0%,rgba(0,200,255,.06) 40%,transparent 80%)',
        animation:'auroraAnim 2s ease-in-out forwards'}}/>}

      {/* Flash de fondo */}
      {bgFlash&&<div style={{position:'absolute',inset:0,background:bgFlash,pointerEvents:'none',zIndex:40,transition:'background .1s'}}/>}

      {/* Estrellas fondo */}
      {Array.from({length:100}).map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',
          width:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,height:i%6===0?`${r(2,4)}px`:`${r(1,2.5)}px`,
          background:i%7===0?COLS[i%COLS.length]:'white',opacity:r(.15,.85),
          top:`${r(0,90)}%`,left:`${r(0,100)}%`,animation:`tw${i%3} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      ))}

      {/* Score */}
      <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:30}}>
        {[1,2,3,4,5].map(i=>(
          <span key={i} style={{fontSize:24,transition:'transform .3s',transform:i===filled?'scale(1.6)':'scale(1)',filter:i<=filled?'drop-shadow(0 0 6px #FFD700)':'none'}}>
            {i<=filled?'⭐':'☆'}
          </span>
        ))}
      </div>

      {/* Score numérico */}
      <div style={{position:'absolute',top:14,right:16,fontSize:13,color:'rgba(255,255,255,.5)',zIndex:30}}>
        {scoreRef.current}/{WIN_SCORE}
      </div>

      {/* Combo */}
      {showCombo&&<div style={{position:'absolute',top:52,left:'50%',transform:'translateX(-50%)',
        fontSize:24,fontWeight:900,color:'#FFD700',whiteSpace:'nowrap',
        textShadow:'0 0 14px rgba(255,200,0,.9)',zIndex:30,pointerEvents:'none',
        animation:'comboIn .3s ease-out'}}>{comboTxt}</div>}

      {/* Planetas con anillos */}
      {PLANETS.map((p,i)=>(
        <div key={i} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,zIndex:5}}>
          {p.rings&&<div style={{position:'absolute',top:'50%',left:'50%',
            width:p.sz*1.8,height:p.sz*.35,marginLeft:-p.sz*.9,marginTop:-p.sz*.175,
            borderRadius:'50%',border:`3px solid rgba(255,255,255,.25)`,
            transform:'rotateX(60deg)',pointerEvents:'none'}}/>}
          <div onClick={e=>{e.stopPropagation();addScore(p.pts,e.currentTarget.parentElement!.offsetLeft+p.sz/2,e.currentTarget.parentElement!.offsetTop+p.sz/2,()=>playPlanet(p.freq),[35]);addRing(e.currentTarget.parentElement!.offsetLeft+p.sz/2,e.currentTarget.parentElement!.offsetTop+p.sz/2,p.sz,p.gl);}}
            style={{width:p.sz,height:p.sz,borderRadius:'50%',background:p.bg,cursor:'pointer',transition:'transform .15s',
              boxShadow:`inset -${p.sz*.15}px -${p.sz*.15}px ${p.sz*.25}px rgba(0,0,0,.5),0 0 ${p.sz*.6}px ${p.gl},0 0 ${p.sz*1.2}px ${p.gl.replace('.7','.2')}`}}
            onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.16)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
        </div>
      ))}

      {/* Luna */}
      <div onClick={e=>{e.stopPropagation();setMoonScale(1.22);setTimeout(()=>setMoonScale(1),280);addScore(3,e.currentTarget.offsetLeft+27,e.currentTarget.offsetTop+27,playMoon,40);addRing(e.currentTarget.offsetLeft+27,e.currentTarget.offsetTop+27,54,'rgba(255,220,50,.7)');}}
        style={{position:'absolute',right:'13%',top:'14%',width:54,height:54,borderRadius:'50%',cursor:'pointer',zIndex:5,
          background:'radial-gradient(circle at 35% 35%,#fffde7,#ffd54f 60%,#ffb300)',
          boxShadow:'inset -8px -8px 16px rgba(0,0,0,.35),0 0 30px rgba(255,210,50,.65)',
          transform:`scale(${moonScale})`,transition:'transform .2s'}}/>

      {/* Estrellas flotantes */}
      {fstars.map(fs=>(
        <div key={fs.id} onClick={e=>{e.stopPropagation();clickStar(fs.id,e.currentTarget.offsetLeft+fs.sz/2,e.currentTarget.offsetTop+fs.sz/2);}}
          style={{position:'absolute',left:`${fs.x}%`,top:`${fs.y}%`,fontSize:fs.sz,cursor:'pointer',zIndex:12,lineHeight:1,transition:'transform .12s',animation:'starFloat 2s ease-in-out infinite'}}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.45) rotate(15deg)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1) rotate(0deg)')}
        >{fs.emoji}</div>
      ))}

      {/* Objetos especiales */}
      {fobjs.map(fo=>(
        <div key={fo.id} onClick={e=>{e.stopPropagation();clickObj(fo.id,e.currentTarget.offsetLeft+fo.sz/2,e.currentTarget.offsetTop+fo.sz/2,fo);}}
          style={{position:'absolute',left:`${fo.x}%`,top:`${fo.y}%`,fontSize:fo.sz,cursor:'pointer',zIndex:13,lineHeight:1,transition:'transform .12s',animation:`${fo.spec.anim} ${r(3,6)}s ease-in-out infinite`}}
          onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.35)';e.currentTarget.style.filter='drop-shadow(0 0 12px gold)';}}
          onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.filter='';}}
          title={fo.spec.label}
        >{fo.spec.emoji}</div>
      ))}

      {/* Anillos */}
      {rings.map(rr=>(
        <div key={rr.id} style={{position:'absolute',left:rr.x-rr.sz/2,top:rr.y-rr.sz/2,width:rr.sz,height:rr.sz,borderRadius:'50%',border:`2.5px solid ${rr.color}`,pointerEvents:'none',zIndex:22,animation:'ringOut .6s ease-out forwards'}}/>
      ))}

      {/* Shockwaves */}
      {shocks.map(sh=>(
        <div key={sh.id} style={{position:'absolute',left:sh.x-50,top:sh.y-50,width:100,height:100,borderRadius:'50%',background:`radial-gradient(circle,${sh.color} 0%,transparent 70%)`,pointerEvents:'none',zIndex:21,animation:'shockAnim .7s ease-out forwards'}}/>
      ))}

      {/* TOQWOW */}
      <div onClick={e=>{e.stopPropagation();setTqScale(1.25);setTimeout(()=>setTqScale(1),350);addScore(5,window.innerWidth/2,window.innerHeight*.65,playToqwow,[50,30,50,30,100],'ufo');}}
        style={{position:'absolute',bottom:50,left:'50%',width:'min(165px,28vw)',cursor:'pointer',zIndex:15,
          filter:`drop-shadow(0 0 ${tqDance?'40px':'24px'} rgba(184,169,255,${tqDance?.95:.8}))`,
          transform:`translateX(-50%) scale(${tqScale})`,
          animation:tqDance?'tqDance .35s ease-in-out infinite alternate':'tFloat 3.2s ease-in-out infinite',
          transition:'filter .2s'}}
        onMouseEnter={e=>(e.currentTarget.style.filter='drop-shadow(0 0 40px rgba(184,169,255,1))')}
        onMouseLeave={e=>(e.currentTarget.style.filter=`drop-shadow(0 0 24px rgba(184,169,255,.8))`)}
      >
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={165} height={210}
          style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen'}} priority/>
      </div>

      {/* Hint de Toqwow */}
      {tqHint&&!win&&(
        <div style={{position:'absolute',bottom:230,left:'50%',transform:'translateX(-50%)',
          background:'rgba(255,255,255,.92)',borderRadius:20,padding:'10px 20px',
          fontSize:15,fontWeight:700,color:'#5533aa',whiteSpace:'nowrap',zIndex:16,
          boxShadow:'0 4px 24px rgba(0,0,0,.25)',animation:'hintPop .4s ease-out'}}>
          👆 ¡Toca los planetas y las estrellas!
        </div>
      )}

      {/* Partículas */}
      {parts.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.x-13,top:p.y-13,fontSize:ri(20,30),pointerEvents:'none',zIndex:25,lineHeight:1,animation:'burstP 1s ease-out forwards'}}>{p.emoji}</div>
      ))}

      {/* Burbujas */}
      {bubbles.map(b=>(
        <div key={b.id} style={{position:'absolute',left:b.x,top:b.y,width:b.sz,height:b.sz,borderRadius:'50%',background:b.color,opacity:.75,pointerEvents:'none',zIndex:20,animation:'riseB 1.8s ease-out forwards'}}/>
      ))}

      {/* Hint inferior */}
      {!win&&<div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',color:'rgba(255,255,255,.35)',fontSize:11,pointerEvents:'none',zIndex:30,whiteSpace:'nowrap',animation:'hintPulse 3s ease-in-out infinite'}}>
        🌟 ¡Toca todo lo que veas! — Toqwow te espera
      </div>}

      {/* WIN SCREEN */}
      {win&&(
        <div style={{position:'absolute',inset:0,zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          background:'rgba(5,5,30,.88)',backdropFilter:'blur(12px)',animation:'fadeInWin .8s ease-out'}}>
          <div style={{fontSize:90,animation:'winBounce .5s ease-in-out infinite alternate',marginBottom:4}}>🎉</div>
          <div style={{fontSize:48,fontWeight:900,color:'#FFD700',textShadow:'0 0 30px rgba(255,200,0,.9)',marginBottom:6,textAlign:'center'}}>¡Increíble!</div>
          <div style={{fontSize:20,color:'rgba(255,255,255,.9)',marginBottom:4,textAlign:'center'}}>Exploraste el Planeta Tiqui completo</div>
          <div style={{fontSize:16,color:'rgba(184,169,255,.8)',marginBottom:28,textAlign:'center'}}>Sistema Tiqui — Mundo 0 completado 🌍</div>
          <div style={{display:'flex',gap:10,marginBottom:32}}>
            {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:40,filter:'drop-shadow(0 0 8px #FFD700)',animation:`starPop .4s ${i*.1}s ease-out both`}}>⭐</span>)}
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={()=>{scoreRef.current=0;winFired.current=false;setScore(0);setWin(false);setTqDance(false);comboRef.current=0;}}
              style={{background:'linear-gradient(135deg,#B8A9FF,#7C6AE8)',border:'none',borderRadius:50,padding:'14px 32px',fontSize:18,fontWeight:700,color:'white',cursor:'pointer',boxShadow:'0 0 28px rgba(184,169,255,.7)'}}>
              🔄 ¡Otra vez!
            </button>
            <button onClick={()=>window.location.href='/'}
              style={{background:'rgba(255,255,255,.12)',border:'2px solid rgba(255,255,255,.3)',borderRadius:50,padding:'14px 32px',fontSize:18,fontWeight:700,color:'white',cursor:'pointer'}}>
              🏠 Inicio
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tw0 {0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes tw1 {0%,100%{opacity:.7}50%{opacity:.1}}
        @keyframes tw2 {0%,100%{opacity:.5}33%{opacity:1}66%{opacity:.1}}
        @keyframes tFloat {0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-16px)}}
        @keyframes tqDance{0%{transform:translateX(-50%) rotate(-10deg) scale(1.15)}100%{transform:translateX(-50%) rotate(10deg) scale(1.15)}}
        @keyframes burstP {0%{opacity:1;transform:scale(.3) translateY(0) rotate(0deg)}100%{opacity:0;transform:scale(1.8) translateY(-80px) rotate(180deg)}}
        @keyframes riseB  {0%{opacity:.8;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-140px) scale(.15)}}
        @keyframes ringOut{0%{transform:scale(1);opacity:.9}100%{transform:scale(3);opacity:0}}
        @keyframes shockAnim{0%{transform:scale(0);opacity:.8}100%{transform:scale(3);opacity:0}}
        @keyframes starFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(10deg)}}
        @keyframes rocketAnim{0%,100%{transform:translateY(0) rotate(-10deg)}50%{transform:translateY(-15px) rotate(10deg)}}
        @keyframes ufoAnim{0%,100%{transform:translateX(0) rotate(0deg)}25%{transform:translateX(8px) rotate(5deg)}75%{transform:translateX(-8px) rotate(-5deg)}}
        @keyframes cometAnim{0%{transform:translate(0,0) rotate(-30deg)}100%{transform:translate(40px,30px) rotate(-30deg);opacity:0}}
        @keyframes satAnim{0%,100%{transform:translateX(0) rotate(0deg)}50%{transform:translateX(20px) rotate(360deg)}}
        @keyframes rainbowAnim{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.85}}
        @keyframes blackAnim{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.05) rotate(180deg)}}
        @keyframes meteorAnim{0%{transform:translate(0,0) rotate(45deg)}100%{transform:translate(60px,60px) rotate(45deg);opacity:0}}
        @keyframes galaxyAnim{0%,100%{transform:rotate(0deg) scale(1)}50%{transform:rotate(20deg) scale(1.08)}}
        @keyframes alienAnim{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.1)}}
        @keyframes supernovaAnim{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.15);filter:brightness(1.5)}}
        @keyframes auroraAnim{0%{opacity:0}30%{opacity:1}80%{opacity:1}100%{opacity:0}}
        @keyframes comboIn{0%{opacity:0;transform:translateX(-50%) scale(.5)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
        @keyframes hintPop{0%{opacity:0;transform:translateX(-50%) translateY(10px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes hintPulse{0%,100%{opacity:.3}50%{opacity:.8}}
        @keyframes fadeInWin{from{opacity:0}to{opacity:1}}
        @keyframes winBounce{from{transform:scale(1) rotate(-8deg)}to{transform:scale(1.2) rotate(8deg)}}
        @keyframes starPop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(10deg)}100%{transform:scale(1) rotate(0deg)}}
      `}</style>
    </div>
  );
}
