import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import CharacterForm from './CharacterForm';
import { ABILITIES, SKILLS, SIZES, modifier, proficiencyBonus, signed } from '../dnd';

function Abilities({ abilities }) {
  return (
    <div className="abilities">
      {ABILITIES.map(({ key, short }) => (
        <div className="ability" key={key}>
          <span className="muted">{short}</span>
          <strong>{signed(modifier(abilities[key]))}</strong>
          <small className="muted">{abilities[key]}</small>
        </div>
      ))}
    </div>
  );
}

function TextBlock({ title, text }) {
  if (!text) return null;
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="prewrap">{text}</p>
    </section>
  );
}

function Stat({ label, children, note }) {
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <strong>{children}</strong>
      {note && <small className="muted">{note}</small>}
    </div>
  );
}

function PlayerView({ data }) {
  const prof = proficiencyBonus(data.level);
  const mod = (key) => modifier(data.abilities[key]);
  const saveBonus = (key) => mod(key) + (data.savingThrows.includes(key) ? prof : 0);
  const skillBonus = (skill) => mod(skill.ability) + (data.skills.includes(skill.key) ? prof : 0);
  const perception = SKILLS.find((s) => s.key === 'perception');

  const identity = [
    data.race,
    data.class && (data.subclass ? `${data.class} (${data.subclass})` : data.class),
    `nível ${data.level}`,
    data.background,
    data.alignment,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <p className="muted">{identity}</p>

      <div className="stat-boxes">
        <Stat label="CA">{data.ac}</Stat>
        <Stat label="Iniciativa">{signed(mod('dex'))}</Stat>
        <Stat label="Deslocamento">{data.speed || '-'}</Stat>
        <Stat label="Proficiência">{signed(prof)}</Stat>
        <Stat label="Percepção passiva">{10 + skillBonus(perception)}</Stat>
        <Stat label="Vida" note={data.hp.temp > 0 ? `+${data.hp.temp} temporária` : undefined}>
          {data.hp.current}/{data.hp.max}
        </Stat>
      </div>

      <Abilities abilities={data.abilities} />

      <div className="two-col">
        <section className="card">
          <h3>Salvaguardas</h3>
          <ul className="proficiencies">
            {ABILITIES.map(({ key, label }) => (
              <li key={key}>
                <span>{data.savingThrows.includes(key) ? '●' : '○'} {label}</span>
                <strong>{signed(saveBonus(key))}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h3>Perícias</h3>
          <ul className="proficiencies">
            {SKILLS.map((skill) => (
              <li key={skill.key}>
                <span>{data.skills.includes(skill.key) ? '●' : '○'} {skill.label}</span>
                <strong>{signed(skillBonus(skill))}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {data.attacks.length > 0 && (
        <section className="card">
          <h3>Ataques</h3>
          <ul className="proficiencies">
            {data.attacks.map((attack, i) => (
              <li key={i}>
                <span>{attack.name}</span>
                <span className="muted">
                  {[attack.bonus && `${attack.bonus} para acertar`, attack.damage].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TextBlock title="Equipamento e tesouros" text={data.equipment} />
      <TextBlock title="Magias" text={data.spells} />
      <TextBlock title="Características e habilidades" text={data.features} />
      <TextBlock title="Anotações" text={data.notes} />
    </>
  );
}

function NpcView({ data }) {
  const subtitle = [SIZES[data.size], data.creatureType].filter(Boolean).join(' ') || 'Criatura';

  return (
    <>
      <p className="muted">{subtitle} · ND {data.challenge}</p>

      <div className="stat-boxes">
        <Stat label="CA">{data.ac}</Stat>
        <Stat label="Vida">{data.hp.current}/{data.hp.max}</Stat>
        <Stat label="Deslocamento">{data.speed || '-'}</Stat>
        <Stat label="Iniciativa">{signed(modifier(data.abilities.dex))}</Stat>
      </div>

      <Abilities abilities={data.abilities} />

      {(data.senses || data.languages) && (
        <section className="card">
          {data.senses && <p><span className="muted">Sentidos:</span> {data.senses}</p>}
          {data.languages && <p><span className="muted">Idiomas:</span> {data.languages}</p>}
        </section>
      )}

      <TextBlock title="Traços" text={data.traits} />
      <TextBlock title="Ações" text={data.actions} />
      {/* Só o mestre recebe este campo do servidor */}
      <TextBlock title="Anotações secretas do mestre" text={data.notes} />
    </>
  );
}

export default function CharacterSheet({ roomId, room, characterId, onChanged, onClose }) {
  const { user } = useAuth();
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api(`/rooms/${roomId}/characters/${characterId}`)
      .then((data) => setCharacter(data.character))
      .catch((err) => setError(err.message));
  }, [roomId, characterId]);

  if (error) return <p className="error">{error}</p>;
  if (!character) return <p className="muted">Carregando...</p>;

  const isMaster = room.role === 'MASTER';
  const isOwner = character.type === 'PLAYER' && character.playerId === user.id;
  const canEdit = isMaster || isOwner;
  const players = room.members.filter((m) => m.role === 'PLAYER');
  const url = `/rooms/${roomId}/characters/${characterId}`;

  async function run(action) {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function update(body) {
    const { character: updated } = await api(url, { method: 'PATCH', body });
    setCharacter(updated);
    onChanged();
    return updated;
  }

  async function save({ name, imageUrl, data }) {
    await update({ name, imageUrl, data });
    setEditing(false);
  }

  const changeOwner = (e) => update({ playerId: e.target.value || null });
  const toggleReveal = () => update({ visibleToPlayers: !character.visibleToPlayers });

  async function remove() {
    if (!window.confirm(`Apagar a ficha "${character.name}"? Essa ação não pode ser desfeita.`)) return;
    await api(url, { method: 'DELETE' });
    onChanged();
    onClose();
  }

  return (
    <>
      {actionError && <p className="error">{actionError}</p>}

      <section className="card">
        {editing ? (
          <>
            <h3>Editar ficha</h3>
            <CharacterForm
              type={character.type}
              initial={character}
              submitLabel="Salvar"
              onSubmit={save}
              onCancel={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <div className="sheet-header">
              {character.imageUrl && (
                <img
                  key={character.imageUrl}
                  className="portrait"
                  src={character.imageUrl}
                  alt=""
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div>
                <h2>{character.name}</h2>
                <div className="actions">
                  <span className={`badge ${character.type === 'NPC' ? '' : 'master'}`}>
                    {character.type === 'PLAYER' ? 'Personagem' : 'NPC'}
                  </span>
                  {character.type === 'PLAYER' && (
                    <span className="muted">Jogador: {character.playerName ?? 'não atribuído'}</span>
                  )}
                  {character.type === 'NPC' && isMaster && (
                    <span className="badge">
                      {character.visibleToPlayers ? 'Revelado aos jogadores' : 'Oculto dos jogadores'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="actions">
                <button onClick={() => setEditing(true)}>Editar ficha</button>
                {isMaster && (
                  <button className="danger" onClick={() => run(remove)}>Apagar ficha</button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {!editing && isMaster && character.type === 'PLAYER' && (
        <section className="card">
          <label>
            Jogador responsável
            <select value={character.playerId ?? ''} onChange={(e) => run(() => changeOwner(e))}>
              <option value="">Sem jogador</option>
              {players.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
            <span className="hint">O jogador escolhido pode ver e editar esta ficha.</span>
          </label>
        </section>
      )}

      {!editing && isMaster && character.type === 'NPC' && (
        <section className="card">
          <p className="muted">
            {character.visibleToPlayers
              ? 'Os jogadores veem este NPC (sem as anotações secretas).'
              : 'Só você vê este NPC.'}
          </p>
          <div className="actions">
            <button className="ghost" onClick={() => run(toggleReveal)}>
              {character.visibleToPlayers ? 'Ocultar dos jogadores' : 'Revelar aos jogadores'}
            </button>
          </div>
        </section>
      )}

      {!editing &&
        (character.type === 'PLAYER' ? <PlayerView data={character.data} /> : <NpcView data={character.data} />)}
    </>
  );
}