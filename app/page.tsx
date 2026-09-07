'use client';
import {useEffect,useRef,useState}from'react';
import {getPreset,toLegacyPacing}from'../lib/pacing';
import {applySurpriseSeed,pickPremiseOnlySeed,pickSurpriseSeed}from'../lib/randomStoryIdeas';

type E={id:string;sender:string;type:'text'|'image'|'deleted';text:string;imageUrl:string;typing:number;delay:number;storyTime:string;dividerLabel:string;isMe:boolean};
type S={title:string;contactName:string;subtitle:string;events:E[];senders:string[];youSender:string;isGroup:boolean};
type Saved={id:string;savedAt:number;form:typeof defaultForm;story:S};

const PALETTE=['#e0507a','#3f9b6f','#c98a2e','#5b7fd6','#a25bd6','#2ea3a3','#d66b3f','#7a6fd6'];
function colorFor(name:string){
  let h=0;
  for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;
  return PALETTE[h%PALETTE.length];
}
const STORAGE_KEY='textflick-saved-stories';
const defaultForm={genre:'Thriller',length:'4–5 minutes',tone:'Creepy',format:'Dating-app chat',premise:'',characters:'',imageCount:4,pacing:{typing:1800,normal:3200,tension:5500,jump:5000,reveal:8500}};
const genres=['Horror','Thriller','Mystery','Romance','Drama','Comedy','Sci-fi','Fantasy','Time travel','Workplace drama','School drama'] as const;
const lengths=['45–60 seconds','90 seconds','2–3 minutes','4–5 minutes'] as const;
const tones=['Creepy','Tense','Emotional','Funny','Dark','Chaotic','Flirty','Wholesome'] as const;
const formats=['Dating-app chat','Two-person chat','Group chat','Anonymous texter','Family thread'] as const;

function loadSaved():Saved[]{
  if(typeof window==='undefined')return [];
  try{return JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'[]');}catch{return [];}
}
function persistSaved(list:Saved[]){
  try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(list.slice(0,30)));}catch{}
}
function buildPremise(form:typeof defaultForm){
  const cast=form.characters.trim();
  const story=form.premise.trim();
  return [cast&&`Character definitions:\n${cast}`,story].filter(Boolean).join('\n\n');
}

export default function Home(){
  const[story,setStory]=useState<S|null>(null);
  const[form,setForm]=useState(defaultForm);
  const[v,setV]=useState(0),[play,setPlay]=useState(false),[typing,setTyping]=useState(false),[load,setLoad]=useState(false),[err,setErr]=useState(''),[record,setRecord]=useState(false);
  const[saved,setSaved]=useState<Saved[]>([]);
  const[showSaved,setShowSaved]=useState(false);
  const[toast,setToast]=useState('');
  const[pop,setPop]=useState(false);
  const bottom=useRef<HTMLDivElement>(null);
  const lastHook=useRef('');
  const toastTimer=useRef<number>(0);

  useEffect(()=>{setSaved(loadSaved());},[]);
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'end'})},[v,typing]);
  useEffect(()=>{
    if(!play||!story||v>=story.events.length){if(story&&v>=story.events.length)setPlay(false);return}
    const e=story.events[v];setTyping(true);
    const a=setTimeout(()=>setTyping(false),e.typing);
    const b=setTimeout(()=>setV(x=>x+1),e.typing+e.delay);
    return()=>{clearTimeout(a);clearTimeout(b)};
  },[play,v,story]);

  function ping(text:string){
    setToast(text);setPop(true);
    window.setTimeout(()=>setPop(false),420);
    window.clearTimeout(toastTimer.current);
    toastTimer.current=window.setTimeout(()=>setToast(''),2400);
  }
  function surpriseMe(){
    const seed=pickSurpriseSeed(lastHook.current);
    lastHook.current=seed.hook;
    setForm({...form,...applySurpriseSeed(seed)});
    ping(`✦ ${seed.hook}`);
  }
  function randomPremise(){
    const seed=pickPremiseOnlySeed(form.genre,form.premise);
    lastHook.current=seed.hook;
    setForm({...form,premise:seed.premise});
    ping(`Premise unlocked: ${seed.hook}`);
  }
  function saveStory(s:S,f:typeof defaultForm){
    const entry:Saved={id:`${Date.now()}`,savedAt:Date.now(),form:f,story:s};
    const next=[entry,...loadSaved()];
    persistSaved(next);
    setSaved(next);
  }
  function openSaved(entry:Saved){
    setStory(entry.story);
    setForm({...defaultForm,...entry.form,pacing:{...defaultForm.pacing,...(entry.form?.pacing||{})}});
    setV(0);setPlay(false);setShowSaved(false);
  }
  function deleteSaved(id:string){
    const next=saved.filter(s=>s.id!==id);
    persistSaved(next);setSaved(next);
  }

  async function make(){
    setLoad(true);setErr('');
    try{
      const r=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,premise:buildPremise(form)})});
      const d=await r.json();
      if(!r.ok)throw Error(d.error||'Generation failed');
      setStory(d);setV(0);setPlay(false);
      saveStory(d,form);
    }catch(e){setErr(e instanceof Error?e.message:'Generation failed')}
    finally{setLoad(false)}
  }
  const set=(k:string,x:unknown)=>setForm({...form,[k]:x});
  const p=(k:string,x:number)=>setForm({...form,pacing:{...form.pacing,[k]:x}});
  const clock=story?.events[Math.max(0,v-1)]?.storyTime||'9:41 PM';

  if(!story)return <main className="shell"><section className="setup">
    <div className="topbar"><b>✦ TextFlick Studio</b>{saved.length>0&&<button className="ghost" onClick={()=>setShowSaved(true)}>My Stories ({saved.length})</button>}</div>
    <h1>Build the story. Then play it.</h1>
    <div className="grid">
      {([
        ['Genre','genre',genres],
        ['Length','length',lengths],
        ['Tone','tone',tones],
        ['Format','format',formats],
      ] as const).map(([l,k,o])=>(
        <label key={k}>{l}
          <select value={String(form[k])} onChange={e=>set(k,e.target.value)}>
            {o.map(x=><option key={x}>{x}</option>)}
          </select>
        </label>
      ))}
    </div>
    <label>Character definition
      <textarea rows={3} value={form.characters} onChange={e=>set('characters',e.target.value)} placeholder="Names, relationships, personalities, secrets, and who is the main character…"/>
    </label>
    <label>Story details
      <textarea rows={5} value={form.premise} onChange={e=>set('premise',e.target.value)} placeholder="Describe exactly what happens…"/>
    </label>
    <div className={`idea-row${pop?' pop':''}`}>
      <button type="button" className="idea surprise" onClick={surpriseMe}>Surprise Me</button>
      <button type="button" className="idea" onClick={randomPremise}>Random Premise Only</button>
    </div>
    <label>AI image reveals
      <select value={form.imageCount} onChange={e=>set('imageCount',Number(e.target.value))}>
        {[0,1,2,3,4].map(x=><option key={x} value={x}>{x} images</option>)}
      </select>
    </label>
    <div className="pace"><strong>Your pacing</strong>
      {([
        ['Typing before text','typing'],
        ['Normal reading pause','normal'],
        ['Tension pause','tension'],
        ['Time-jump hold','jump'],
        ['Image / twist hold','reveal'],
      ] as const).map(([l,k])=>(
        <label key={k}>{l}<span>{(form.pacing[k]/1000).toFixed(1)}s</span>
          <input type="range" min="500" max="12000" step="250" value={form.pacing[k]} onChange={e=>p(k,Number(e.target.value))}/>
        </label>
      ))}
    </div>
    <button disabled={load||form.premise.length<8} onClick={make}>{load?'Creating story and images…':'Generate complete story'}</button>
    {err&&<p>{err}</p>}
    {toast&&<div className="idea-toast" role="status">{toast}</div>}

    {showSaved&&<div className="overlay" onClick={()=>setShowSaved(false)}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-head"><b>My Stories</b><button className="ghost" onClick={()=>setShowSaved(false)}>Close</button></div>
        {saved.length===0&&<p className="muted">No saved stories yet.</p>}
        {saved.map(s=>(
          <div key={s.id} className="saved-row">
            <div onClick={()=>openSaved(s)}>
              <b>{s.story.title}</b>
              <small>{s.form.genre} · {s.form.length} · {new Date(s.savedAt).toLocaleString()}</small>
            </div>
            <button className="ghost danger" onClick={()=>deleteSaved(s.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>}
  </section></main>;

  const headerName=story.isGroup?story.title:story.senders.find(s=>s!==story.youSender)||story.contactName;
  return <main className={record?'recording':'shell'}>
    <section className="stage">
      <div className="phone">
        <header><span>{clock}</span><span className="notch"/><span>●◔</span></header>
        <div className="head"><i>{story.isGroup?'#':'?'}</i><div><b>{headerName}</b><small>{typing?'typing…':story.subtitle}</small></div></div>
        <div className="chat">
          <em>{story.title}</em>
          {story.events.slice(0,v).map((e,idx,arr)=>{
            const prev=idx>0?arr[idx-1]:null;
            const showName=story.isGroup&&!e.isMe&&e.type!=='deleted'&&(!prev||prev.sender!==e.sender);
            return (
              <div key={e.id}>
                {e.dividerLabel&&<div className="divider">{e.dividerLabel}<small>{e.storyTime}</small></div>}
                <div className={e.isMe?'row out':'row in'}>
                  <article style={!e.isMe&&story.isGroup?{borderLeft:`3px solid ${colorFor(e.sender)}`}:undefined}>
                    {showName&&<b className="sendername" style={{color:colorFor(e.sender)}}>{e.sender}</b>}
                    {e.type==='image'&&<img src={e.imageUrl} alt="AI story reveal"/>}
                    <span>{e.text}</span>
                  </article>
                </div>
              </div>
            );
          })}
          {typing&&<div className="dots">•••</div>}
          <div ref={bottom}/>
        </div>
        <footer>＋ <span>Message</span> 🎙</footer>
      </div>
      <div className="controls">
        <button onClick={()=>v>=story.events.length?setV(0):setPlay(!play)}>{play?'Pause':v>=story.events.length?'Replay':'Play story'}</button>
        <button onClick={()=>{setV(0);setPlay(false)}}>Restart</button>
        <button onClick={()=>setRecord(!record)}>{record?'Exit recording':'Recording mode'}</button>
        {!record&&<button onClick={()=>setStory(null)}>New story</button>}
        {!record&&saved.length>0&&<button onClick={()=>setShowSaved(true)}>My Stories</button>}
      </div>
      {showSaved&&<div className="overlay" onClick={()=>setShowSaved(false)}>
        <div className="sheet" onClick={e=>e.stopPropagation()}>
          <div className="sheet-head"><b>My Stories</b><button className="ghost" onClick={()=>setShowSaved(false)}>Close</button></div>
          {saved.length===0&&<p className="muted">No saved stories yet.</p>}
          {saved.map(s=>(
            <div key={s.id} className="saved-row">
              <div onClick={()=>openSaved(s)}>
                <b>{s.story.title}</b>
                <small>{s.form.genre} · {s.form.length} · {new Date(s.savedAt).toLocaleString()}</small>
              </div>
              <button className="ghost danger" onClick={()=>deleteSaved(s.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>}
    </section>
  </main>;
}
