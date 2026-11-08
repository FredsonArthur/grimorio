const express = require('express');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');

// Montado em /rooms/:roomId/messages
const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// Histórico do chat: as últimas 100 mensagens, da mais antiga para a mais nova
router.get('/', async (req, res) => {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.roomId, userId: req.userId } },
  });
  if (!membership) return res.status(404).json({ error: 'Sala não encontrada' });

  const rows = await prisma.chatMessage.findMany({
    where: { roomId: req.params.roomId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  const messages = rows.reverse().map((m) => ({
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