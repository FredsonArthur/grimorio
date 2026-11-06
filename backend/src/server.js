require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido no .env');
}

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Grimório API rodando em http://localhost:${port}`));
