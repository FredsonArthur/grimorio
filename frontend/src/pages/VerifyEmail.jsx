import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'invalid');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // O ref evita enviar duas vezes (o modo de desenvolvimento do React roda o efeito em dobro)
    if (!token || started.current) return;
    started.current = true;

    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setStatus('ok'))
      .catch((err) => {
        setMessage(err.message);
        setStatus('error');
      });
  }, [token]);

  return (
    <main className="auth-page">
      <div className="card">
        <h1>Grimório</h1>

        {status === 'loading' && <p className="muted">Confirmando seu e-mail...</p>}

        {status === 'ok' && (
          <>
            <h2>E-mail confirmado!</h2>
            <p className="muted">Sua conta está ativa. Agora é só entrar.</p>
            <Link to="/login" className="btn">Entrar</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="error">{message}</p>
            <p className="muted">Se você já confirmou o e-mail antes, é só entrar com a sua conta.</p>
            <Link to="/login" className="btn">Ir para o login</Link>
            <p className="alt">
              <Link to="/cadastro">Criar uma nova conta</Link>
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <p className="error">O link de confirmação está incompleto.</p>
            <p className="muted">Abra o link direto do e-mail que enviamos, sem cortar nenhuma parte dele.</p>
            <Link to="/login" className="btn">Ir para o login</Link>
          </>
        )}
      </div>
    </main>
  );
}