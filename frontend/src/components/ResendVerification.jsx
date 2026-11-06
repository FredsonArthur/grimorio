import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ResendVerification({ email }) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setError('');
    setStatus('');
    try {
      await api('/auth/resend-verification', { method: 'POST', body: { email } });
      setStatus('Se houver uma conta aguardando confirmação, enviamos um novo e-mail. Veja também a caixa de spam.');
      setWait(60);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="form">
      {status && <p className="muted">{status}</p>}
      {error && <p className="error">{error}</p>}
      <button type="button" className="ghost" disabled={wait > 0} onClick={resend}>
        {wait > 0 ? `Reenviar e-mail (${wait}s)` : 'Reenviar e-mail de confirmação'}
      </button>
    </div>
  );
}