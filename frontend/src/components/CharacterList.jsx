import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function CharacterList({ roomId, isMaster }) {
  const [characters, setCharacters] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/rooms/${roomId}/characters`)
      .then((data) => setCharacters(data.characters))
      .catch((err) => setError(err.message));
  }, [roomId]);

  const players = (characters ?? []).filter((c) => c.type === 'PLAYER');
  const npcs = (characters ?? []).filter((c) => c.type === 'NPC');

  return (
    <section className="card">
      <div className="row">
        <h3>Fichas</h3>
        {isMaster && (
          <div className="actions">
            <Link className="btn" to={`/salas/${roomId}/fichas/nova?tipo=jogador`}>Nova ficha de jogador</Link>
            <Link className="btn ghost" to={`/salas/${roomId}/fichas/nova?tipo=npc`}>Nova ficha de NPC</Link>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {!characters && !error && <p className="muted">Carregando...</p>}
      {characters && characters.length === 0 && (
        <p className="muted">
          {isMaster ? 'Nenhuma ficha ainda. Crie a primeira acima.' : 'Nenhuma ficha disponível para você ainda.'}
        </p>
      )}

      {players.length > 0 && (
        <>
          <h4 className="group-title">Personagens</h4>
          <div className="sheet-list">
            {players.map((c) => (
              <Link key={c.id} to={`/salas/${roomId}/fichas/${c.id}`} className="sheet-item">
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {[c.data.race, c.data.class, `nível ${c.data.level}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="badge">{c.playerName ?? 'Sem jogador'}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {npcs.length > 0 && (
        <>
          <h4 className="group-title">NPCs</h4>
          <div className="sheet-list">
            {npcs.map((c) => (
              <Link key={c.id} to={`/salas/${roomId}/fichas/${c.id}`} className="sheet-item">
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {[c.data.creatureType || 'Criatura', `ND ${c.data.challenge}`].join(' · ')}
                  </div>
                </div>
                {isMaster && (
                  <span className={`badge ${c.visibleToPlayers ? 'master' : ''}`}>
                    {c.visibleToPlayers ? 'Revelado' : 'Oculto'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}