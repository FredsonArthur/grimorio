require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
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

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth/register', limiteAuth);
app.use('/auth/login', limiteAuth);
app.use('/auth/resend-verification', limiteAuth);
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Grimório API rodando em http://localhost:${port}`);
  iniciarLimpezaDeContas();
});