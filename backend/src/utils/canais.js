// Nomes dos canais do Socket.IO, usados pelo servidor de tempo real e pelas rotas
const canalSala = (roomId) => `room:${roomId}`;
const canalUsuario = (userId) => `user:${userId}`;

module.exports = { canalSala, canalUsuario };