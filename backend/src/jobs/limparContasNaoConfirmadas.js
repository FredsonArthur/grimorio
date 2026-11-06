const prisma = require('../prisma');

const TTL_HORAS = Number(process.env.UNVERIFIED_ACCOUNT_TTL_HOURS || 24);
const INTERVALO_MS = Number(process.env.CLEANUP_INTERVAL_MINUTES || 15) * 60 * 1000;

async function limpar() {
  try {
    const limite = new Date(Date.now() - TTL_HORAS * 60 * 60 * 1000);
    // Exclusão definitiva (sem soft delete); salas e vínculos saem junto pelo cascade do banco
    const { count } = await prisma.user.deleteMany({
      where: { emailVerifiedAt: null, createdAt: { lt: limite } },
    });
    if (count > 0) console.log(`Contas não confirmadas excluídas: ${count}`);
  } catch (err) {
    console.error('Falha ao limpar contas não confirmadas:', err);
  }
}

function iniciarLimpezaDeContas() {
  limpar();
  setInterval(limpar, INTERVALO_MS).unref();
}

module.exports = { iniciarLimpezaDeContas };