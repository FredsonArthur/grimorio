import { useState } from 'react';
import { api } from '../api';
import CharacterForm from './CharacterForm';

export default function NewCharacterPanel({ roomId, room, type, onSwitchType, onCreated, onCancel }) {
  const [playerId, setPlayerId] = useState('');
  const [revealed, setRevealed] = useState(false);

  const players = room.members.filter((m) => m.role === 'PLAYER');

  async function create({ name, imageUrl, data }) {
    const body = { type, name, imageUrl, data };
    if (type === 'PLAYER' && playerId) body.playerId = playerId;
    if (type === 'NPC') body.visibleToPlayers = revealed;

    const { character } = await api(`/rooms/${roomId}/characters`, { method: 'POST', body });
    onCreated(character);
  }

  return (
    <>
      <p className="muted">
        {type === 'PLAYER' ? 'Ficha de personagem, para um jogador da sala.' : 'Ficha de criatura, no formato de monstro.'}{' '}
        <button type="button" className="link" onClick={() => onSwitchType(type === 'PLAYER' ? 'NPC' : 'PLAYER')}>
          {type === 'PLAYER' ? 'Criar um NPC' : 'Criar uma ficha de jogador'}
        </button>
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
        <CharacterForm key={type} type={type} submitLabel="Criar ficha" onSubmit={create} onCancel={onCancel} />
      </section>
    </>
  );
}