require('dotenv').config();
const nodemailer = require('nodemailer');
const { enviarEmail, emailConfirmacao } = require('../utils/mailer');

async function main() {
  const destino = process.argv[2];

  if (!destino) {
    console.error('Uso: node src/scripts/testar-email.js destino@exemplo.com');
    process.exit(1);
  }

  const usandoResend = Boolean(process.env.RESEND_API_KEY);

  if (!usandoResend && !process.env.SMTP_HOST) {
    console.error('Defina RESEND_API_KEY ou SMTP_HOST no .env: nada seria enviado de verdade.');
    process.exit(1);
  }

  if (usandoResend) {
    console.log('Usando a API do Resend.');
  } else {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });

    // Confere conexão e login antes de tentar enviar
    await transporter.verify();
    console.log('Conexão e login no servidor SMTP: OK');
  }

  const link = `${process.env.FRONTEND_URL}/verificar-email?token=exemplo-de-teste`;
  await enviarEmail({
    to: destino,
    ...emailConfirmacao({ name: 'Teste', link, horas: 24 }),
  });
  console.log(`E-mail de teste enviado para ${destino}. Confira a caixa de entrada e o spam.`);
}

main().catch((err) => {
  console.error('Falha:', err.message);
  process.exit(1);
});