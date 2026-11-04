import { useAuth } from '../AuthContext';

export default function Home() {
  const { user, logout } = useAuth();

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
        <h2>Bem-vindo, {user.name}!</h2>
        <section className="card">
          <h3>Minhas campanhas</h3>
          <p className="subtitle">Você ainda não tem nenhuma campanha.</p>
          <button disabled>Criar campanha (em breve)</button>
        </section>
      </main>
    </div>
  );
}