'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let actx: AudioContext | null = null;
const getCtx = () => { if(!actx) actx=new(window.AudioContext||(window as any).webkitAudioContext)(); return actx; };
const note=(freq:number,dur=0.3,vol=0.28,type:OscillatorType='sine')=>{try{const c=getCtx();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);o.start();o.stop(c.currentTime+dur);}catch{}};
const roar=()=>{note(80,0.8,0.4,'sawtooth');setTimeout(()=>note(120,0.5,0.3,'square'),200);};
const vib=(p:number|number[])=>{try{navigator.vibrate?.(p);}catch{}};

const DINOS=[
  {emoji:'🦕',name:'Bronto',x:15,y:25,pts:3,color:'#7CFC00',sound:()=>note(200,0.5,0.3,'sawtooth'),vib:60},
  {emoji:'🦖',name:'T-Rex',x:65,y:20,pts:5,color:'#FF6B35',sound:()=>{note(100,0.6,0.4,'sawtooth');setTimeout(()=>note(150,0.4,0.3),150);},vib:[80,40,80]},
  {emoji:'🐉',name:'Dragón',x:40,y:8,pts:6,color:'#FF4500',sound:()=>{note(80,0.8,0.35,'sawtooth');setTimeout(()=>note(160,0.5,0.25),200);},vib:[100,50,100]},
  {emoji:'🦎',name:'Raptor',x:80,y:45,pts:3,color:'#90EE90',sound:()=>note(300,0.3,0.25,'square'),vib:40},
  {emoji:'🐊',name:'Anqui',x:5,y:55,pts:4,color:'#228B22',sound:()=>note(150,0.5,0.3,'triangle'),vib:50},
];

const r=(a:number,b:number)=>a+Math.random()*(b-a);
const ri=(a:number,b:number)=>Math.floor(r(a,b));
let uid=0;

type Particle={id:number;x:number;y:number;emoji:string};
type Bubble={id:number;x:number;y:number;color:string;sz:number};

export default function Mundo1() {
  const [parts,setParts]=useState<Particle[]>([]);
  const [bubbles,setBubbles]=useState<Bubble[]>([]);
  const [score,setScore]=useState(0);
  const [comboTxt,setComboTxt]=useState('');
  const [showCombo,setShowCombo]=useState(false);
  const [win,setWin]=useState(false);
  const [tqScale,setTqScale]=useState(1);
  const [dinoScales,setDinoScales]=useState<{[k:number]:number}>({});
  const scoreRef=useRef(0);
  const comboRef=useRef(0);
  const comboTimer=useRef<any>(null);
  const winFired=useRef(false);
  const WIN=40;
  const router=useRouter();

  const burst=useCallback((x:number,y:number)=>{
    const emojis=['🦴','🥚','🌿','💫','✨','🍖','⭐'];
    const id=uid++;
    setParts(p=>[...p,{id,x,y,emoji:emojis[ri(0,emojis.length)]}]);
    setTimeout(()=>setParts(p=>p.filter(b=>b.id!==id)),1000);
    const nb:Bubble[]=Array.from({length:6},()=>({id:uid++,x:x+r(-30,30),y:y+r(-10,10),color:['#7CFC00','#FF6B35','#228B22','#FFD700'][ri(0,4)],sz:r(5,16)}));
    setBubbles(b=>[...b,...nb]);
    setTimeout(()=>setBubbles(b=>b.filter(bb=>!nb.find(n=>n.id===bb.id))),1800);
  },[]);

  const addScore=useCallback((pts:number,x:number,y:number,sound:()=>void,vibP:number|number[]=25)=>{
    burst(x,y); sound(); vib(vibP);
    comboRef.current+=1;
    if(comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current=setTimeout(()=>{comboRef.current=0;},1600);
    const actual=Math.round(pts*(comboRef.current>2?2:1));
    scoreRef.current=Math.min(scoreRef.current+actual,WIN);
    setScore(scoreRef.current);
    if(comboRef.current>1){setComboTxt(comboRef.current>4?`🦖 x${comboRef.current} DINO COMBO!`:`🦴 x${comboRef.current}`);setShowCombo(true);setTimeout(()=>setShowCombo(false),900);}
    if(scoreRef.current>=WIN&&!winFired.current){winFired.current=true;setTqScale(1.2);vib([100,50,100,50,200]);setTimeout(()=>setWin(true),1000);}
  },[burst]);

  const clickDino=useCallback((i:number,x:number,y:number)=>{
    const d=DINOS[i];
    setDinoScales(s=>({...s,[i]:1.3}));
    setTimeout(()=>setDinoScales(s=>({...s,[i]:1})),300);
    addScore(d.pts,x,y,d.sound,d.vib);
    // Rugido
    if(d.pts>=5){for(let j=0;j<4;j++)setTimeout(()=>burst(r(x-80,x+80),r(y-60,y+60)),j*80);}
  },[addScore,burst]);

  const filled=Math.min(5,Math.floor(scoreRef.current/(WIN/5)));

  return(
    <div id="world" onClick={e=>{if((e.target as HTMLElement).id==='world')addScore(1,e.nativeEvent.offsetX,e.nativeEvent.offsetY,()=>note(400,0.15,0.1));}}
      style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative',
        background:'linear-gradient(180deg,#0a0520 0%,#1a0a30 30%,#0d2010 60%,#001a00 100%)',
        cursor:'default',fontFamily:'system-ui,sans-serif'}}>

      {/* Meteoritos de fondo */}
      {Array.from({length:30}).map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',
          width:`${r(1,3)}px`,height:`${r(1,3)}px`,background:i%3===0?'#7CFC00':i%3===1?'#FF6B35':'white',
          opacity:r(.2,.7),top:`${r(0,90)}%`,left:`${r(0,100)}%`,animation:`tw${i%3} ${r(2,5)}s ${r(0,4)}s infinite`}}/>
      ))}

      {/* Tierra prehistórica (suelo) */}
      <div style={{position:'absolute',bottom:0,width:'100%',height:80,
        background:'linear-gradient(180deg,transparent,#1a3a10 40%,#0d2008)',pointerEvents:'none'}}/>

      {/* Volcán */}
      <div style={{position:'absolute',bottom:60,right:'8%',fontSize:80,filter:'drop-shadow(0 0 20px rgba(255,100,0,.7))',animation:'volcAnim 2s ease-in-out infinite',pointerEvents:'none'}}>🌋</div>

      {/* Score */}
      <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:30}}>
        {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:24,transition:'transform .3s',transform:i===filled?'scale(1.5)':'scale(1)',filter:i<=filled?'drop-shadow(0 0 6px #FFD700)':'none'}}>{i<=filled?'⭐':'☆'}</span>)}
      </div>
      <button onClick={()=>router.push('/')} style={{position:'absolute',top:14,left:14,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:13,color:'white',cursor:'pointer',zIndex:30}}>← Inicio</button>

      {showCombo&&<div style={{position:'absolute',top:52,left:'50%',transform:'translateX(-50%)',fontSize:22,fontWeight:900,color:'#7CFC00',whiteSpace:'nowrap',textShadow:'0 0 14px rgba(100,255,0,.8)',zIndex:30,pointerEvents:'none'}}>{comboTxt}</div>}

      {/* Dinos */}
      {DINOS.map((d,i)=>(
        <div key={i} onClick={e=>{e.stopPropagation();clickDino(i,e.currentTarget.offsetLeft+40,e.currentTarget.offsetTop+40);}}
          style={{position:'absolute',left:`${d.x}%`,top:`${d.y}%`,fontSize:ri(54,72),cursor:'pointer',zIndex:10,lineHeight:1,
            filter:`drop-shadow(0 0 12px ${d.color})`,
            transform:`scale(${dinoScales[i]||1})`,transition:'transform .2s',
            animation:`dinoFloat${i%3} ${3+i*.5}s ease-in-out infinite`}}
          onMouseEnter={e=>{e.currentTarget.style.filter=`drop-shadow(0 0 24px ${d.color})`;e.currentTarget.style.transform='scale(1.2)';}}
          onMouseLeave={e=>{e.currentTarget.style.filter=`drop-shadow(0 0 12px ${d.color})`;e.currentTarget.style.transform=`scale(${dinoScales[i]||1})`;}}
        >{d.emoji}</div>
      ))}

      {/* Toqwow */}
      <div onClick={e=>{e.stopPropagation();setTqScale(1.2);setTimeout(()=>setTqScale(1),300);roar();addScore(5,window.innerWidth/2,window.innerHeight*.65,()=>{},100);for(let i=0;i<10;i++)setTimeout(()=>burst(r(0,window.innerWidth),r(0,window.innerHeight)),i*60);}}
        style={{position:'absolute',bottom:50,left:'50%',width:'min(150px,26vw)',cursor:'pointer',zIndex:15,
          filter:'drop-shadow(0 0 24px rgba(124,252,0,.6))',
          transform:`translateX(-50%) scale(${tqScale})`,
          animation:'tFloat 3s ease-in-out infinite',transition:'transform .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={150} height={190} style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen'}} priority/>
      </div>

      {parts.map(p=><div key={p.id} style={{position:'absolute',left:p.x-13,top:p.y-13,fontSize:24,pointerEvents:'none',zIndex:25,lineHeight:1,animation:'burstP 1s ease-out forwards'}}>{p.emoji}</div>)}
      {bubbles.map(b=><div key={b.id} style={{position:'absolute',left:b.x,top:b.y,width:b.sz,height:b.sz,borderRadius:'50%',background:b.color,opacity:.75,pointerEvents:'none',zIndex:20,animation:'riseB 1.8s ease-out forwards'}}/>)}

      {win&&(
        <div style={{position:'absolute',inset:0,zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(5,15,5,.88)',backdropFilter:'blur(12px)',animation:'fadeInWin .8s'}}>
          <div style={{fontSize:80,animation:'winBounce .5s infinite alternate',marginBottom:8}}>🦕</div>
          <div style={{fontSize:44,fontWeight:900,color:'#7CFC00',textShadow:'0 0 30px rgba(100,255,0,.8)',marginBottom:8}}>¡RAWR!</div>
          <div style={{fontSize:18,color:'rgba(255,255,255,.85)',marginBottom:28,textAlign:'center'}}>Domaste a todos los dinosaurios 🦖</div>
          <div style={{display:'flex',gap:10,marginBottom:28}}>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:36}}>⭐</span>)}</div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={()=>{scoreRef.current=0;winFired.current=false;setScore(0);setWin(false);comboRef.current=0;}} style={{background:'linear-gradient(135deg,#7CFC00,#228B22)',border:'none',borderRadius:50,padding:'14px 28px',fontSize:17,fontWeight:700,color:'white',cursor:'pointer'}}>🔄 ¡Otra vez!</button>
            <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.12)',border:'2px solid rgba(255,255,255,.3)',borderRadius:50,padding:'14px 28px',fontSize:17,fontWeight:700,color:'white',cursor:'pointer'}}>🏠 Inicio</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tw0{0%,100%{opacity:.2}50%{opacity:1}} @keyframes tw1{0%,100%{opacity:.7}50%{opacity:.1}} @keyframes tw2{0%,100%{opacity:.5}33%{opacity:1}66%{opacity:.1}}
        @keyframes tFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-14px)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.3) translateY(0)}100%{opacity:0;transform:scale(1.8) translateY(-80px) rotate(180deg)}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0)}100%{opacity:0;transform:translateY(-140px) scale(.1)}}
        @keyframes dinoFloat0{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}}
        @keyframes dinoFloat1{0%,100%{transform:translateY(0) scaleX(1)}50%{transform:translateY(-8px) scaleX(-1)}}
        @keyframes dinoFloat2{0%,100%{transform:translateY(0)}25%{transform:translateY(-6px) rotate(5deg)}75%{transform:translateY(-3px) rotate(-5deg)}}
        @keyframes volcAnim{0%,100%{filter:drop-shadow(0 0 20px rgba(255,100,0,.7))}50%{filter:drop-shadow(0 0 40px rgba(255,150,0,1))}}
        @keyframes fadeInWin{from{opacity:0}to{opacity:1}} @keyframes winBounce{from{transform:scale(1) rotate(-8deg)}to{transform:scale(1.2) rotate(8deg)}}
      `}</style>
    </div>
  );
}
