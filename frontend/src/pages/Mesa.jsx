import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { conectarSocket } from '../socket';
import MapBoard from '../components/MapBoard';
import ToolsSidebar from '../components/ToolsSidebar';
import ChatPanel from '../components/ChatPanel';
import SheetsPanel from '../components/SheetsPanel';
import Drawer from '../components/Drawer';
import CharacterSheet from '../components/CharacterSheet';
import NewCharacterPanel from '../components/NewCharacterPanel';

export default function Mesa() {
  const { id } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [tab, setTab] = useState('chat');
  const [drawer, setDrawer] = useState(null); // { kind: 'sheet', id } | { kind: 'new', type }
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api(`/rooms/${id}`)
      .then((data) => setRoom(data.room))
      .catch((err) => setError(err.message));
  }, [id]);

  // Uma conexão em tempo real enquanto a mesa estiver aberta
  useEffect(() => {
    const s = conectarSocket();
    setSocket(s);
    return () => s.disconnect();
  }, []);

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
  const refresh = () => setRefreshKey((k) => k + 1);

  const drawerTitle =
    drawer?.kind === 'new'
      ? drawer.type === 'PLAYER'
        ? 'Nova ficha de jogador'
        : 'Nova ficha de NPC'
      : 'Ficha';

  return (
    <div className="mesa">
      <header className="mesa-topbar">
        <Link to="/">← Salas</Link>
        <strong>{room.name}</strong>
        <Link className="btn ghost small" to={`/salas/${id}`}>Configurações</Link>
      </header>

      <div className="mesa-body">
        <aside className="mesa-left">
          <ToolsSidebar />
        </aside>

        <main className="mesa-center">
          <MapBoard />
        </main>

        <aside className="mesa-right">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'chat'}
              className={`tab ${tab === 'chat' ? 'active' : ''}`}
              onClick={() => setTab('chat')}
            >
              Chat
            </button>
            <button
              role="tab"
              aria-selected={tab === 'fichas'}
              className={`tab ${tab === 'fichas' ? 'active' : ''}`}
              onClick={() => setTab('fichas')}
            >
              Fichas
            </button>
          </div>

          <div className="tab-panel flush" hidden={tab !== 'chat'}>
            <ChatPanel roomId={id} socket={socket} currentUserId={user.id} active={tab === 'chat'} />
          </div>

          <div className="tab-panel" hidden={tab !== 'fichas'}>
            <SheetsPanel
              roomId={id}
              isMaster={isMaster}
              refreshKey={refreshKey}
              onOpen={(characterId) => setDrawer({ kind: 'sheet', id: characterId })}
              onNew={(type) => setDrawer({ kind: 'new', type })}
            />
          </div>
        </aside>
      </div>

      {drawer && (
        <Drawer title={drawerTitle} onClose={() => setDrawer(null)}>
          {drawer.kind === 'new' ? (
            <NewCharacterPanel
              roomId={id}
              room={room}
              type={drawer.type}
              onSwitchType={(type) => setDrawer({ kind: 'new', type })}
              onCreated={(character) => {
                refresh();
                setDrawer({ kind: 'sheet', id: character.id });
              }}
              onCancel={() => setDrawer(null)}
            />
          ) : (
            <CharacterSheet
              key={drawer.id}
              roomId={id}
              room={room}
              characterId={drawer.id}
              onChanged={refresh}
              onClose={() => setDrawer(null)}
            />
          )}
        </Drawer>
      )}
    </div>
  );
}