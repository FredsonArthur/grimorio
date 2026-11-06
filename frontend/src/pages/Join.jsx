import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { SYSTEMS, CAMPAIGN_TYPES } from '../roomOptions';

export default function Join() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Guarda o convite para voltar depois do login ou cadastro
      sessionStorage.setItem('pendingInvite', code);
      return;
    }

    sessionStorage.removeItem('pendingInvite');
    api(`/rooms/join/${code}`)
      .then(setPreview)
      .catch((err) => setError(err.message));
  }, [loading, user, code]);

  async function join() {
    setJoining(true);
    try {
      const { roomId } = await api(`/rooms/join/${code}`, { method: 'POST' });
      navigate(`/salas/${roomId}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setJoining(false);
    }
  }

  if (loading) return <p className="center">Carregando...</p>;

  return (
    <main className="auth-page">
      <div className="card">
        <h1>Grimório</h1>

        {!user && (
          <>
            <p className="subtitle">Você foi convidado para uma sala! Entre ou crie uma conta para aceitar o convite.</p>
            <Link to="/login" className="btn">Entrar</Link>
            <p className="alt">
              Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
            </p>
          </>
        )}

        {user && error && (
          <>
            <p className="error">{error}</p>
            <Link to="/">Ir para minhas salas</Link>
          </>
        )}

        {user && !error && !preview && <p className="muted">Carregando convite...</p>}

        {user && preview && (
          <>
            {preview.room.coverUrl && (
              <img
                key={preview.room.coverUrl}
                className="cover"
                src={preview.room.coverUrl}
                alt=""
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <p className="subtitle">Você foi convidado para a sala</p>
            <h2>{preview.room.name}</h2>
            {preview.room.description && <p className="muted">{preview.room.description}</p>}
            <small className="muted">
              {SYSTEMS[preview.room.system] ?? preview.room.system} ·{' '}
              {CAMPAIGN_TYPES[preview.room.campaignType] ?? preview.room.campaignType} · nível inicial{' '}
              {preview.room.startingLevel}
            </small>
            <small className="muted">
              Mestre: {preview.room.ownerName} · {preview.room.playerCount}/{preview.room.maxPlayers} jogadores
            </small>
            {preview.room.schedule && <small className="muted">Quando jogam: {preview.room.schedule}</small>}

            {preview.alreadyMember ? (
              <button onClick={() => navigate(`/salas/${preview.room.id}`)}>Você já está na sala. Abrir</button>
            ) : preview.full ? (
              <p className="error">Esta sala está cheia. Peça ao mestre para abrir uma vaga.</p>
            ) : (
              <button disabled={joining} onClick={join}>
                {joining ? 'Entrando...' : 'Entrar na sala'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}