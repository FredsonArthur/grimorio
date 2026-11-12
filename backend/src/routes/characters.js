const express = require('express');
const { z } = require('zod');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const validar = require('../utils/validar');

// Montado em /rooms/:roomId/characters
const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const ATRIBUTOS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const PERICIAS = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival',
];

const texto = (max) => z.string().trim().max(max, `Texto muito longo (máximo de ${max} caracteres)`);
const inteiro = (min, max, rotulo) =>
  z
    .number(`${rotulo}: informe um número`)
    .int(`${rotulo}: use um número inteiro`)
    .min(min, `${rotulo}: o mínimo é ${min}`)
    .max(max, `${rotulo}: o máximo é ${max}`);

const atributos = z.object({
  str: inteiro(1, 30, 'Força'),
  dex: inteiro(1, 30, 'Destreza'),
  con: inteiro(1, 30, 'Constituição'),
  int: inteiro(1, 30, 'Inteligência'),
  wis: inteiro(1, 30, 'Sabedoria'),
  cha: inteiro(1, 30, 'Carisma'),
});

// A vida atual nunca pode passar da vida máxima (a vida temporária é separada)
const vidaAtualDentroDoMaximo = (hp) => hp.current <= hp.max;
const erroVida = { error: 'A vida atual não pode passar da vida máxima', path: ['current'] };

const dadosJogador = z.object({
  class: texto(40),
  subclass: texto(40),
  race: texto(40),
  background: texto(40),
  alignment: texto(30),
  level: inteiro(1, 20, 'Nível'),
  xp: inteiro(0, 1000000, 'XP'),
  abilities: atributos,
  hp: z
    .object({
      max: inteiro(0, 999, 'Vida máxima'),
      current: inteiro(0, 999, 'Vida atual'),
      temp: inteiro(0, 999, 'Vida temporária'),
    })
    .refine(vidaAtualDentroDoMaximo, erroVida),
  ac: inteiro(0, 40, 'Classe de Armadura'),
  speed: texto(40),
  savingThrows: z.array(z.enum(ATRIBUTOS)).max(6),
  skills: z.array(z.enum(PERICIAS)).max(18),
  attacks: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Dê um nome ao ataque').max(60, 'Nome do ataque muito longo'),
        bonus: texto(10),
        damage: texto(40),
      })
    )
    .max(20, 'No máximo 20 ataques'),
  equipment: texto(3000),
  spells: texto(5000),
  features: texto(5000),
  notes: texto(5000),
});

const dadosNpc = z.object({
  creatureType: texto(60),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  challenge: texto(10),
  abilities: atributos,
  hp: z
    .object({
      max: inteiro(0, 9999, 'Vida máxima'),
      current: inteiro(0, 9999, 'Vida atual'),
    })
    .refine(vidaAtualDentroDoMaximo, erroVida),
  ac: inteiro(0, 40, 'Classe de Armadura'),
  speed: texto(80),
  senses: texto(200),
  languages: texto(200),
  traits: texto(4000),
  actions: texto(4000),
  notes: texto(4000), // anotações secretas do mestre
});

const dadosSchema = { PLAYER: dadosJogador, NPC: dadosNpc };

const ATRIBUTOS_PADRAO = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const dadosPadrao = {
  PLAYER: {
    class: '', subclass: '', race: '', background: '', alignment: '',
    level: 1, xp: 0,
    abilities: { ...ATRIBUTOS_PADRAO },
    hp: { max: 10, current: 10, temp: 0 },
    ac: 10, speed: '9 m',
    savingThrows: [], skills: [], attacks: [],
    equipment: '', spells: '', features: '', notes: '',
  },
  NPC: {
    creatureType: '', size: 'medium', challenge: '0',
    abilities: { ...ATRIBUTOS_PADRAO },
    hp: { max: 4, current: 4 },
    ac: 10, speed: '9 m', senses: '', languages: '',
    traits: '', actions: '', notes: '',
  },
};

const imagemSchema = z
  .string()
  .trim()
  .max(500, 'Link muito longo')
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Use um link que comece com http:// ou https://');

const camposComuns = {
  name: z.string().trim().min(1, 'Dê um nome à ficha').max(60, 'Nome muito longo'),
  imageUrl: imagemSchema,
  playerId: z.string().max(100).nullable(),
  visibleToPlayers: z.boolean(),
  data: z.record(z.string(), z.unknown()),
};

const criarSchema = z.object({
  type: z.enum(['PLAYER', 'NPC'], 'Tipo de ficha inválido'),
  name: camposComuns.name,
  imageUrl: camposComuns.imageUrl.optional(),
  playerId: camposComuns.playerId.optional(),
  visibleToPlayers: camposComuns.visibleToPlayers.optional(),
  data: camposComuns.data.optional(),
});

const atualizarSchema = z.object({
  name: camposComuns.name.optional(),
  imageUrl: camposComuns.imageUrl.optional(),
  playerId: camposComuns.playerId.optional(),
  visibleToPlayers: camposComuns.visibleToPlayers.optional(),
  data: camposComuns.data.optional(),
});

// Garante que o usuário é membro da sala; responde 404 e devolve null se não for.
async function exigirMembro(req, res) {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.roomId, userId: req.userId } },
  });
  if (!membership) {
    res.status(404).json({ error: 'Sala não encontrada' });
    return null;
  }
  return membership;
}

function exigirMestre(membership, res) {
  if (membership.role !== 'MASTER') {
    res.status(403).json({ error: 'Apenas o mestre pode fazer isso' });
    return false;
  }
  return true;
}

// Confere se o jogador indicado é mesmo um jogador desta sala
async function jogadorValido(roomId, playerId) {
  const membro = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: playerId } },
  });
  return Boolean(membro) && membro.role === 'PLAYER';
}

function erroCampo(res, campo, mensagem) {
  res.status(400).json({ error: 'Dados inválidos', details: [{ campo, mensagem }] });
}

// As anotações secretas dos NPCs nunca vão para os jogadores
function serializar(character, mestre) {
  const data = { ...character.data };
  if (!mestre && character.type === 'NPC') delete data.notes;

  return {
    id: character.id,
    type: character.type,
    name: character.name,
    imageUrl: character.imageUrl,
    playerId: character.playerId,
    playerName: character.player?.name ?? null,
    visibleToPlayers: character.visibleToPlayers,
    data,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  };
}

const incluirJogador = { player: { select: { name: true } } };

// O jogador vê as próprias fichas e os NPCs revelados pelo mestre
function podeVer(character, membership, userId) {
  if (membership.role === 'MASTER') return true;
  if (character.type === 'PLAYER') return character.playerId === userId;
  return character.visibleToPlayers;
}

async function carregarFicha(req, res) {
  const character = await prisma.character.findFirst({
    where: { id: req.params.characterId, roomId: req.params.roomId },
    include: incluirJogador,
  });
  if (!character) {
    res.status(404).json({ error: 'Ficha não encontrada' });
    return null;
  }
  return character;
}

// Listar fichas
router.get('/', async (req, res) => {
  const membership = await exigirMembro(req, res);
  if (!membership) return;

  const mestre = membership.role === 'MASTER';
  const where = mestre
    ? { roomId: req.params.roomId }
    : {
        roomId: req.params.roomId,
        OR: [{ playerId: req.userId }, { type: 'NPC', visibleToPlayers: true }],
      };

  const characters = await prisma.character.findMany({
    where,
    include: incluirJogador,
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  res.json({ characters: characters.map((c) => serializar(c, mestre)) });
});

// Criar ficha (só mestre)
router.post('/', async (req, res) => {
  const membership = await exigirMembro(req, res);
  if (!membership || !exigirMestre(membership, res)) return;

  const body = validar(criarSchema, req.body, res);
  if (!body) return;

  const dados = validar(dadosSchema[body.type], body.data ?? dadosPadrao[body.type], res);
  if (!dados) return;

  let playerId = null;
  if (body.type === 'PLAYER' && body.playerId) {
    if (!(await jogadorValido(req.params.roomId, body.playerId))) {
      return erroCampo(res, 'playerId', 'Escolha um jogador que faça parte da sala');
    }
    playerId = body.playerId;
  }

  const character = await prisma.character.create({
    data: {
      roomId: req.params.roomId,
      type: body.type,
      name: body.name,
      imageUrl: body.imageUrl,
      playerId,
      visibleToPlayers: body.type === 'NPC' ? (body.visibleToPlayers ?? false) : false,
      data: dados,
    },
    include: incluirJogador,
  });

  res.status(201).json({ character: serializar(character, true) });
});

// Ver uma ficha
router.get('/:characterId', async (req, res) => {
  const membership = await exigirMembro(req, res);
  if (!membership) return;

  const character = await carregarFicha(req, res);
  if (!character) return;

  if (!podeVer(character, membership, req.userId)) {
    return res.status(404).json({ error: 'Ficha não encontrada' });
  }

  res.json({ character: serializar(character, membership.role === 'MASTER') });
});

// Editar ficha (mestre em qualquer uma; jogador só na própria)
router.patch('/:characterId', async (req, res) => {
  const membership = await exigirMembro(req, res);
  if (!membership) return;

  const character = await carregarFicha(req, res);
  if (!character) return;

  const mestre = membership.role === 'MASTER';
  const donoDaFicha = character.type === 'PLAYER' && character.playerId === req.userId;

  if (!mestre && !donoDaFicha) {
    return res.status(404).json({ error: 'Ficha não encontrada' });
  }

  const body = validar(atualizarSchema, req.body, res);
  if (!body) return;

  if (!mestre && (body.playerId !== undefined || body.visibleToPlayers !== undefined)) {
    return res.status(403).json({ error: 'Apenas o mestre pode mudar o dono ou a visibilidade da ficha' });
  }

  const update = { name: body.name, imageUrl: body.imageUrl };

  if (body.data !== undefined) {
    const dados = validar(dadosSchema[character.type], body.data, res);
    if (!dados) return;
    update.data = dados;
  }

  if (mestre && body.playerId !== undefined) {
    if (character.type !== 'PLAYER') {
      return erroCampo(res, 'playerId', 'Só fichas de personagem têm um jogador');
    }
    if (body.playerId !== null && !(await jogadorValido(req.params.roomId, body.playerId))) {
      return erroCampo(res, 'playerId', 'Escolha um jogador que faça parte da sala');
    }
    update.playerId = body.playerId;
  }

  if (mestre && body.visibleToPlayers !== undefined && character.type === 'NPC') {
    update.visibleToPlayers = body.visibleToPlayers;
  }

  const updated = await prisma.character.update({
    where: { id: character.id },
    data: update,
    include: incluirJogador,
  });

  res.json({ character: serializar(updated, mestre) });
});

// Apagar ficha (só mestre)
router.delete('/:characterId', async (req, res) => {
  const membership = await exigirMembro(req, res);
  if (!membership || !exigirMestre(membership, res)) return;

  const character = await carregarFicha(req, res);
  if (!character) return;

  await prisma.character.delete({ where: { id: character.id } });
  res.status(204).end();
});

module.exports = router;