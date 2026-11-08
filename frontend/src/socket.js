import { io } from 'socket.io-client';

// Em desenvolvimento, o servidor roda em localhost:3000. Em produção, é o mesmo endereço do site.
const URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : undefined);

export function conectarSocket() {
  return io(URL, { withCredentials: true });
}