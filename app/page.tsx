'use client';

import { useEffect, useState } from 'react';

type StoryEvent = { id: string; sender: string; type: 'text' | 'image' | 'deleted'; text: string; imagePrompt: string; imageUrl: string; delay: number; typing: number };
type Story = { title: string; contactName: string; subtitle: string; events: StoryEvent[] };

const starter: Story = { title: 'Unknown Number', contactName: 'Unknown Number', subtitle: 'Active now', events: [
  { id: '1', sender: 'Unknown Number', type: 'text', text: "Don’t answer the door.", imagePrompt: '', imageUrl: '', delay: 800, typing: 900 },
  { id: '2', sender: 'Maya', type: 'text', text: 'Who is this?', imagePrompt: '', imageUrl: '', delay: 900, typing: 450 },
  { id: '3', sender: 'Unknown Number', type: 'text', text: 'I can see your porch light from here.', imagePrompt: '', imageUrl: '', delay: 1500, typing: 1200 }
] };

export default function Home() {
  const [genre, setGenre] = useState('Thriller'); const [length, setLength] = useState('45–60 seconds'); const [tone, setTone] = useState('Tense'); const [format, setFormat] = useState('Two-person chat');
  const [premise, setPremise] = useState('A girl gets messages from a number that knows she is home alone.'); const [story, setStory] = useState<Story>(starter); const [visible, setVisible] = useState(0); const [playing, setPlaying] = useState(false); const [typing, setTyping] = useState(false); const [speed, setSpeed] = useState(1); const [recording, setRecording] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    if (!playing || visible >= story.events.length) { if (visible >= story.events.length) setPlaying(false); return; }
    const event = story.events[visible]; setTyping(true);
    const typingTimer = window.setTimeout(() => setTyping(false), event.typing / speed);
    const messageTimer = window.setTimeout(() => setVisible((count) => count + 1), (event.typing + event.delay) / speed);
    return () => { clearTimeout(typingTimer); clearTimeout(messageTimer); };
  }, [playing, visible, speed, story.events]);

  const restart = () => { setPlaying(false); setTyping(false); setVisible(0); };
  const play = () => { if (visible >= story.events.length) restart(); else setPlaying((value) => !value); };
  async function generate() {
    restart(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ genre, length, tone, format, premise }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Generation failed.');
      setStory(data); localStorage.setItem('textflick-last-story', JSON.stringify(data));
    } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed.'); } finally { setLoading(false); }
  }

  return <main className={recording ? 'recording-shell' : 'app-shell'}>
    {!recording && <section className="builder">
      <div className="brand"><span className="star">✦</span><span>TextFlick</span><small>STUDIO</small></div><p className="eyebrow">AI CHAT-STORY ENGINE</p><h1>Make stories people <em>have</em> to finish.</h1><p className="subhead">Claude writes every beat. fal.ai creates the reveal images. The player follows the pacing built into the story.</p>
      <div className="form-grid"><label>Genre<select value={genre} onChange={(e) => setGenre(e.target.value)}>{['Horror','Thriller','Romance','Mystery','Comedy','Sci-fi','Drama'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Length<select value={length} onChange={(e) => setLength(e.target.value)}>{['20–30 seconds','45–60 seconds','90 seconds','2–3 minutes'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Tone<select value={tone} onChange={(e) => setTone(e.target.value)}>{['Tense','Creepy','Emotional','Chaotic','Funny','Dark'].map((x) => <option key={x}>{x}</option>)}</select></label><label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}>{['Two-person chat','Group chat','Anonymous texter','Dating-app chat','Family thread'].map((x) => <option key={x}>{x}</option>)}</select></label></div>
      <label>Story premise<textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={5} maxLength={700} /></label><button className="primary" onClick={generate} disabled={loading}>{loading ? '✦ Writing story + generating images…' : '✦ Generate complete story'}</button>{error && <p className="error">{error}</p>}<div className="note">Generated stories are fictional. Your keys stay server-side in Vercel.</div>
    </section>}
    <section className="preview-area">
      {!recording && <div className="preview-title"><span>{loading ? 'CREATING STORY' : 'LIVE PREVIEW'}</span><b>{story.title}</b></div>}
      <div className="phone"><div className="phone-top"><span>9:41</span><span className="notch"></span><span>◔ ◡ ▰</span></div><div className="chat-head"><button aria-label="Back">‹</button><div className="avatar">?</div><div><strong>{story.contactName}</strong><small>{typing ? 'typing…' : story.subtitle}</small></div><button aria-label="Info">ⓘ</button></div><div className="messages"><div className="day">{story.title.toUpperCase()}</div>{story.events.slice(0, visible).map((event) => <Message key={event.id} event={event} contact={story.contactName} />)}{typing && <div className="typing"><i/><i/><i/></div>}{visible === story.events.length && <div className="ending">THE END?<br/><span>Replay or make the next chapter.</span></div>}</div><div className="composer"><span>＋</span><div>Message</div><span>⌁</span><span>🎙</span></div></div>
      <div className="controls"><button className="play" onClick={play}>{playing ? 'Ⅱ Pause' : visible >= story.events.length ? '↻ Replay' : '▶ Play story'}</button><button onClick={restart}>↺ Restart</button><select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed"><option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option></select><button className="record" onClick={() => setRecording((value) => !value)}>{recording ? 'Exit recording' : '● Recording mode'}</button></div>
    </section>
  </main>;
}

function Message({ event, contact }: { event: StoryEvent; contact: string }) {
  if (event.type === 'deleted') return <div className="deleted">{event.text}</div>; const incoming = event.sender === contact;
  return <div className={incoming ? 'message-row incoming' : 'message-row outgoing'}><div className="bubble">{event.type === 'image' && <div className="image-card"><img src={event.imageUrl} alt="AI-generated fictional story reveal"/><small>AI story image</small></div>}<p>{event.text}</p></div></div>;
}
