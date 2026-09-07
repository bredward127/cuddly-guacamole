export type Character = {
  id: string;
  name: string;
  role: string;
  relationship: string;
  personality: string;
  secret: string;
  isMainCharacter: boolean;
};

const NAMES = ['Maya Chen','Jordan Hale','Priya Shah','Lena Park','Noah Ellison','Avery Kim','Sasha Voss','Camille Ortiz','Rowan Blake','Theo Marin','Nia Brooks','June Patel','Remy Fox','Tasha Nguyen','Keira Bloom','Wren Vale','Dana Okeke','Jamie Park','Elena Vasquez','Amira Sol','Ellis Ward','Harper Quinn','Cass Vale','Felix Rahman','Imani Brooks'];
const PERSONALITIES = ['anxious but loyal','dry and observant','warm until cornered','funny to hide fear','quietly stubborn','charming and too curious','practical, then panics','soft-spoken with a sharp memory'];
const SECRETS = ['hiding a message they were not supposed to see','covering for someone they love','about to leave town','knows the photo is real','pretending not to recognize a name','owes a favor they cannot explain','deleted a chat last night','is the reason the group exists'];
const RELATIONSHIPS = ['best friend','coworker','sibling','ex','neighbor','classmate','roommate','cousin'];

export function isGroupFormat(format: string){
  return /group|family/i.test(format);
}

export function newCharacterId(){
  return `c_${Math.random().toString(36).slice(2,10)}`;
}

export function blankCharacter(partial: Partial<Character> = {}): Character {
  return {
    id: newCharacterId(),
    name: '',
    role: '',
    relationship: '',
    personality: '',
    secret: '',
    isMainCharacter: false,
    ...partial,
  };
}

export function defaultCharacters(format: string): Character[] {
  if(isGroupFormat(format)){
    return [
      blankCharacter({isMainCharacter:true, role:'You / Main character'}),
      blankCharacter({role:'Group member'}),
      blankCharacter({role:'Group member'}),
    ];
  }
  return [
    blankCharacter({isMainCharacter:true, role:'You / Main character'}),
    blankCharacter({role:'Other participant'}),
  ];
}

export function syncCharactersToFormat(chars: Character[] | undefined, format: string): Character[] {
  const current = Array.isArray(chars) && chars.length ? chars : defaultCharacters(format);
  const group = isGroupFormat(format);
  if(!group){
    const main = current[0] || blankCharacter({isMainCharacter:true, role:'You / Main character'});
    const other = current[1] || blankCharacter({role:'Other participant'});
    return [
      {...main, id:main.id || newCharacterId(), isMainCharacter:true, role:main.role || 'You / Main character'},
      {...other, id:other.id || newCharacterId(), isMainCharacter:false, role:other.role || 'Other participant'},
    ];
  }
  let next = current.slice(0, 6).map((c, i) => ({...c, id:c.id || newCharacterId(), isMainCharacter:i===0}));
  while(next.length < 3) next.push(blankCharacter({role:'Group member'}));
  return next.map((c, i) => ({...c, isMainCharacter:i===0, role:i===0 ? (c.role || 'You / Main character') : (c.role || 'Group member')}));
}

export function validateCharacters(chars: Character[], format: string, groupName: string){
  const errors: string[] = [];
  const group = isGroupFormat(format);
  const list = Array.isArray(chars) ? chars : [];
  if(group && !groupName.trim()) errors.push('Give the group chat a name.');
  if(group && (list.length < 3 || list.length > 6)) errors.push('Group chats need 3 to 6 characters.');
  if(!group && list.length !== 2) errors.push('One-on-one chats need exactly two characters.');
  const names = list.map(c => c.name.trim());
  if(names.some(name => !name)) errors.push('Every character needs a name.');
  const lower = names.map(name => name.toLowerCase()).filter(Boolean);
  if(new Set(lower).size !== lower.length) errors.push('Character names must be unique.');
  if(list[0] && !list[0].isMainCharacter) errors.push('The first character must be the main character.');
  if(list.slice(1).some(c => c.isMainCharacter)) errors.push('Only the main character can be marked as you.');
  return errors;
}

function pick<T>(items: T[], used: Set<string> = new Set()){
  const pool = items.filter(item => !used.has(String(item)));
  const list = pool.length ? pool : items;
  const value = list[Math.floor(Math.random() * list.length)];
  used.add(String(value));
  return value;
}

export function generateCharacterIdeas(format: string, existing: Character[] = []): {groupName: string; characters: Character[]} {
  const group = isGroupFormat(format);
  const count = group ? Math.min(6, Math.max(3, existing.length || 3 + Math.floor(Math.random() * 2))) : 2;
  const used = new Set<string>();
  const characters = Array.from({length: count}, (_, i) => {
    const prev = existing[i];
    const name = pick(NAMES, used);
    return blankCharacter({
      id: prev?.id || newCharacterId(),
      name,
      role: i===0 ? 'You / Main character' : group ? pick(['friend','coworker','sibling','the skeptic','the instigator','the peacemaker']) : 'Other participant',
      relationship: i===0 ? 'Main character, right-side sender' : pick(RELATIONSHIPS),
      personality: pick(PERSONALITIES),
      secret: pick(SECRETS),
      isMainCharacter: i===0,
    });
  });
  return {
    groupName: group ? pick(['Night Shift','Do Not Add Him','Family Thread','The Group Chat','Weekend Cabin','Project Firefly']) : '',
    characters,
  };
}

export function charactersFromSeedText(text: string, format: string, hook: string){
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const base = defaultCharacters(format);
  const characters = base.map((c, i) => {
    const line = lines[i] || lines[0] || '';
    const cleaned = line.replace(/^[A-Za-z][A-Za-z0-9 ./-]{0,24}:\s*/, '');
    const name = (cleaned.split(/[,—]/)[0] || '').trim().slice(0, 40) || (i===0 ? 'Maya Chen' : `Guest ${i+1}`);
    const rest = cleaned.slice(name.length).replace(/^[,:—\s]+/, '').slice(0, 180);
    return {
      ...c,
      name,
      personality: rest || c.personality,
      relationship: i===0 ? 'Main character, right-side sender' : 'Story participant',
      role: i===0 ? 'You / Main character' : (isGroupFormat(format) ? 'Group member' : 'Other participant'),
      isMainCharacter: i===0,
    };
  });
  return {groupName: isGroupFormat(format) ? hook.slice(0, 42) : '', characters};
}
