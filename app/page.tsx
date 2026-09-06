'use client';

import { useEffect, useMemo, useState } from 'react';

type StoryEvent = {
  id: string;
  sender: 'Maya' | 'Unknown';
  type: 'text' | 'image' | 'deleted';
  text?: string;
  imageLabel?: string;
  delay: number;
  typing: number;
};

const baseStory: StoryEvent[] = [
  { id: '1', sender: 'Unknown', type: 'text', text: "Don't answer the door.", delay: 700, typing: 1100 },
  { id: '2', sender: 'Maya', type: 'text', text: 'Who is this?', delay: 900, typing: 500 },
  { id: '3', sender: 'Unknown', type: 'text', text: 'Look through the peephole. Slowly.', delay: 1000, typing: 1300 },
  { id: '4', sender: 'Maya', type: 'text', text: "You're not funny.", delay: 1000, typing: 650 },
  { id: '5', sender: 'Unknown', type: 'image', imageLabel: 'Hallway camera still • 11:42 PM', text: 'I can see you.', delay: 1500, typing: 700 },
  { id: '6', sender: 'Maya', type: 'text', text: 'How did you get that picture?', delay: 1200, typing: 750 },
  { id: '7', sender: 'Unknown', type: 'deleted', text: 'Unknown deleted a message', delay: 950, typing: 700 },
  { id: '8', sender: 'Unknown', type: 'text', text: "Maya… don't turn around.", delay: 1700, typing: 1450 },
];

const prompts: Record<string, string> = {
  Horror: 'A paranormal horror story where a familiar voice texts from a disconnected phone.',
  Thriller: 'A tense thriller about someone receiving messages from an unknown number that knows their location.',
  Romance: 'An emotional romance where two strangers discover their messages are arriving years apart.',
  Mystery: 'A mystery about a group chat message sent by someone who vanished years ago.',
  Comedy: 'A chaotic comedy where a wrong-number text spirals into an absurd neighborhood mystery.',
};

export default function Home() {
  const [genre, setGenre] = useState('Thriller');
  const [length, setLength] = useState('45–60 seconds');
  const [premise, setPremise] = useState('A girl gets messages from a number that knows she is home alone.');
  const [visible, setVisible] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recordMode, setRecordMode] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTyping, setShowTyping] = useState(false);

  const events = useMemo(() => baseStory, []);

  useEffect(() => {
    if (!playing || visible >= events.length) {
      if (visible >= events.length) setPlaying(false);
      return;
    }
    const event = events[visible];
    setShowTyping(true);
    const typingTimer = window.setTimeout(() => setShowTyping(false), event.typing / speed);
    const eventTimer = window.setTimeout(() => setVisible((current) => current + 1), (event.typing + event.delay) / speed);
    return () => { window.clearTimeout(typingTimer); window.clearTimeout(eventTimer); };
  }, [playing, visible, events, speed]);

  function restart() {
    setVisible(0);
    setShowTyping(false);
    setPlaying(false);
  }

  function generateDemo() {
    setPremise(prompts[genre]);
    restart();
  }

  return (
    <main className={recordMode ? 'recording-shell' : 'app-shell'}>
      {!recordMode && (
        <section className="builder">
          <div className="brand"><span className="star">✦</span><span>TextFlick</span><small>STUDIO</small></div>
          <p className="eyebrow">AI CHAT-STORY ENGINE</p>
          <h1>Turn one idea into a story people <em>have</em> to finish.</h1>
          <p className="subhead">Write the plot, time every message, and stage visual reveals. Then press play and screen-record.</p>
          <div className="form-grid">
            <label>Genre<select value={genre} onChange={(e) => setGenre(e.target.value)}>{Object.keys(prompts).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Story length<select value={length} onChange={(e) => setLength(e.target.value)}><option>20–30 seconds</option><option>45–60 seconds</option><option>90 seconds</option><option>2–3 minutes</option></select></label>
          </div>
          <label>Story premise<textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={5} /></label>
          <button className="primary" onClick={generateDemo}>✦ Generate demo story</button>
          <div className="note"><strong>Starter mode:</strong> This is a playable demo. Connect Claude and fal.ai through server-side API routes—never expose API keys in browser code.</div>
          <div className="ai-plan"><span>Claude</span><i>→</i><span>Structured Story JSON</span><i>→</i><span>fal.ai image jobs</span></div>
        </section>
      )}

      <section className="preview-area">
        {!recordMode && <div className="preview-title"><span>LIVE PREVIEW</span><b>{genre} · {length}</b></div>}
        <div className="phone">
          <div className="phone-top"><span>9:41</span><span className="notch"></span><span>◔ ◡ ▰</span></div>
          <div className="chat-head"><button aria-label="Back">‹</button><div className="avatar">?</div><div><strong>Unknown Number</strong><small>{showTyping ? 'typing…' : 'Active now'}</small></div><button aria-label="Info">ⓘ</button></div>
          <div className="messages">
            <div className="day">TODAY 11:42 PM</div>
            {events.slice(0, visible).map((event) => <Message key={event.id} event={event} />)}
            {showTyping && <div className="typing"><i></i><i></i><i></i></div>}
            {visible === events.length && <div className="ending">THE END?<br /><span>Tap restart to run it again.</span></div>}
          </div>
          <div className="composer"><span>＋</span><div>Message</div><span>⌁</span><span>🎙</span></div>
        </div>
        <div className={recordMode ? 'controls recording-controls' : 'controls'}>
          <button onClick={() => setPlaying((value) => !value)} className="play">{playing ? 'Ⅱ Pause' : visible === events.length ? '↻ Replay' : '▶ Play story'}</button>
          <button onClick={restart}>↺ Restart</button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed"><option value={1}>1x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option></select>
          {!recordMode && <button className="record" onClick={() => setRecordMode(true)}>● Recording mode</button>}
          {recordMode && <button className="exit" onClick={() => setRecordMode(false)}>Exit recording</button>}
        </div>
      </section>
    </main>
  );
}

function Message({ event }: { event: StoryEvent }) {
  const incoming = event.sender === 'Unknown';
  if (event.type === 'deleted') return <div className="deleted">{event.text}</div>;
  return (
    <div className={incoming ? 'message-row incoming' : 'message-row outgoing'}>
      <div className="bubble">
        {event.type === 'image' && <div className="image-card"><div className="image-art"><span>◒</span><b>AI IMAGE REVEAL</b></div><small>{event.imageLabel}</small></div>}
        {event.text && <p>{event.text}</p>}
      </div>
    </div>
  );
}
