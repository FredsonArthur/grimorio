const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const validar = require('../utils/validar');
const { canalSala, canalUsuario } = require('../utils/canais');

const router = express.Router();
router.use(requireAuth);

const roomSchema = z.object({
  name: z.string().trim().min(3, 'O nome precisa de ao menos 3 caracteres').max(60, 'Nome muito longo'),
  description: z.string().trim().max(500, 'Descrição muito longa').optional(),
  system: z.enum(['dnd5e', 'outro'], 'Sistema de regras inválido').optional(),
  campaignType: z.enum(['campaign', 'oneshot'], 'Tipo de jogo inválido').optional(),
  maxPlayers: z
    .number()
    .int('Use um número inteiro')
    .min(1, 'A sala precisa de ao menos 1 jogador')
    .max(12, 'O máximo é 12 jogadores')
    .optional(),
  startingLevel: z
    .number()
    .int('Use um número inteiro')
    .min(1, 'O nível mínimo é 1')
    .max(20, 'O nível máximo é 20')
    .optional(),
  schedule: z.string().trim().max(80, 'Texto muito longo (máximo de 80 caracteres)').optional(),
  coverUrl: z
    .string()
    .trim()
    .max(500, 'Link muito longo')
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Use um link que comece com http:// ou https://')
    .optional(),
});
const roomUpdateSchema = roomSchema.partial();

const gerarCodigo = () => crypto.randomBytes(9).toString('base64url');

const resumo = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description,
  system: room.system,
  campaignType: room.campaignType,
  maxPlayers: room.maxPlayers,
  startingLevel: room.startingLevel,
  schedule: room.schedule,
  coverUrl: room.coverUrl,
});

const contarJogadores = (members) => members.filter((m) => m.role === 'PLAYER').length;

// Contagem de jogadores feita no banco, sem carregar a lista de membros
const contagemDeJogadores = { _count: { select: { members: { where: { role: 'PLAYER' } } } } };

const getMembership = (roomId, userId) =>
  prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });

// Bloqueia a linha da sala até o fim da transação: entradas e mudanças de limite
// simultâneas passam uma de cada vez, e o limite de jogadores não é ultrapassado.
const travarSala = (tx, roomId) =>
  tx.$queryRaw`SELECT max_players AS "maxPlayers" FROM rooms WHERE id = ${roomId} FOR UPDATE`;

// Garante que o usuário é membro e mestre da sala; responde o erro e devolve null se não for.
async function exigirMestre(req, res) {
  const membership = await getMembership(req.params.id, req.userId);
  if (!membership) {
    res.status(404).json({ error: 'Sala não encontrada' });
    return null;
  }
  if (membership.role !== 'MASTER') {
    res.status(403).json({ error: 'Apenas o mestre pode fazer isso' });
    return null;
  }
  return membership;
}

// Criar sala
router.post('/', async (req, res) => {
  const data = validar(roomSchema, req.body, res);
  if (!data) return;

  const room = await prisma.room.create({
    data: {
      ...data,
      inviteCode: gerarCodigo(),
      ownerId: req.userId,
      members: { create: { userId: req.userId, role: 'MASTER' } },
    },
  });

  res.status(201).json({ room: { ...resumo(room), role: 'MASTER' } });
});

// Listar as salas do usuário
router.get('/', async (req, res) => {
  const memberships = await prisma.roomMember.findMany({
    where: { userId: req.userId },
    orderBy: { joinedAt: 'desc' },
    include: {
      room: {
        include: {
          owner: { select: { name: true } },
          ...contagemDeJogadores,
        },
      },
    },
  });

  const rooms = memberships.map((m) => ({
    ...resumo(m.room),
    role: m.role,
    ownerName: m.room.owner.name,
    playerCount: m.room._count.members,
    createdAt: m.room.createdAt,
  }));

  res.json({ rooms });
});

// Prévia do convite (antes de entrar)
router.get('/join/:code', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { inviteCode: req.params.code },
    include: {
      owner: { select: { name: true } },
      ...contagemDeJogadores,
    },
  });
  if (!room) return res.status(404).json({ error: 'Convite inválido ou expirado' });

  const playerCount = room._count.members;
  const membership = await getMembership(room.id, req.userId);

  res.json({
    room: { ...resumo(room), ownerName: room.owner.name, playerCount },
    alreadyMember: Boolean(membership),
    full: playerCount >= room.maxPlayers,
  });
});

// Entrar na sala pelo convite
router.post('/join/:code', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { inviteCode: req.params.code },
    select: { id: true },
  });
  if (!room) return res.status(404).json({ error: 'Convite inválido ou expirado' });

  const resultado = await prisma.$transaction(async (tx) => {
    const [sala] = await travarSala(tx, room.id);
    if (!sala) return 'inexistente';

    const jaMembro = await tx.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.userId } },
    });
    if (jaMembro) return 'ja-membro';

    const jogadores = await tx.roomMember.count({ where: { roomId: room.id, role: 'PLAYER' } });
    if (jogadores >= sala.maxPlayers) return 'cheia';

    await tx.roomMember.create({ data: { roomId: room.id, userId: req.userId, role: 'PLAYER' } });
    return 'entrou';
  });

  if (resultado === 'inexistente') return res.status(404).json({ error: 'Convite inválido ou expirado' });
  if (resultado === 'cheia') return res.status(409).json({ error: 'A sala está cheia' });

  res.json({ roomId: room.id });
});

// Detalhes da sala (só membros)
router.get('/:id', async (req, res) => {
  const membership = await getMembership(req.params.id, req.userId);
  if (!membership) return res.status(404).json({ error: 'Sala não encontrada' });

  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        orderBy: { joinedAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  res.json({
    room: {
      ...resumo(room),
      createdAt: room.createdAt,
      role: membership.role,
      playerCount: contarJogadores(room.members),
      inviteCode: membership.role === 'MASTER' ? room.inviteCode : undefined,
      members: room.members.map((m) => ({ userId: m.user.id, name: m.user.name, role: m.role })),
    },
  });
});

// Editar sala (só mestre)
router.patch('/:id', async (req, res) => {
  if (!(await exigirMestre(req, res))) return;

  const data = validar(roomUpdateSchema, req.body, res);
  if (!data) return;

  // Sem mudar o limite de jogadores, não há corrida possível
  if (data.maxPlayers === undefined) {
    const room = await prisma.room.update({ where: { id: req.params.id }, data });
    return res.json({ room: resumo(room) });
  }

  // Mudando o limite: conta os jogadores e atualiza dentro de uma transação com a sala bloqueada
  const resultado = await prisma.$transaction(async (tx) => {
    await travarSala(tx, req.params.id);

    const jogadores = await tx.roomMember.count({
      where: { roomId: req.params.id, role: 'PLAYER' },
    });
    if (data.maxPlayers < jogadores) return { jogadores };

    return { room: await tx.room.update({ where: { id: req.params.id }, data }) };
  });

  if ('jogadores' in resultado) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: [
        {
          campo: 'maxPlayers',
          mensagem: `A sala já tem ${resultado.jogadores} jogador(es); o limite não pode ser menor que isso`,
        },
      ],
    });
  }

  res.json({ room: resumo(resultado.room) });
});

// Apagar sala (só mestre)
router.delete('/:id', async (req, res) => {
  if (!(await exigirMestre(req, res))) return;

  await prisma.room.delete({ where: { id: req.params.id } });

  // Esvazia o canal do chat da sala apagada
  req.app.get('io')?.in(canalSala(req.params.id)).socketsLeave(canalSala(req.params.id));

  res.status(204).end();
});

// Gerar novo código de convite (só mestre); o link antigo para de funcionar
router.post('/:id/invite/regenerate', async (req, res) => {
  if (!(await exigirMestre(req, res))) return;

  const room = await prisma.room.update({
    where: { id: req.params.id },
    data: { inviteCode: gerarCodigo() },
  });

  res.json({ inviteCode: room.inviteCode });
});

// Sair da sala (jogador)
router.post('/:id/leave', async (req, res) => {
  const membership = await getMembership(req.params.id, req.userId);
  if (!membership) return res.status(404).json({ error: 'Sala não encontrada' });
  if (membership.role === 'MASTER') {
    return res.status(400).json({ error: 'O mestre não pode sair da sala; apague a sala se quiser encerrá-la' });
  }

  // As fichas do jogador ficam sem dono e a saída é registrada de uma vez
  await prisma.$transaction([
    prisma.character.updateMany({
      where: { roomId: req.params.id, playerId: req.userId },
      data: { playerId: null },
    }),
    prisma.roomMember.delete({ where: { id: membership.id } }),
  ]);

  // Tira todas as conexões do jogador do canal do chat da sala
  req.app.get('io')?.in(canalUsuario(req.userId)).socketsLeave(canalSala(req.params.id));

  res.status(204).end();
});

module.exports = router;