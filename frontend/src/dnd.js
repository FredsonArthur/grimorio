export const ABILITIES = [
  { key: 'str', label: 'Força', short: 'FOR' },
  { key: 'dex', label: 'Destreza', short: 'DES' },
  { key: 'con', label: 'Constituição', short: 'CON' },
  { key: 'int', label: 'Inteligência', short: 'INT' },
  { key: 'wis', label: 'Sabedoria', short: 'SAB' },
  { key: 'cha', label: 'Carisma', short: 'CAR' },
];

export const SKILLS = [
  { key: 'acrobatics', label: 'Acrobacia', ability: 'dex' },
  { key: 'animalHandling', label: 'Adestrar Animais', ability: 'wis' },
  { key: 'arcana', label: 'Arcanismo', ability: 'int' },
  { key: 'athletics', label: 'Atletismo', ability: 'str' },
  { key: 'performance', label: 'Atuação', ability: 'cha' },
  { key: 'deception', label: 'Enganação', ability: 'cha' },
  { key: 'stealth', label: 'Furtividade', ability: 'dex' },
  { key: 'history', label: 'História', ability: 'int' },
  { key: 'intimidation', label: 'Intimidação', ability: 'cha' },
  { key: 'insight', label: 'Intuição', ability: 'wis' },
  { key: 'investigation', label: 'Investigação', ability: 'int' },
  { key: 'medicine', label: 'Medicina', ability: 'wis' },
  { key: 'nature', label: 'Natureza', ability: 'int' },
  { key: 'perception', label: 'Percepção', ability: 'wis' },
  { key: 'persuasion', label: 'Persuasão', ability: 'cha' },
  { key: 'sleightOfHand', label: 'Prestidigitação', ability: 'dex' },
  { key: 'religion', label: 'Religião', ability: 'int' },
  { key: 'survival', label: 'Sobrevivência', ability: 'wis' },
];

export const SIZES = {
  tiny: 'Miúdo',
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
  huge: 'Enorme',
  gargantuan: 'Imenso',
};

export const modifier = (score) => Math.floor((Number(score) - 10) / 2);
export const proficiencyBonus = (level) => Math.ceil(Number(level) / 4) + 1;
export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

const BASE_ABILITIES = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

// Valores iniciais dos formulários (espelham os padrões do servidor)
export const DEFAULT_DATA = {
  PLAYER: {
    class: '',
    subclass: '',
    race: '',
    background: '',
    alignment: '',
    level: 1,
    xp: 0,
    abilities: { ...BASE_ABILITIES },
    hp: { max: 10, current: 10, temp: 0 },
    ac: 10,
    speed: '9 m',
    savingThrows: [],
    skills: [],
    attacks: [],
    equipment: '',
    spells: '',
    features: '',
    notes: '',
  },
  NPC: {
    creatureType: '',
    size: 'medium',
    challenge: '0',
    abilities: { ...BASE_ABILITIES },
    hp: { max: 4, current: 4 },
    ac: 10,
    speed: '9 m',
    senses: '',
    languages: '',
    traits: '',
    actions: '',
    notes: '',
  },
};