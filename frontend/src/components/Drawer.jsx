export default function Drawer({ title, onClose, children }) {
  return (
    <div className="drawer-backdrop">
      <aside className="drawer" role="dialog" aria-label={title}>
        <header className="drawer-header">
          <h3>{title}</h3>
          <button className="ghost" onClick={onClose}>Fechar</button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}