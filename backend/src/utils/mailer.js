const nodemailer = require('nodemailer');

const isProd = process.env.NODE_ENV === 'production';
const brevoKey = process.env.BREVO_API_KEY;
const resendKey = process.env.RESEND_API_KEY;
const smtpConfigured = Boolean(process.env.SMTP_HOST);

if (isProd && !brevoKey && !resendKey && !smtpConfigured) {
  throw new Error('Defina BREVO_API_KEY, RESEND_API_KEY ou SMTP_HOST: em produção o envio de e-mail é obrigatório');
}

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

const from = process.env.MAIL_FROM || 'Grimório <no-reply@localhost>';

if (!brevoKey && !resendKey && !smtpConfigured) {
  console.warn('Aviso: e-mail não configurado. Os e-mails serão apenas exibidos neste terminal, não enviados.');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// Separa 'Grimório <endereco@exemplo.com>' em nome e e-mail (o Brevo pede os dois separados)
function separarRemetente(valor) {
  const m = valor.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (!m) return { email: valor.trim() };
  const name = m[1].trim();
  return name ? { name, email: m[2].trim() } : { email: m[2].trim() };
}

// Envio pela API HTTPS do Brevo (funciona em hospedagens que bloqueiam portas SMTP)
async function enviarPorBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: separarRemetente(from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '');
    throw new Error(`Brevo respondeu ${res.status}: ${detalhe}`);
  }
}

// Envio pela API HTTPS do Resend
async function enviarPorResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '');
    throw new Error(`Resend respondeu ${res.status}: ${detalhe}`);
  }
}

async function enviarEmail({ to, subject, html, text }) {
  if (brevoKey) return enviarPorBrevo({ to, subject, html, text });
  if (resendKey) return enviarPorResend({ to, subject, html, text });

  if (transporter) {
    await transporter.sendMail({ from, to, subject, html, text });
    return;
  }

  // Desenvolvimento sem provedor: mostra o e-mail no terminal
  console.log(`\n[e-mail simulado]\nPara: ${to}\nAssunto: ${subject}\n\n${text}\n`);
}

function emailConfirmacao({ name, link, horas }) {
  const nome = escapeHtml(name);
  const url = escapeHtml(link);

  const subject = 'Confirme seu e-mail no Grimório';

  const text = [
    `Olá, ${name}!`,
    '',
    'Para ativar sua conta no Grimório, confirme que este e-mail é seu abrindo o link abaixo:',
    link,
    '',
    `O link vale por ${horas} horas. Se a conta não for confirmada nesse prazo, ela será excluída automaticamente.`,
    '',
    'Se você não criou uma conta no Grimório, ignore este e-mail.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#14101f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#14101f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#1f1830;border:1px solid #3a2f57;border-radius:12px;">
            <tr>
              <td style="padding:32px;font-family:Georgia,'Times New Roman',serif;color:#ece6f7;">
                <div style="font-size:26px;color:#c9a24b;margin-bottom:24px;">Grimório</div>
                <h1 style="font-size:20px;font-weight:normal;margin:0 0 16px;">Olá, ${nome}! Confirme seu e-mail</h1>
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#cfc6e3;margin:0 0 24px;">
                  Para ativar sua conta no Grimório, confirme que este endereço de e-mail é seu.
                </p>
                <a href="${url}" style="display:inline-block;background:#c9a24b;color:#1a1408;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:8px;">
                  Confirmar e-mail
                </a>
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#9a8fb5;margin:24px 0 0;">
                  Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                  <a href="${url}" style="color:#c9a24b;word-break:break-all;">${url}</a>
                </p>
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#9a8fb5;margin:16px 0 0;">
                  O link vale por ${horas} horas. Se a conta não for confirmada nesse prazo, ela será excluída automaticamente.
                </p>
                <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#9a8fb5;margin:16px 0 0;">
                  Se você não criou uma conta no Grimório, ignore este e-mail.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

module.exports = { enviarEmail, emailConfirmacao };