import { useEffect, useState } from 'react';
import { api } from '../api';

export default function SheetsPanel({ roomId, isMaster, refreshKey, onOpen, onNew }) {
  const [characters, setCharacters] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/rooms/${roomId}/characters`)
      .then((data) => setCharacters(data.characters))
      .catch((err) => setError(err.message));
  }, [roomId, refreshKey]);

  const players = (characters ?? []).filter((c) => c.type === 'PLAYER');
  const npcs = (characters ?? []).filter((c) => c.type === 'NPC');

  return (
    <div className="sheets-panel">
      {isMaster && (
        <div className="actions stack">
          <button onClick={() => onNew('PLAYER')}>Nova ficha de jogador</button>
          <button className="ghost" onClick={() => onNew('NPC')}>Nova ficha de NPC</button>
        </div>
      )}

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
              <button key={c.id} type="button" className="sheet-item" onClick={() => onOpen(c.id)}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted">
                    {[c.data.race, c.data.class, `nível ${c.data.level}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="badge">{c.playerName ?? 'Sem jogador'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {npcs.length > 0 && (
        <>
          <h4 className="group-title">NPCs</h4>
          <div className="sheet-list">
            {npcs.map((c) => (
              <button key={c.id} type="button" className="sheet-item" onClick={() => onOpen(c.id)}>
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
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}