import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import RoomForm from '../components/RoomForm';
import { SYSTEMS, CAMPAIGN_TYPES } from '../roomOptions';

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const isMaster = room.role === 'MASTER';
  const inviteLink = isMaster ? `${window.location.origin}/entrar/${room.inviteCode}` : '';
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canShare = typeof navigator.share === 'function';
  const shareText = `Venha jogar em "${room.name}" no Grimório!`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${inviteLink}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Convite para a sala ${room.name}`)}&body=${encodeURIComponent(`${shareText}\n${inviteLink}`)}`;

  async function run(action) {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function saveRoom(data) {
    const { room: updated } = await api(`/rooms/${id}`, { method: 'PATCH', body: data });
    setRoom((r) => ({ ...r, ...updated }));
    setEditing(false);
  }

  async function deleteRoom() {
    if (!window.confirm(`Apagar a sala "${room.name}"? Essa ação não pode ser desfeita.`)) return;
    await api(`/rooms/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  async function leaveRoom() {
    if (!window.confirm(`Sair da sala "${room.name}"?`)) return;
    await api(`/rooms/${id}/leave`, { method: 'POST' });
    navigate('/');
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareNative() {
    try {
      await navigator.share({ title: `Convite para ${room.name}`, text: shareText, url: inviteLink });
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    }
  }

  async function regenerate() {
    if (!window.confirm('Gerar um novo link? O link atual deixará de funcionar.')) return;
    const { inviteCode } = await api(`/rooms/${id}/invite/regenerate`, { method: 'POST' });
    setRoom((r) => ({ ...r, inviteCode }));
  }

  return (
    <div className="home">
      <header className="topbar">
        <Link to="/">← Minhas salas</Link>
        <strong>Grimório</strong>
      </header>

      <main className="content">
        {actionError && <p className="error">{actionError}</p>}

        <section className="card">
          {editing ? (
            <>
              <h3>Editar sala</h3>
              <RoomForm initial={room} submitLabel="Salvar" onSubmit={saveRoom} onCancel={() => setEditing(false)} />
            </>
          ) : (
            <>
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
                <h2>{room.name}</h2>
                <span className={`badge ${isMaster ? 'master' : ''}`}>{isMaster ? 'Mestre' : 'Jogador'}</span>
              </div>
              {room.description && <p className="muted">{room.description}</p>}
              <dl className="info">
                <dt>Sistema</dt>
                <dd>{SYSTEMS[room.system] ?? room.system}</dd>
                <dt>Tipo</dt>
                <dd>{CAMPAIGN_TYPES[room.campaignType] ?? room.campaignType}</dd>
                <dt>Nível inicial</dt>
                <dd>{room.startingLevel}</dd>
                <dt>Jogadores</dt>
                <dd>{room.playerCount} de {room.maxPlayers}</dd>
                {room.schedule && (
                  <>
                    <dt>Quando jogam</dt>
                    <dd>{room.schedule}</dd>
                  </>
                )}
              </dl>
              <div className="actions">
                <Link className="btn" to={`/salas/${id}/mesa`}>Abrir sala</Link>
                {isMaster ? (
                  <>
                    <button className="ghost" onClick={() => setEditing(true)}>Editar</button>
                    <button className="danger" onClick={() => run(deleteRoom)}>Apagar sala</button>
                  </>
                ) : (
                  <button className="danger" onClick={() => run(leaveRoom)}>Sair da sala</button>
                )}
              </div>
            </>
          )}
        </section>

        {isMaster && (
          <section className="card">
            <h3>Convidar jogadores</h3>
            <p className="muted">Qualquer pessoa com este link entra na sala como jogador, enquanto houver vaga.</p>
            <a href={inviteLink} target="_blank" rel="noreferrer" className="invite-link">
              {inviteLink}
            </a>
            {isLocal && (
              <p className="hint">
                Você está acessando por localhost, então este link só abre neste computador. Para convidar outras
                pessoas, o Grimório precisa estar acessível pela internet.
              </p>
            )}
            <div className="actions">
              <button onClick={() => run(copyLink)}>{copied ? 'Copiado!' : 'Copiar link'}</button>
              {canShare && (
                <button className="ghost" onClick={() => run(shareNative)}>Compartilhar</button>
              )}
              <a className="btn ghost" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn ghost" href={telegramUrl} target="_blank" rel="noreferrer">Telegram</a>
              <a className="btn ghost" href={emailUrl}>E-mail</a>
              <button className="ghost" onClick={() => run(regenerate)}>Gerar novo link</button>
            </div>
          </section>
        )}

        <section className="card">
          <h3>Membros ({room.members.length})</h3>
          <ul className="members">
            {room.members.map((m) => (
              <li key={m.userId}>
                <span>{m.name}</span>
                <span className={`badge ${m.role === 'MASTER' ? 'master' : ''}`}>
                  {m.role === 'MASTER' ? 'Mestre' : 'Jogador'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}