import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import './style.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

type Message = {role:'user'|'nadaa', text:string};

function Morbius() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.z = 4.5;
    const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(340,340);
    ref.current.appendChild(renderer.domElement);
    const group = new THREE.Group();
    const pts: THREE.Vector3[] = [];
    for (let i=0;i<=260;i++) {
      const t=i/260*Math.PI*2;
      const R=1.25, r=.22;
      const twist=t/2;
      pts.push(new THREE.Vector3((R+r*Math.cos(t))*Math.cos(twist),(R+r*Math.cos(t))*Math.sin(twist),r*Math.sin(t)));
    }
    const curve=new THREE.CatmullRomCurve3(pts);
    const geo=new THREE.TubeGeometry(curve,420,.035,8,true);
    const mat=new THREE.MeshBasicMaterial({color:0x9b6cff,wireframe:false});
    const mesh=new THREE.Mesh(geo,mat); group.add(mesh); scene.add(group);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35,.012,6,96),new THREE.MeshBasicMaterial({color:0x20e0ff,transparent:true,opacity:.55}));
    ring.rotation.x=Math.PI/2; scene.add(ring);
    let id=0; const tick=()=>{id=requestAnimationFrame(tick);group.rotation.y+=.007;group.rotation.x=Math.sin(performance.now()/2200)*.15;ring.rotation.z+=.01;renderer.render(scene,camera)};tick();
    const onResize=()=>renderer.setSize(Math.min(ref.current!.clientWidth,360),Math.min(ref.current!.clientWidth,360)); window.addEventListener('resize',onResize);
    return ()=>{cancelAnimationFrame(id);window.removeEventListener('resize',onResize);renderer.dispose();ref.current?.removeChild(renderer.domElement)};
  },[]);
  return <div ref={ref} className="morbius"/>;
}

function App(){
  const [messages,setMessages]=useState<Message[]>([{role:'nadaa',text:'Hello, Ramatema. I am Nadaa — nah-dah. MPI is online.'}]);
  const [input,setInput]=useState(''); const [live,setLive]=useState(false); const [status,setStatus]=useState('READY');
  const [url,setUrl]=useState(''); const [fileName,setFileName]=useState(''); const [voiceSetup,setVoiceSetup]=useState('');
  const audioCtx=useRef<AudioContext|null>(null); const playbackAt=useRef(0); const ws=useRef<WebSocket|null>(null); const stream=useRef<MediaStream|null>(null);


  function wavBytes(samples:Float32Array, sampleRate:number){
    const buffer=new ArrayBuffer(44+samples.length*2); const view=new DataView(buffer); const write=(o:string,p:number)=>{for(let i=0;i<o.length;i++)view.setUint8(p+i,o.charCodeAt(i))};
    write('RIFF',0); view.setUint32(4,36+samples.length*2,true); write('WAVE',8); write('fmt ',12); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); write('data',36); view.setUint32(40,samples.length*2,true); for(let i=0;i<samples.length;i++){const v=Math.max(-1,Math.min(1,samples[i])); view.setInt16(44+i*2,v<0?v*32768:v*32767,true)} return new Blob([buffer],{type:'audio/wav'});
  }
  async function recordWav(seconds:number){
    const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1}}); const ctx=new AudioContext({sampleRate:16000}); const src=ctx.createMediaStreamSource(s); const proc=ctx.createScriptProcessor(4096,1,1); const chunks:Float32Array[]=[]; let count=0; const target=16000*seconds;
    return await new Promise<Blob>((resolve,reject)=>{const finish=()=>{proc.disconnect();src.disconnect();s.getTracks().forEach(t=>t.stop());ctx.close();let total=0;for(const c of chunks)total+=c.length;const all=new Float32Array(Math.min(total,target));let o=0;for(const c of chunks){const take=Math.min(c.length,all.length-o);all.set(c.subarray(0,take),o);o+=take;if(o>=all.length)break}resolve(wavBytes(all,16000))}; proc.onaudioprocess=e=>{const c=e.inputBuffer.getChannelData(0).slice();chunks.push(c);count+=c.length;if(count>=target)finish()}; src.connect(proc);const sink=ctx.createGain(); sink.gain.value=0; proc.connect(sink); sink.connect(ctx.destination); setTimeout(()=>{if(count<target)finish()},seconds*1000+1500);}).finally(()=>ctx.close()).catch(e=>{s.getTracks().forEach(t=>t.stop());throw e});
  }
  async function enrollCreator(){setVoiceSetup('RECORDING CREATOR VOICE'); try{const wav=await recordWav(4); const fd=new FormData();fd.append('file',wav,'creator.wav'); const r=await fetch(`${API}/api/voice/enroll`,{method:'POST',body:fd}); const d=await r.json(); if(!r.ok)throw new Error(d.detail||'Enrollment failed'); setVoiceSetup('CREATOR VOICE SAVED'); setMessages(m=>[...m,{role:'nadaa',text:'Creator voice enrolled. Future voice sessions can be gated against this voiceprint.'}])}catch(e){setVoiceSetup('VOICE SETUP ERROR');setMessages(m=>[...m,{role:'nadaa',text:`Voice enrollment failed: ${String(e)}`}])}}

  async function playPcm24k(base64:string){
    if(!audioCtx.current) audioCtx.current=new AudioContext(); const bin=atob(base64); const pcm=new Int16Array(bin.length/2); for(let i=0;i<pcm.length;i++)pcm[i]=bin.charCodeAt(i*2)|bin.charCodeAt(i*2+1)<<8; const buf=audioCtx.current.createBuffer(1,pcm.length,24000); const ch=buf.getChannelData(0); for(let i=0;i<pcm.length;i++)ch[i]=pcm[i]/32768; const src=audioCtx.current.createBufferSource(); src.buffer=buf; src.connect(audioCtx.current.destination); const start=Math.max(audioCtx.current.currentTime,playbackAt.current); src.start(start); playbackAt.current=start+buf.duration;
  }

  async function sendText(){ if(!input.trim()) return; const q=input.trim(); setInput(''); setMessages(m=>[...m,{role:'user',text:q}]); setStatus('THINKING');
    try{ const r=await fetch(`${API}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})}); const d=await r.json();
      setMessages(m=>[...m,{role:'nadaa',text:d.action?.risk==='CONFIRM' ? `${d.text || 'I can do that.'}\n\nAction requested: ${d.action.name}. I need your confirmation before executing it.` : (d.text || 'I could not answer that.')}]);
      if(d.action?.name==='open_whatsapp'){ window.location.href='whatsapp://'; }
      if(d.action?.name?.startsWith('generate_')){ const kind=d.action.name.replace('generate_','').replace('docx','docx').replace('pptx','pptx'); const rr=await fetch(`${API}/api/generate/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q})}); if(rr.ok){ const blob=await rr.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=kind==='pdf'?'nadaa-document.pdf':kind==='docx'?'nadaa-document.docx':'nadaa-presentation.pptx'; a.click(); URL.revokeObjectURL(a.href); }}
    } catch(e){setMessages(m=>[...m,{role:'nadaa',text:`Gateway unavailable: ${String(e)}`}])} finally{setStatus('READY')}
  }

  async function startLive(){
    if(live){ stream.current?.getTracks().forEach(t=>t.stop()); ws.current?.close(); audioCtx.current?.close(); setLive(false); setStatus('READY'); return; }
    try{
      const gate=await recordWav(2); const gateBytes=new Uint8Array(await gate.arrayBuffer()); let gateBin=''; for(const b of gateBytes) gateBin+=String.fromCharCode(b);
      const vr=await fetch(`${API}/api/voice/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio_base64:btoa(gateBin)})}); const vd=await vr.json();
      if(vd.creator_verified!==true) throw new Error('Creator voice not verified. Enroll the creator voice first or try again in a quiet room.');
      const tokenRes=await fetch(`${API}/api/live-token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voice_name:'Aoede'})}); const token=await tokenRes.json();
      if(!token.token) throw new Error(token.detail || 'No Live token');
      const socket=new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token.token)}`);
      ws.current=socket; setStatus('CONNECTING');
      socket.onopen=async()=>{ setLive(true);setStatus('LISTENING'); socket.send(JSON.stringify({setup:{model:`models/${token.model}`,generationConfig:{responseModalities:['AUDIO']}}}));
        const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1}});stream.current=s; audioCtx.current=new AudioContext(); const src=audioCtx.current.createMediaStreamSource(s); const proc=audioCtx.current.createScriptProcessor(4096,1,1);
        proc.onaudioprocess=(ev)=>{const data=ev.inputBuffer.getChannelData(0); const pcm=new Int16Array(data.length); for(let i=0;i<data.length;i++)pcm[i]=Math.max(-1,Math.min(1,data[i]))*32767; let bin='';const bytes=new Uint8Array(pcm.buffer);for(const b of bytes)bin+=String.fromCharCode(b); socket.send(JSON.stringify({realtimeInput:{mediaChunks:[{mimeType:'audio/pcm;rate=16000',data:btoa(bin)}]}}));}; src.connect(proc);proc.connect(audioCtx.current.destination);
      };
      socket.onmessage=(ev)=>{try{const d=JSON.parse(ev.data); const parts=d.serverContent?.modelTurn?.parts||[]; const txt=parts.find((p:any)=>p.text)?.text; const audio=parts.find((p:any)=>p.inlineData?.mimeType?.startsWith('audio/'))?.inlineData?.data; if(txt)setMessages(m=>[...m,{role:'nadaa',text:txt}]); if(audio)void playPcm24k(audio);}catch{}}
      socket.onerror=()=>setStatus('LIVE ERROR'); socket.onclose=()=>{setLive(false);setStatus('READY')};
    }catch(e){setStatus('LIVE UNAVAILABLE');setMessages(m=>[...m,{role:'nadaa',text:`Live voice could not start: ${String(e)}`}])}
  }

  async function openUrl(){if(!url.trim())return;const r=await fetch(`${API}/api/fetch-url`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const d=await r.json();setMessages(m=>[...m,{role:'nadaa',text:`I read ${d.title || d.url}.\n\n${d.text?.slice(0,1200) || 'No text extracted.'}`}] );setUrl('')}

  async function uploadFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0]; if(!f)return; setFileName(f.name); const fd=new FormData();fd.append('file',f);const r=await fetch(`${API}/api/upload`,{method:'POST',body:fd});const d=await r.json();setMessages(m=>[...m,{role:'nadaa',text:`File received: ${d.filename}. I can now use the file as a workspace input.`}])}

  return <div className="shell">
    <div className="stars"/>
    <header><div><div className="brand">NADAA <span>39</span></div><div className="sub">MORBIUS PROCESSING INTELLIGENCE · MPI</div></div><div className="pill">● {status}</div></header>
    <main><section className="hero"><div className="hero-copy"><div className="eyebrow">CREATOR ACCESS · RAMATEMA PULE</div><h1>Think beyond the loop.</h1><p>Nadaa is your multimodal command interface. Voice, files, links, documents and device actions — unified through MPI.</p><div className="controls"><button onClick={startLive} className={live?'danger':'primary'}>{live?'Stop voice':'Start voice chat'}</button><button onClick={sendText}>Send command</button></div></div><Morbius/></section>
      <section className="workspace"><div className="panel chat"><div className="panel-head"><b>CONVERSATION</b><span>Nadaa · nah-dah</span></div><div className="messages">{messages.map((m,i)=><div key={i} className={`msg ${m.role}`}><div className="tag">{m.role==='nadaa'?'NADAA':'YOU'}</div><div className="bubble">{m.text}</div></div>)}</div><div className="composer"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendText()} placeholder="Tell Nadaa what to do…"/><button onClick={sendText}>↗</button></div></div>
      <div className="panel toolbox"><div className="panel-head"><b>MPI TOOLBUS</b><span>free-first</span></div><div className="voice-row"><button onClick={enrollCreator}>Enroll creator voice</button><span>{voiceSetup || 'Local voiceprint gate'}</span></div><label>Open a link for Nadaa to view</label><div className="row"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…"/><button onClick={openUrl}>Read</button></div><div className="grid"><div className="tool"><b>VOICE ID</b><span>Creator verification via local ECAPA model</span></div><div className="tool"><b>FILES</b><span><input type="file" onChange={uploadFile}/>{fileName || "Upload images, PDFs, documents and media"}</span></div><div className="tool"><b>ACTIONS</b><span>Native bridge: WhatsApp, calls, apps</span></div><div className="tool"><b>EXPORT</b><span>PDF · DOCX · PPTX · LaTeX</span></div></div><div className="notice">Destructive or external actions use a confirmation gate. API keys stay server-side.</div></div></section>
    </main><footer><span>NADAA 39 / MPI v0.1</span><span>Designed for Ramatema Pule</span></footer>
  </div>
}
createRoot(document.getElementById('root')!).render(<App/>);
