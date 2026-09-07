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

const ROLE_PREFIXES = new Set([
  'main', 'friend', 'roommate', 'partner', 'coworker', 'neighbor',
  'driver', 'driver alias', 'unknown', 'unknown number', 'unknown editor',
  'unknown dj', 'sender', 'match', 'brother', 'sister', 'older sister',
  'youngest', 'ex', 'cousin', 'mom', 'dad', 'aunt', 'uncle', 'super',
  'director', 'boss', 'intern', 'former intern', 'manager', 'student',
  'classmate', 'peacemaker grandchild', 'planner', 'guest of honor',
  'commissioner', 'rival', 'bride', 'groom', 'maid of honor', 'substitute',
  'class clown', 'best friend', 'spirit', 'new member', 'team lead'
]);

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

function parseSeedLine(rawLine: string, index: number, format: string) {
  const line = rawLine.trim();
  let prefix = '';
  let remainder = line;
  const colonIdx = line.indexOf(':');
  if (colonIdx !== -1) {
    prefix = line.slice(0, colonIdx).trim();
    remainder = line.slice(colonIdx + 1).trim();
  }

  const cleanPrefix = prefix.replace(/^(the|a|an)\s+/i, '').trim();
  const lowerPrefix = cleanPrefix.toLowerCase();

  // Check if remainder begins with a quoted name like "Nico" or "HomeName"
  const quotedMatch = remainder.match(/^["“']([^"”',]+)["”'](.*)$/);
  if (quotedMatch) {
    const name = quotedMatch[1].trim();
    const restDesc = (quotedMatch[2] || '').trim().replace(/^[,:—\s]+/, '');
    return {
      name,
      role: prefix && lowerPrefix !== 'main' ? prefix : (index === 0 ? 'You / Main character' : isGroupFormat(format) ? 'Group member' : 'Other participant'),
      personality: restDesc || '',
    };
  }

  // If prefix is a recognized generic role descriptor or 'Main'
  if (ROLE_PREFIXES.has(lowerPrefix) || lowerPrefix === 'main') {
    const parts = remainder.split(/[,—]/);
    const name = parts[0].trim();
    const restDesc = parts.slice(1).join(', ').trim();
    return {
      name: name || (index === 0 ? 'Maya Chen' : `Participant ${index + 1}`),
      role: prefix && lowerPrefix !== 'main' ? prefix : (index === 0 ? 'You / Main character' : isGroupFormat(format) ? 'Group member' : 'Other participant'),
      personality: restDesc || '',
    };
  }

  // Check compound title prefix like "Aunt Celia", "Cousin Bea", "Classmate Rio"
  const compoundMatch = prefix.match(/^(Aunt|Uncle|Cousin|Classmate|Coach-bot|Neighbor|Super|Manager|Captain|Director|Ms\.|Mr\.)\s+(.+)$/i);
  if (compoundMatch) {
    const titleRole = compoundMatch[1].trim();
    const properName = compoundMatch[2].trim();
    return {
      name: properName,
      role: titleRole,
      personality: remainder,
    };
  }

  // If prefix itself is a distinct name (e.g. "Owen: jokes about spoilers", "Sable: the newest member")
  if (prefix) {
    return {
      name: prefix,
      role: index === 0 ? 'You / Main character' : (isGroupFormat(format) ? 'Group member' : 'Other participant'),
      personality: remainder,
    };
  }

  // Fallback: split on comma/dash
  const fallbackParts = remainder.split(/[,—]/);
  return {
    name: fallbackParts[0].trim() || (index === 0 ? 'Maya Chen' : `Participant ${index + 1}`),
    role: index === 0 ? 'You / Main character' : (isGroupFormat(format) ? 'Group member' : 'Other participant'),
    personality: fallbackParts.slice(1).join(', ').trim(),
  };
}

export function charactersFromSeedText(text: string, format: string, hook: string){
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const base = defaultCharacters(format);
  const characters = base.map((c, i) => {
    const line = lines[i] || lines[0] || '';
    const parsed = parseSeedLine(line, i, format);
    return {
      ...c,
      name: parsed.name.slice(0, 40),
      role: parsed.role || c.role,
      personality: parsed.personality.slice(0, 180) || c.personality,
      relationship: i === 0 ? 'Main character, right-side sender' : 'Story participant',
      isMainCharacter: i === 0,
    };
  });
  return {groupName: isGroupFormat(format) ? hook.slice(0, 42) : '', characters};
}
