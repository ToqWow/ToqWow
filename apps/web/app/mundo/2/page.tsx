'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

let actx: AudioContext | null = null;
const getCtx=()=>{if(!actx)actx=new(window.AudioContext||(window as any).webkitAudioContext)();return actx;};
const note=(f:number,d=0.3,v=0.25,t:OscillatorType='sine')=>{try{const c=getCtx();const o=c.createOscillator();const g=c.createGain();o.connect(g);g.connect(c.destination);o.type=t;o.frequency.setValueAtTime(f,c.currentTime);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.start();o.stop(c.currentTime+d);}catch{}};
const magic=()=>{[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>note(f,0.4,0.2),i*80));};
const vib=(p:number|number[])=>{try{navigator.vibrate?.(p);}catch{}};

const CREATURES=[
  {emoji:'🦋',pts:2,x:20,y:20,color:'#FF85C2',sound:()=>note(880,0.3,0.2),vib:20},
  {emoji:'🐸',pts:3,x:60,y:15,color:'#7CFC00',sound:()=>note(200,0.4,0.3,'square'),vib:40},
  {emoji:'🦄',pts:5,x:80,y:30,color:'#FF69B4',sound:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>note(f,0.3,0.2),i*70));},vib:[50,30,50]},
  {emoji:'🐛',pts:2,x:10,y:45,color:'#98FB98',sound:()=>note(300,0.3,0.2,'triangle'),vib:20},
  {emoji:'🦊',pts:4,x:45,y:10,color:'#FF8C00',sound:()=>note(440,0.4,0.25,'sawtooth'),vib:40},
  {emoji:'🍄',pts:3,x:70,y:55,color:'#FF4500',sound:()=>note(330,0.5,0.25),vib:30},
  {emoji:'🌸',pts:2,x:30,y:55,color:'#FFB7C5',sound:()=>note(660,0.4,0.2),vib:20},
];

const r=(a:number,b:number)=>a+Math.random()*(b-a);
const ri=(a:number,b:number)=>Math.floor(r(a,b));
let uid=0;
type P={id:number;x:number;y:number;emoji:string};
type B={id:number;x:number;y:number;color:string;sz:number};

export default function Mundo2(){
  const [parts,setParts]=useState<P[]>([]);
  const [bubbles,setBubbles]=useState<B[]>([]);
  const [score,setScore]=useState(0);
  const [comboTxt,setComboTxt]=useState('');
  const [showCombo,setShowCombo]=useState(false);
  const [win,setWin]=useState(false);
  const [tqScale,setTqScale]=useState(1);
  const scoreRef=useRef(0);const comboRef=useRef(0);const comboTimer=useRef<any>(null);const winFired=useRef(false);
  const WIN=40;const router=useRouter();
  const FEMOJIS=['🍀','🌺','🌻','✨','💫','🍃','🌿','🪄'];

  const burst=useCallback((x:number,y:number)=>{
    const id=uid++;
    setParts(p=>[...p,{id,x,y,emoji:FEMOJIS[ri(0,FEMOJIS.length)]}]);
    setTimeout(()=>setParts(p=>p.filter(b=>b.id!==id)),1000);
    const nb:B[]=Array.from({length:6},()=>({id:uid++,x:x+r(-30,30),y:y+r(-10,10),color:['#7CFC00','#FF85C2','#FF8C00','#FFD700'][ri(0,4)],sz:r(5,16)}));
    setBubbles(b=>[...b,...nb]);
    setTimeout(()=>setBubbles(b=>b.filter(bb=>!nb.find(n=>n.id===bb.id))),1800);
  },[]);

  const addScore=useCallback((pts:number,x:number,y:number,sound:()=>void,vibP:number|number[]=25)=>{
    burst(x,y);sound();vib(vibP);
    comboRef.current+=1;
    if(comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current=setTimeout(()=>{comboRef.current=0;},1600);
    const actual=Math.round(pts*(comboRef.current>2?2:1));
    scoreRef.current=Math.min(scoreRef.current+actual,WIN);
    setScore(scoreRef.current);
    if(comboRef.current>1){setComboTxt(comboRef.current>4?`🦄 x${comboRef.current} MAGIA!`:`✨ x${comboRef.current}`);setShowCombo(true);setTimeout(()=>setShowCombo(false),900);}
    if(scoreRef.current>=WIN&&!winFired.current){winFired.current=true;magic();vib([100,50,100,50,200]);for(let i=0;i<20;i++)setTimeout(()=>burst(r(0,window.innerWidth),r(0,window.innerHeight)),i*70);setTimeout(()=>setWin(true),1500);}
  },[burst]);

  const filled=Math.min(5,Math.floor(scoreRef.current/(WIN/5)));

  return(
    <div id="world" onClick={e=>{if((e.target as HTMLElement).id==='world')addScore(1,e.nativeEvent.offsetX,e.nativeEvent.offsetY,()=>note(ri(400,800),0.2,0.1));}}
      style={{width:'100vw',height:'100vh',overflow:'hidden',position:'relative',
        background:'linear-gradient(180deg,#0a1a05 0%,#0d2a08 35%,#1a4010 65%,#0d2a05 100%)',
        cursor:'default',fontFamily:'system-ui,sans-serif'}}>

      {/* Luciérnagas de fondo */}
      {Array.from({length:50}).map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',pointerEvents:'none',
          width:`${r(2,5)}px`,height:`${r(2,5)}px`,
          background:i%3===0?'#7CFC00':i%3===1?'#FFD700':'#FF85C2',
          opacity:r(.1,.7),top:`${r(0,90)}%`,left:`${r(0,100)}%`,
          boxShadow:i%4===0?`0 0 6px currentColor`:'none',
          animation:`luci${i%4} ${r(1.5,4)}s ${r(0,3)}s infinite`}}/>
      ))}

      {/* Árboles de fondo */}
      <div style={{position:'absolute',bottom:0,width:'100%',display:'flex',justifyContent:'space-around',pointerEvents:'none'}}>
        {['🌲','🌳','🌲','🌴','🌲','🌳','🌲'].map((t,i)=>(
          <span key={i} style={{fontSize:`${ri(60,100)}px`,filter:'brightness(.4)',marginBottom:-20}}>{t}</span>
        ))}
      </div>

      <div style={{position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',display:'flex',gap:6,zIndex:30}}>
        {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:24,transform:i===filled?'scale(1.5)':'scale(1)',filter:i<=filled?'drop-shadow(0 0 6px #FFD700)':'none',transition:'transform .3s'}}>{i<=filled?'⭐':'☆'}</span>)}
      </div>
      <button onClick={()=>router.push('/')} style={{position:'absolute',top:14,left:14,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',borderRadius:50,padding:'6px 14px',fontSize:13,color:'white',cursor:'pointer',zIndex:30}}>← Inicio</button>
      {showCombo&&<div style={{position:'absolute',top:52,left:'50%',transform:'translateX(-50%)',fontSize:22,fontWeight:900,color:'#7CFC00',whiteSpace:'nowrap',textShadow:'0 0 14px rgba(100,255,0,.8)',zIndex:30,pointerEvents:'none'}}>{comboTxt}</div>}

      {CREATURES.map((c,i)=>(
        <div key={i} onClick={e=>{e.stopPropagation();addScore(c.pts,e.currentTarget.offsetLeft+30,e.currentTarget.offsetTop+30,c.sound,c.vib);if(c.pts>=4)for(let j=0;j<6;j++)setTimeout(()=>burst(r(e.currentTarget.offsetLeft-60,e.currentTarget.offsetLeft+60),r(e.currentTarget.offsetTop-40,e.currentTarget.offsetTop+40)),j*60);}}
          style={{position:'absolute',left:`${c.x}%`,top:`${c.y}%`,fontSize:ri(46,62),cursor:'pointer',zIndex:10,lineHeight:1,filter:`drop-shadow(0 0 10px ${c.color})`,animation:`creatureAnim${i%4} ${3+i*.4}s ease-in-out infinite`}}
          onMouseEnter={e=>{e.currentTarget.style.filter=`drop-shadow(0 0 22px ${c.color})`;e.currentTarget.style.transform='scale(1.2)';}}
          onMouseLeave={e=>{e.currentTarget.style.filter=`drop-shadow(0 0 10px ${c.color})`;e.currentTarget.style.transform='scale(1)';}}
        >{c.emoji}</div>
      ))}

      <div onClick={e=>{e.stopPropagation();setTqScale(1.2);setTimeout(()=>setTqScale(1),300);magic();addScore(5,window.innerWidth/2,window.innerHeight*.65,()=>{},80);for(let i=0;i<12;i++)setTimeout(()=>burst(r(0,window.innerWidth),r(0,window.innerHeight)),i*60);}}
        style={{position:'absolute',bottom:50,left:'50%',width:'min(150px,26vw)',cursor:'pointer',zIndex:15,filter:'drop-shadow(0 0 24px rgba(124,252,0,.7))',transform:`translateX(-50%) scale(${tqScale})`,animation:'tFloat 3s ease-in-out infinite',transition:'transform .2s'}}>
        <Image src="/toqwow-mascota.png" alt="Toqwow" width={150} height={190} style={{objectFit:'contain',width:'100%',height:'auto',mixBlendMode:'screen'}} priority/>
      </div>

      {parts.map(p=><div key={p.id} style={{position:'absolute',left:p.x-13,top:p.y-13,fontSize:24,pointerEvents:'none',zIndex:25,lineHeight:1,animation:'burstP 1s ease-out forwards'}}>{p.emoji}</div>)}
      {bubbles.map(b=><div key={b.id} style={{position:'absolute',left:b.x,top:b.y,width:b.sz,height:b.sz,borderRadius:'50%',background:b.color,opacity:.75,pointerEvents:'none',zIndex:20,animation:'riseB 1.8s ease-out forwards'}}/>)}

      {win&&(
        <div style={{position:'absolute',inset:0,zIndex:50,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(5,15,5,.9)',backdropFilter:'blur(12px)',animation:'fadeInWin .8s'}}>
          <div style={{fontSize:80,animation:'winBounce .5s infinite alternate',marginBottom:8}}>🦄</div>
          <div style={{fontSize:44,fontWeight:900,color:'#7CFC00',textShadow:'0 0 30px rgba(100,255,0,.9)',marginBottom:8}}>¡Mágico!</div>
          <div style={{fontSize:18,color:'rgba(255,255,255,.85)',marginBottom:28,textAlign:'center'}}>Exploraste el Bosque Encantado 🌲</div>
          <div style={{display:'flex',gap:10,marginBottom:28}}>{[1,2,3,4,5].map(i=><span key={i} style={{fontSize:36}}>⭐</span>)}</div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={()=>{scoreRef.current=0;winFired.current=false;setScore(0);setWin(false);comboRef.current=0;}} style={{background:'linear-gradient(135deg,#7CFC00,#228B22)',border:'none',borderRadius:50,padding:'14px 28px',fontSize:17,fontWeight:700,color:'white',cursor:'pointer'}}>🔄 ¡Otra vez!</button>
            <button onClick={()=>router.push('/')} style={{background:'rgba(255,255,255,.12)',border:'2px solid rgba(255,255,255,.3)',borderRadius:50,padding:'14px 28px',fontSize:17,fontWeight:700,color:'white',cursor:'pointer'}}>🏠 Inicio</button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes tFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-14px)}}
        @keyframes burstP{0%{opacity:1;transform:scale(.3) translateY(0)}100%{opacity:0;transform:scale(1.8) translateY(-80px) rotate(180deg)}}
        @keyframes riseB{0%{opacity:.8;transform:translateY(0)}100%{opacity:0;transform:translateY(-140px) scale(.1)}}
        @keyframes luci0{0%,100%{opacity:.1;transform:translate(0,0)}50%{opacity:.9;transform:translate(${Math.random()*10}px,${Math.random()*10}px)}}
        @keyframes luci1{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:.1;transform:scale(1.5)}}
        @keyframes luci2{0%,100%{opacity:.3}33%{opacity:.9}66%{opacity:.1}}
        @keyframes luci3{0%,100%{opacity:.5;transform:translateY(0)}50%{opacity:.8;transform:translateY(-8px)}}
        @keyframes creatureAnim0{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}
        @keyframes creatureAnim1{0%,100%{transform:scale(1)}50%{transform:scale(1.1) rotate(10deg)}}
        @keyframes creatureAnim2{0%,100%{transform:translateX(0)}25%{transform:translateX(8px)}75%{transform:translateX(-8px)}}
        @keyframes creatureAnim3{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-10px) rotate(15deg)}}
        @keyframes fadeInWin{from{opacity:0}to{opacity:1}} @keyframes winBounce{from{transform:scale(1) rotate(-8deg)}to{transform:scale(1.2) rotate(8deg)}}
      `}</style>
    </div>
  );
}
