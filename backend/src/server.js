require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const characterRoutes = require('./routes/characters');
const messageRoutes = require('./routes/messages');
const { iniciarTempoReal } = require('./realtime');
const { iniciarLimpezaDeContas } = require('./jobs/limparContasNaoConfirmadas');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL não definido no .env');
}

const app = express();

// Atrás de um proxy (Render, Railway etc.), o IP real vem do cabeçalho do proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Limites de tentativas, cada rota com o seu contador
const baseLimite = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
};
const chaveIp = (req) => ipKeyGenerator(req.ip ?? '');
const chaveIpEmail = (req) =>
  `${chaveIp(req)}|${String(req.body?.email ?? '').trim().toLowerCase().slice(0, 254)}`;

// Cada cadastro dispara um e-mail
const limiteCadastro = rateLimit({ ...baseLimite, windowMs: 60 * 60 * 1000, limit: 20, keyGenerator: chaveIp });

// Login: só as tentativas que falham contam, por conta (IP + e-mail) e pelo IP como um todo
const limiteLoginConta = rateLimit({
  ...baseLimite,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: chaveIpEmail,
});
const limiteLoginIp = rateLimit({
  ...baseLimite,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  keyGenerator: chaveIp,
});

// Reenvio do e-mail de confirmação
const limiteReenvio = rateLimit({ ...baseLimite, windowMs: 15 * 60 * 1000, limit: 5, keyGenerator: chaveIpEmail });

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth/register', limiteCadastro);
app.use('/auth/login', limiteLoginIp, limiteLoginConta);
app.use('/auth/resend-verification', limiteReenvio);
app.use('/auth', authRoutes);
app.use('/rooms/:roomId/characters', characterRoutes);
app.use('/rooms/:roomId/messages', messageRoutes);
app.use('/rooms', roomRoutes);

// Rotas da API que não existem respondem 404 em JSON (e não a página inicial do site)
app.use(['/auth', '/rooms'], (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Em produção o backend também serve o frontend compilado (mesma origem, sem CORS)
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// O Socket.IO precisa do servidor HTTP por baixo do Express
const server = http.createServer(app);
const io = iniciarTempoReal(server);
app.set('io', io); // as rotas usam para mexer nos canais (sair da sala, logout)

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Grimório API rodando em http://localhost:${port}`);
  iniciarLimpezaDeContas();
});