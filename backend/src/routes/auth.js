const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(50, 'Nome muito longo'),
  email: z.email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(72, 'Senha muito longa'),
});

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

function validar(schema, body, res) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  res.status(400).json({
    error: 'Dados inválidos',
    details: result.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
  return null;
}

function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/register', async (req, res) => {
  const data = validar(registerSchema, req.body, res);
  if (!data) return;

  const email = data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  setAuthCookie(res, user.id);
  res.status(201).json({ user });
});

router.post('/login', async (req, res) => {
  const data = validar(loginSchema, req.body, res);
  if (!data) return;

  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(data.password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  setAuthCookie(res, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
  res.json({ user });
});

module.exports = router;
