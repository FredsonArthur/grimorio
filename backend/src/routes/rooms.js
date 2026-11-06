const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const validar = require('../utils/validar');

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

const getMembership = (roomId, userId) =>
  prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });

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
          members: { select: { role: true } },
        },
      },
    },
  });

  const rooms = memberships.map((m) => ({
    ...resumo(m.room),
    role: m.role,
    ownerName: m.room.owner.name,
    playerCount: contarJogadores(m.room.members),
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
      members: { select: { role: true } },
    },
  });
  if (!room) return res.status(404).json({ error: 'Convite inválido ou expirado' });

  const playerCount = contarJogadores(room.members);
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
    include: { members: { select: { userId: true, role: true } } },
  });
  if (!room) return res.status(404).json({ error: 'Convite inválido ou expirado' });

  if (room.members.some((m) => m.userId === req.userId)) {
    return res.json({ roomId: room.id });
  }
  if (contarJogadores(room.members) >= room.maxPlayers) {
    return res.status(409).json({ error: 'A sala está cheia' });
  }

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId: req.userId } },
    update: {},
    create: { roomId: room.id, userId: req.userId, role: 'PLAYER' },
  });

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

  if (data.maxPlayers !== undefined) {
    const jogadores = await prisma.roomMember.count({
      where: { roomId: req.params.id, role: 'PLAYER' },
    });
    if (data.maxPlayers < jogadores) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: [
          {
            campo: 'maxPlayers',
            mensagem: `A sala já tem ${jogadores} jogador(es); o limite não pode ser menor que isso`,
          },
        ],
      });
    }
  }

  const room = await prisma.room.update({ where: { id: req.params.id }, data });
  res.json({ room: resumo(room) });
});

// Apagar sala (só mestre)
router.delete('/:id', async (req, res) => {
  if (!(await exigirMestre(req, res))) return;

  await prisma.room.delete({ where: { id: req.params.id } });
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

  await prisma.roomMember.delete({ where: { id: membership.id } });
  res.status(204).end();
});

module.exports = router;