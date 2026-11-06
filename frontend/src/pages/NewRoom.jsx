import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import RoomForm from '../components/RoomForm';

export default function NewRoom() {
  const navigate = useNavigate();

  async function createRoom(data) {
    const { room } = await api('/rooms', { method: 'POST', body: data });
    navigate(`/salas/${room.id}`);
  }

  return (
    <div className="home">
      <header className="topbar">
        <Link to="/">← Minhas salas</Link>
        <strong>Grimório</strong>
      </header>

      <main className="content">
        <h2>Nova sala</h2>
        <p className="muted">Conte um pouco sobre a sua mesa. Dá para mudar tudo isso depois.</p>
        <section className="card">
          <RoomForm submitLabel="Criar sala" onSubmit={createRoom} onCancel={() => navigate('/')} />
        </section>
      </main>
    </div>
  );
}