import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import CharacterForm from '../components/CharacterForm';

export default function NewCharacter() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const type = params.get('tipo') === 'npc' ? 'NPC' : 'PLAYER';

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    api(`/rooms/${id}`)
      .then((data) => setRoom(data.room))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <main className="content">
        <p className="error">{error}</p>
        <Link to="/">Voltar para minhas salas</Link>
      </main>
    );
  }
  if (!room) return <p className="center">Carregando...</p>;

  if (room.role !== 'MASTER') {
    return (
      <main className="content">
        <p className="error">Apenas o mestre pode criar fichas.</p>
        <Link to={`/salas/${id}`}>Voltar para a sala</Link>
      </main>
    );
  }

  const players = room.members.filter((m) => m.role === 'PLAYER');

  async function create({ name, imageUrl, data }) {
    const body = { type, name, imageUrl, data };
    if (type === 'PLAYER' && playerId) body.playerId = playerId;
    if (type === 'NPC') body.visibleToPlayers = revealed;

    const { character } = await api(`/rooms/${id}/characters`, { method: 'POST', body });
    navigate(`/salas/${id}/fichas/${character.id}`);
  }

  return (
    <div className="home">
      <header className="topbar">
        <Link to={`/salas/${id}`}>← {room.name}</Link>
        <strong>Grimório</strong>
      </header>

      <main className="content">
        <h2>{type === 'PLAYER' ? 'Nova ficha de jogador' : 'Nova ficha de NPC'}</h2>
        <p className="muted">
          {type === 'PLAYER' ? 'Ficha de personagem, para um jogador da sala.' : 'Ficha de criatura, no formato de monstro.'}{' '}
          <Link to={`/salas/${id}/fichas/nova?tipo=${type === 'PLAYER' ? 'npc' : 'jogador'}`}>
            {type === 'PLAYER' ? 'Criar um NPC' : 'Criar uma ficha de jogador'}
          </Link>
        </p>

        <section className="card">
          {type === 'PLAYER' ? (
            <label>
              Jogador responsável
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">Atribuir depois</option>
                {players.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.name}</option>
                ))}
              </select>
              <span className="hint">O jogador poderá ver e editar esta ficha.</span>
            </label>
          ) : (
            <label className="check">
              <input type="checkbox" checked={revealed} onChange={(e) => setRevealed(e.target.checked)} />
              Revelar este NPC aos jogadores (as anotações secretas nunca são reveladas)
            </label>
          )}
        </section>

        <section className="card">
          <CharacterForm
            key={type}
            type={type}
            submitLabel="Criar ficha"
            onSubmit={create}
            onCancel={() => navigate(`/salas/${id}`)}
          />
        </section>
      </main>
    </div>
  );
}