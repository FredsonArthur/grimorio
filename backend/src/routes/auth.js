const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const validar = require('../utils/validar');
const { enviarEmail, emailConfirmacao } = require('../utils/mailer');

const router = express.Router();

const TTL_HORAS = Number(process.env.UNVERIFIED_ACCOUNT_TTL_HOURS || 24);
const REENVIO_INTERVALO_MS = 60 * 1000;

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(50, 'Nome muito longo'),
  email: z.email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres').max(72, 'Senha muito longa'),
});

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

const emailSchema = z.object({
  email: z.email('E-mail inválido'),
});

const verifySchema = z.object({
  token: z.string().min(10, 'Link inválido').max(200, 'Link inválido'),
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// A conta não confirmada vive TTL_HORAS desde o cadastro; o reenvio não estende o prazo
const contaExpirada = (user) => Date.now() - user.createdAt.getTime() > TTL_HORAS * 60 * 60 * 1000;

function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function enviarConfirmacao(user) {
  const token = crypto.randomBytes(32).toString('base64url');

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationTokenHash: hashToken(token), verificationSentAt: new Date() },
  });

  const link = `${process.env.FRONTEND_URL}/verificar-email?token=${token}`;
  await enviarEmail({
    to: user.email,
    ...emailConfirmacao({ name: user.name, link, horas: TTL_HORAS }),
  });
}

router.post('/register', async (req, res) => {
  const data = validar(registerSchema, req.body, res);
  if (!data) return;

  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.emailVerifiedAt) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    if (!contaExpirada(existing)) {
      return res.status(409).json({
        error: 'Este e-mail já foi cadastrado e aguarda confirmação. Peça um novo e-mail de confirmação abaixo.',
        code: 'EMAIL_PENDING',
      });
    }
    // Conta antiga não confirmada: exclui de vez e deixa o cadastro seguir
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email, passwordHash },
  });

  try {
    await enviarConfirmacao(user);
  } catch (err) {
    console.error('Falha ao enviar o e-mail de confirmação:', err);
    await prisma.user.delete({ where: { id: user.id } });
    return res.status(502).json({
      error: 'Não foi possível enviar o e-mail de confirmação. Tente novamente em instantes.',
    });
  }

  res.status(201).json({ email: user.email, expiresInHours: TTL_HORAS });
});

router.post('/verify-email', async (req, res) => {
  const data = validar(verifySchema, req.body, res);
  if (!data) return;

  const user = await prisma.user.findUnique({
    where: { verificationTokenHash: hashToken(data.token) },
  });
  if (!user) {
    return res.status(400).json({ error: 'Link inválido ou já utilizado', code: 'INVALID_TOKEN' });
  }

  if (contaExpirada(user)) {
    await prisma.user.delete({ where: { id: user.id } });
    return res.status(410).json({
      error: 'O prazo de confirmação expirou e a conta foi excluída. Faça o cadastro novamente.',
      code: 'EXPIRED',
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), verificationTokenHash: null },
  });

  res.json({ message: 'E-mail confirmado' });
});

router.post('/resend-verification', async (req, res) => {
  const data = validar(emailSchema, req.body, res);
  if (!data) return;

  // Resposta igual para qualquer caso, para não revelar quais e-mails existem
  const resposta = {
    message: 'Se existir uma conta aguardando confirmação para este e-mail, enviamos um novo link.',
  };

  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || user.emailVerifiedAt) return res.json(resposta);

  if (contaExpirada(user)) {
    await prisma.user.delete({ where: { id: user.id } });
    return res.json(resposta);
  }

  const enviadoHa = user.verificationSentAt ? Date.now() - user.verificationSentAt.getTime() : Infinity;
  if (enviadoHa < REENVIO_INTERVALO_MS) return res.json(resposta);

  try {
    await enviarConfirmacao(user);
  } catch (err) {
    console.error('Falha ao reenviar o e-mail de confirmação:', err);
    return res.status(502).json({ error: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' });
  }

  res.json(resposta);
});

router.post('/login', async (req, res) => {
  const data = validar(loginSchema, req.body, res);
  if (!data) return;

  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(data.password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  if (!user.emailVerifiedAt) {
    return res.status(403).json({
      error: 'Confirme seu e-mail para entrar. Enviamos um link de confirmação para a sua caixa de entrada.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

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