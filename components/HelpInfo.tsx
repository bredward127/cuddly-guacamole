'use client';
import {useEffect,useId,useRef,useState} from 'react';

export default function HelpInfo({label, text}:{label:string; text:string}){
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if(!open) return;
    const onKey = (e: KeyboardEvent) => { if(e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => { if(!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span className="helpinfo" ref={ref}>
      <button type="button" className="helpinfo-btn" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>i</button>
      <span className="helpinfo-tip" role="tooltip">{text}</span>
      {open && (
        <>
          <span className="helpinfo-backdrop" onClick={() => setOpen(false)}/>
          <span className="helpinfo-sheet" id={id} role="dialog" aria-label={label}>
            <p>{text}</p>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>Got it</button>
          </span>
        </>
      )}
    </span>
  );
}
