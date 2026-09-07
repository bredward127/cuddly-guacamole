'use client';
import {useState} from 'react';
import HelpInfo from './HelpInfo';
import {Character, blankCharacter, generateCharacterIdeas, isGroupFormat, validateCharacters} from '../lib/characters';

export default function CharacterBuilder({
  format,
  groupName,
  characters,
  onChange,
}: {
  format: string;
  groupName: string;
  characters: Character[];
  onChange: (next:{characters: Character[]; groupName: string}) => void;
}){
  const [open, setOpen] = useState(true);
  const group = isGroupFormat(format);
  const errors = validateCharacters(characters, format, groupName);

  function update(index: number, patch: Partial<Character>){
    onChange({
      groupName,
      characters: characters.map((c, i) => i===index ? {...c, ...patch, isMainCharacter:i===0} : {...c, isMainCharacter:i===0}),
    });
  }
  function add(){
    if(!group || characters.length >= 6) return;
    onChange({groupName, characters:[...characters, blankCharacter({role:'Group member'})]});
  }
  function remove(index: number){
    if(!group || index===0 || characters.length <= 3) return;
    onChange({
      groupName,
      characters: characters.filter((_, i) => i!==index).map((c, i) => ({...c, isMainCharacter:i===0})),
    });
  }
  function ideas(){
    onChange(generateCharacterIdeas(format, characters));
  }

  return (
    <section className="chars">
      <div className="chars-head">
        <button type="button" className="chars-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          Characters <span>{open ? '\u2212' : '+'}</span>
        </button>
        <HelpInfo label="About character definition" text="Define character names, relationships, personalities, secrets, and who is the main character."/>
      </div>
      {open && <div className="chars-body">
        {group && <label>Group chat name
          <input value={groupName} onChange={e => onChange({characters, groupName:e.target.value})} placeholder="e.g. Night Shift" maxLength={42}/>
        </label>}
        <div className="char-grid">
          {characters.map((c, i) => (
            <article key={c.id} className={`char-card${c.isMainCharacter ? ' main' : ''}`}>
              <div className="char-card-head">
                <b>{i===0 ? 'You / Main character' : group ? `Participant ${i+1}` : 'Other participant'}</b>
                {group && i>0 && characters.length>3 && <button type="button" className="ghost danger" onClick={() => remove(i)}>Remove</button>}
              </div>
              <label>Name<input value={c.name} onChange={e => update(i, {name:e.target.value})} maxLength={40} required/></label>
              <label>Role<input value={c.role} onChange={e => update(i, {role:e.target.value})} maxLength={80}/></label>
              <label>Relationship<input value={c.relationship} onChange={e => update(i, {relationship:e.target.value})} maxLength={120}/></label>
              <label>Personality<textarea rows={2} value={c.personality} onChange={e => update(i, {personality:e.target.value})} maxLength={180}/></label>
              <label>Secret or motivation<textarea rows={2} value={c.secret} onChange={e => update(i, {secret:e.target.value})} maxLength={180}/></label>
            </article>
          ))}
        </div>
        <div className="char-actions">
          {group && characters.length<6 && <button type="button" className="ghost" onClick={add}>Add Character</button>}
          <button type="button" className="idea" onClick={ideas}>Generate character ideas</button>
        </div>
        {errors.length>0 && <ul className="char-errors">{errors.map(err => <li key={err}>{err}</li>)}</ul>}
      </div>}
    </section>
  );
}
