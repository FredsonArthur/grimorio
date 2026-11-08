const TOOLS = [
  { name: 'Rolagem de dados', hint: 'Role dados e mostre o resultado para todos' },
  { name: 'Iniciativa', hint: 'Ordem dos turnos do combate' },
  { name: 'Tokens', hint: 'Personagens e criaturas no mapa' },
  { name: 'Mapas', hint: 'Enviar e trocar a imagem do mapa' },
  { name: 'Névoa de guerra', hint: 'Esconder áreas do mapa dos jogadores' },
  { name: 'Medição', hint: 'Régua e áreas de efeito' },
];

export default function ToolsSidebar() {
  return (
    <div className="tools">
      <h3>Ferramentas</h3>
      <p className="hint">Estas ferramentas chegam nas próximas etapas.</p>
      <ul className="tool-list">
        {TOOLS.map((tool) => (
          <li key={tool.name}>
            <button type="button" className="tool" disabled title={tool.hint}>
              <span>{tool.name}</span>
              <small>em breve</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}