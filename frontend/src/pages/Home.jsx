import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { SYSTEMS, CAMPAIGN_TYPES } from '../roomOptions';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Se a pessoa chegou por um link de convite sem estar logada, volta para ele
    const pending = sessionStorage.getItem('pendingInvite');
    if (pending) {
      navigate(`/entrar/${pending}`, { replace: true });
      return;
    }

    api('/rooms')
      .then((data) => setRooms(data.rooms))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="home">
      <header className="topbar">
        <strong>Grimório</strong>
        <div>
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="content">
        <div className="row">
          <h2>Minhas salas</h2>
          <Link to="/salas/nova" className="btn">Nova sala</Link>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Carregando...</p>}
        {!loading && rooms.length === 0 && (
          <p className="muted">
            Você ainda não participa de nenhuma sala. Crie uma ou peça o link de convite ao seu mestre.
          </p>
        )}

        <div className="room-list">
          {rooms.map((room) => (
            <Link key={room.id} to={`/salas/${room.id}`} className="card room-card">
              {room.coverUrl && (
                <img
                  key={room.coverUrl}
                  className="cover"
                  src={room.coverUrl}
                  alt=""
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="row">
                <h3>{room.name}</h3>
                <span className={`badge ${room.role === 'MASTER' ? 'master' : ''}`}>
                  {room.role === 'MASTER' ? 'Mestre' : 'Jogador'}
                </span>
              </div>
              {room.description && <p className="muted">{room.description}</p>}
              <small className="muted">
                {SYSTEMS[room.system] ?? room.system} · {CAMPAIGN_TYPES[room.campaignType] ?? room.campaignType} ·{' '}
                {room.playerCount}/{room.maxPlayers} jogadores
              </small>
              <small className="muted">Mestre: {room.ownerName}</small>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}