import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const horario = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function ChatPanel({ roomId, socket, currentUserId, active }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // Histórico salvo no banco
  useEffect(() => {
    api(`/rooms/${roomId}/messages`)
      .then((data) => {
        setMessages((current) => {
          const ids = new Set(current.map((m) => m.id));
          return [...data.messages.filter((m) => !ids.has(m.id)), ...current];
        });
      })
      .catch((err) => setError(err.message));
  }, [roomId]);

  // Mensagens ao vivo
  useEffect(() => {
    if (!socket) return;

    const join = () => {
      socket.emit('room:join', roomId, (res) => {
        if (res?.ok) {
          setConnected(true);
          setError('');
        } else {
          setError(res?.error || 'Não foi possível entrar no chat');
        }
      });
    };

    const onMessage = (msg) => {
      if (msg.roomId !== roomId) return;
      setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
    };

    const onDisconnect = () => setConnected(false);

    const onConnectError = (err) => {
      setConnected(false);
      setError(err.message === 'Não autenticado' ? 'Faça login novamente para usar o chat' : 'Sem conexão com o chat');
    };

    socket.on('connect', join);
    socket.on('chat:message', onMessage);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    if (socket.connected) join();

    return () => {
      socket.off('connect', join);
      socket.off('chat:message', onMessage);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [socket, roomId]);

  // Rola para a última mensagem
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, active]);

  function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !socket?.connected) return;

    socket.emit('chat:send', { roomId, content }, (res) => {
      if (!res?.ok) setError(res?.error || 'Não foi possível enviar a mensagem');
      else setError('');
    });
    setText('');
  }

  return (
    <div className="chat">
      <div className="chat-status muted">{connected ? 'Conectado' : 'Conectando...'}</div>
      {error && <p className="error chat-error">{error}</p>}

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted">Nenhuma mensagem ainda. Diga olá!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.userId === currentUserId ? 'mine' : ''}`}>
            <div className="chat-meta">
              <strong>{m.userName}</strong>
              <small className="muted">{horario(m.createdAt)}</small>
            </div>
            <p className="prewrap">{m.content}</p>
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem"
          maxLength={1000}
          disabled={!connected}
        />
        <button disabled={!connected || !text.trim()}>Enviar</button>
      </form>
    </div>
  );
}