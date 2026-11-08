const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('./prisma');

// O login fica em um cookie httpOnly, então o servidor lê o cookie do handshake
function lerCookie(header, nome) {
  if (!header) return null;
  for (const parte of header.split(';')) {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(resto.join('='));
  }
  return null;
}

const mensagemSchema = z.object({
  roomId: z.string().min(1).max(100),
  content: z
    .string()
    .trim()
    .min(1, 'Escreva uma mensagem')
    .max(1000, 'Mensagem muito longa (máximo de 1000 caracteres)'),
});

const canal = (roomId) => `room:${roomId}`;

const getMembership = (roomId, userId) =>
  prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });

function iniciarTempoReal(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
  });

  // Só entra quem está logado
  io.use(async (socket, next) => {
    try {
      const token = lerCookie(socket.handshake.headers.cookie, 'token');
      if (!token) return next(new Error('Não autenticado'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true },
      });
      if (!user) return next(new Error('Não autenticado'));

      socket.data.userId = user.id;
      socket.data.name = user.name;
      next();
    } catch {
      next(new Error('Não autenticado'));
    }
  });

  io.on('connection', (socket) => {
    // Entrar no canal da sala (só membros)
    socket.on('room:join', async (roomId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        if (typeof roomId !== 'string') return reply({ ok: false, error: 'Sala inválida' });

        const membership = await getMembership(roomId, socket.data.userId);
        if (!membership) return reply({ ok: false, error: 'Sala não encontrada' });

        socket.join(canal(roomId));
        reply({ ok: true });
      } catch (err) {
        console.error('Erro ao entrar na sala:', err);
        reply({ ok: false, error: 'Não foi possível entrar na sala' });
      }
    });

    // Enviar mensagem de chat
    socket.on('chat:send', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const parsed = mensagemSchema.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, error: parsed.error.issues[0].message });

        const { roomId, content } = parsed.data;

        // Confere a cada envio, para quem saiu da sala não conseguir mais escrever
        const membership = await getMembership(roomId, socket.data.userId);
        if (!membership) return reply({ ok: false, error: 'Você não faz parte desta sala' });

        // Limite simples: 5 mensagens a cada 5 segundos por conexão
        const agora = Date.now();
        socket.data.envios = (socket.data.envios || []).filter((t) => agora - t < 5000);
        if (socket.data.envios.length >= 5) {
          return reply({ ok: false, error: 'Calma! Você está enviando mensagens rápido demais.' });
        }
        socket.data.envios.push(agora);

        const message = await prisma.chatMessage.create({
          data: { roomId, userId: socket.data.userId, content },
        });

        io.to(canal(roomId)).emit('chat:message', {
          id: message.id,
          roomId,
          userId: socket.data.userId,
          userName: socket.data.name,
          content: message.content,
          createdAt: message.createdAt,
        });

        reply({ ok: true });
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        reply({ ok: false, error: 'Não foi possível enviar a mensagem' });
      }
    });
  });

  return io;
}

module.exports = { iniciarTempoReal };