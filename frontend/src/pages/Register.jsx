import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import ResendVerification from '../components/ResendVerification';

export default function Register() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(false);
    setSubmitting(true);
    try {
      const data = await register(name, email, password);
      setSent(data);
    } catch (err) {
      setError(err.details?.[0]?.mensagem || err.message);
      setPending(err.code === 'EMAIL_PENDING');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <main className="auth-page">
        <div className="card">
          <h1>Grimório</h1>
          <h2>Confirme seu e-mail</h2>
          <p className="muted">
            Enviamos um link de confirmação para <strong>{sent.email}</strong>. Abra o e-mail e clique em
            "Confirmar e-mail" em até {sent.expiresInHours} horas. Depois desse prazo, a conta é excluída
            automaticamente.
          </p>
          <ResendVerification email={sent.email} />
          <p className="alt">
            <Link to="/login">Voltar para o login</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Grimório</h1>
        <p className="subtitle">Crie sua conta</p>
        {error && <p className="error">{error}</p>}
        {pending && <ResendVerification email={email} />}
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha (mínimo 8 caracteres)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button disabled={submitting}>{submitting ? 'Criando...' : 'Criar conta'}</button>
        <p className="alt">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </main>
  );
}