const express = require('express');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');

// Montado em /rooms/:roomId/messages
const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const incluirAutor = { user: { select: { name: true } } };

// Histórico do chat.
// Sem parâmetros: as últimas 100 mensagens, da mais antiga para a mais nova.
// Com ?after=<id da última mensagem que o cliente já tem>: as mensagens mais novas que ela
// (até 200), usado para recuperar o que foi perdido durante uma desconexão.
router.get('/', async (req, res) => {
  const { roomId } = req.params;

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: req.userId } },
  });
  if (!membership) return res.status(404).json({ error: 'Sala não encontrada' });

  const after = typeof req.query.after === 'string' ? req.query.after : null;
  const ancora = after
    ? await prisma.chatMessage.findFirst({
        where: { id: after, roomId },
        select: { id: true, createdAt: true },
      })
    : null;

  let rows;
  if (ancora) {
    // gte + NOT garante que mensagens no mesmo instante da âncora não se percam;
    // o cliente descarta repetidas pelo id
    rows = await prisma.chatMessage.findMany({
      where: { roomId, createdAt: { gte: ancora.createdAt }, NOT: { id: ancora.id } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
      include: incluirAutor,
    });
  } else {
    rows = (
      await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
        include: incluirAutor,
      })
    ).reverse();
  }

  const messages = rows.map((m) => ({
    id: m.id,
    roomId: m.roomId,
    userId: m.userId,
    userName: m.user?.name ?? 'Ex-membro',
    content: m.content,
    createdAt: m.createdAt,
  }));

  res.json({ messages });
});

module.exports = router;