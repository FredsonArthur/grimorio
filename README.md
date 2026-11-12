# Grimório

Tabletop virtual de RPG em formato web app, começando pelo sistema D&D 5ª edição. O mestre cria uma sala, convida os jogadores por um link, monta as fichas de personagens e NPCs e conduz a sessão em uma mesa com mapa e chat em tempo real.

> "D&D" e "Dungeons & Dragons" são marcas registradas da Wizards of the Coast. Este é um projeto independente, sem afiliação.

## Funcionalidades

- Cadastro com **confirmação de e-mail** (contas não confirmadas em 24 horas são excluídas de vez)
- Login com sessão em cookie `httpOnly`
- **Salas de RPG**: criar, listar, editar e apagar, com capa, sistema de regras, tipo de jogo, nível inicial, limite de jogadores e agenda
  - Clicar no cartão da sala abre as **configurações** (dados da sala, convite e membros)
  - O botão **Abrir sala** leva à mesa de jogo
- **Convite por link**: copiar, compartilhar (WhatsApp, Telegram, e-mail) e gerar um novo link quando quiser
- Papéis de **mestre** e **jogador**, com permissões diferentes
- **A mesa de jogo**:
  - Mapa quadriculado em branco no centro (preparado para receber imagens de mapa)
  - Barra lateral esquerda com as ferramentas de RPG (em breve)
  - Barra lateral direita com abas:
    - **Chat em tempo real**, com histórico salvo (as últimas 100 mensagens aparecem ao abrir a mesa)
    - **Fichas**, com criação e edição sem sair da mesa: as fichas abrem em um painel lateral sobre o mapa
- **Fichas de D&D 5e**, criadas pelo mestre, em dois formatos:
  - **Personagem de jogador**: identidade, nível, atributos, vida, CA, salvaguardas e perícias, ataques, equipamento, magias e anotações, com modificadores, bônus de proficiência e totais calculados. O jogador responsável vê e edita a própria ficha
  - **NPC**: formato de criatura, com tipo, tamanho, ND, atributos, ações e **anotações secretas** do mestre. Fica oculto por padrão, e o mestre pode revelá-lo aos jogadores (sem as anotações secretas)

## Tecnologias

- **Frontend:** React, Vite e React Router
- **Backend:** Node.js, Express e Zod
- **Tempo real:** Socket.IO (WebSocket)
- **Banco de dados:** PostgreSQL com Prisma 7
- **Autenticação:** bcrypt e JWT em cookie `httpOnly`
- **E-mail:** Brevo (API), Resend (API) ou SMTP, com Nodemailer

## Estrutura

```
grimorio/
├── backend/
│   ├── prisma/          # schema e migrations
│   └── src/
│       ├── jobs/        # limpeza de contas não confirmadas
│       ├── middleware/  # autenticação
│       ├── routes/      # auth, rooms, characters e messages
│       ├── scripts/     # teste de envio de e-mail
│       ├── utils/       # e-mail e validação
│       └── realtime.js  # servidor Socket.IO (chat)
├── frontend/
│   └── src/
│       ├── components/  # mapa, chat, fichas, painel lateral e formulários
│       ├── pages/       # telas
│       ├── dnd.js       # tabelas e fórmulas de D&D 5e
│       └── socket.js    # conexão em tempo real
├── LICENSE
└── package.json         # scripts de build e start para o deploy
```

## Como rodar localmente

### Pré-requisitos

- Node.js 22 ou superior
- PostgreSQL
- Git

### 1. Banco de dados

Exemplo no Fedora (troque `seu_usuario` e `sua_senha`):

```bash
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER seu_usuario WITH PASSWORD 'sua_senha' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE grimorio OWNER seu_usuario;"
```

No Fedora, edite `/var/lib/pgsql/data/pg_hba.conf`, troque `ident` por `scram-sha-256` nas linhas de `127.0.0.1/32` e `::1/128` e reinicie com `sudo systemctl restart postgresql`.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` (veja os comentários no próprio arquivo). Gere o `JWT_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Depois:

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

A API e o servidor de tempo real sobem juntos em `http://localhost:3000`. Sem nenhuma configuração de e-mail, o link de confirmação aparece no terminal do backend.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. O chat precisa dos dois servidores rodando.

## E-mail

O provedor é escolhido pelo `backend/.env`. Se houver mais de um configurado, a ordem de preferência é **Brevo, Resend e SMTP**. Sem nenhum, em desenvolvimento o e-mail só aparece no terminal.

- **Brevo (API):** defina `BREVO_API_KEY` e `MAIL_FROM`. Funciona sem domínio próprio e em hospedagens que bloqueiam SMTP. O endereço do `MAIL_FROM` precisa estar verificado no painel do Brevo, e a chave de API só precisa da permissão de e-mails transacionais. Com um endereço gratuito (como Gmail), o Brevo substitui o remetente e os e-mails podem cair no spam.
- **Resend (API):** defina `RESEND_API_KEY` e `MAIL_FROM`. Para enviar a qualquer destinatário, é preciso verificar um domínio no Resend.
- **SMTP:** defina `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`. Com Gmail, use uma senha de app (exige verificação em duas etapas).

Para testar o envio sem fazer um cadastro:

```bash
cd backend
npm run test:email -- destino@exemplo.com
```

## Telas

| Rota | Descrição |
| --- | --- |
| `/login`, `/cadastro` | Entrar e criar conta |
| `/verificar-email` | Confirmação do e-mail, pelo link recebido |
| `/entrar/:código` | Convite para uma sala |
| `/` | Minhas salas |
| `/salas/nova` | Criar sala |
| `/salas/:id` | Configurações da sala (dados, convite e membros) |
| `/salas/:id/mesa` | A mesa de jogo (mapa, ferramentas, chat e fichas) |

## API

Todas as rotas, exceto as de cadastro, confirmação de e-mail, login e `/health`, exigem login.

### Contas

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/register` | Cria a conta pendente e envia o e-mail de confirmação |
| POST | `/auth/verify-email` | Confirma o e-mail pelo token do link |
| POST | `/auth/resend-verification` | Reenvia o e-mail de confirmação |
| POST | `/auth/login` | Entra (exige e-mail confirmado) |
| POST | `/auth/logout` | Sai |
| GET | `/auth/me` | Dados do usuário logado |

### Salas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/rooms` | Lista as salas do usuário |
| POST | `/rooms` | Cria uma sala (quem cria vira o mestre) |
| GET | `/rooms/:id` | Detalhes da sala (só membros) |
| PATCH | `/rooms/:id` | Edita a sala (só mestre) |
| DELETE | `/rooms/:id` | Apaga a sala (só mestre) |
| POST | `/rooms/:id/invite/regenerate` | Gera um novo código de convite (só mestre) |
| POST | `/rooms/:id/leave` | Sai da sala (jogador) |
| GET | `/rooms/join/:code` | Prévia do convite |
| POST | `/rooms/join/:code` | Entra na sala pelo convite |

### Fichas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/rooms/:roomId/characters` | Lista as fichas (mestre: todas; jogador: as suas e os NPCs revelados) |
| POST | `/rooms/:roomId/characters` | Cria uma ficha de jogador ou de NPC (só mestre) |
| GET | `/rooms/:roomId/characters/:id` | Vê uma ficha |
| PATCH | `/rooms/:roomId/characters/:id` | Edita (mestre em qualquer uma; jogador só na própria, sem mudar dono nem visibilidade) |
| DELETE | `/rooms/:roomId/characters/:id` | Apaga a ficha (só mestre) |

### Chat

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/rooms/:roomId/messages` | Histórico: as últimas 100 mensagens, da mais antiga para a mais nova (só membros) |

### Outras

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Verificação de saúde |

## Tempo real (Socket.IO)

A conexão usa o mesmo cookie de login da API. Sem login válido, o servidor recusa a conexão.

| Evento | Direção | Descrição |
| --- | --- | --- |
| `room:join` | cliente → servidor | Entra no canal da sala (só membros). Recebe `{ ok }` ou `{ ok: false, error }` |
| `chat:send` | cliente → servidor | Envia `{ roomId, content }` (até 1000 caracteres). Limite de 5 mensagens a cada 5 segundos por conexão |
| `chat:message` | servidor → clientes | Mensagem nova, entregue a todos no canal da sala |

As mensagens são salvas no banco. A participação na sala é conferida a cada envio.

## Deploy

O backend serve o frontend compilado e o WebSocket, então basta um serviço Node e um PostgreSQL.

- **Build:** `npm run build` (na raiz)
- **Start:** `npm start` (aplica as migrations e sobe o servidor)
- **Variáveis:** as mesmas do `backend/.env.example`, mais `NODE_ENV=production`

Uma combinação que funciona em planos gratuitos: **Render** (serviço web), **Neon** (PostgreSQL, usando a connection string direta, sem `-pooler`) e **Brevo** (e-mail). Hospedagens gratuitas costumam bloquear portas SMTP, por isso o envio em produção usa a API HTTPS do Brevo ou do Resend. O serviço gratuito do Render dorme quando fica parado: o primeiro acesso demora cerca de um minuto, e as conexões do chat caem e se refazem sozinhas quando o serviço acorda.

## Observações técnicas

- Prisma 7 com o gerador `prisma-client-js` e CommonJS. Mantenha a versão fixada (`prisma@7`).
- Depois de mudar o `schema.prisma`, rode `npx prisma migrate dev` e depois `npx prisma generate`.
- O Socket.IO roda sobre o mesmo servidor HTTP do Express (`http.createServer(app)`). O login vem do cookie `httpOnly`, lido no handshake.
- Os campos específicos do D&D das fichas ficam em uma coluna JSON, validada pelo servidor com Zod para cada tipo de ficha. Isso permite evoluir a ficha ou suportar outros sistemas sem nova migration.
- Os valores calculados das fichas (modificadores, bônus de proficiência, totais de perícias) são feitos no frontend, a partir dos atributos e do nível.
- Quem sai da sala com a mesa aberta deixa de conseguir enviar mensagens, mas continua recebendo as novas até recarregar a página.
- Nunca commite o arquivo `.env`.

## Roadmap

- [x] Cadastro, login e confirmação de e-mail
- [x] Salas com convite por link
- [x] Fichas de personagem e de NPC (D&D 5e)
- [x] Mesa de jogo: layout com mapa, ferramentas e abas
- [x] Chat em tempo real com histórico
- [ ] Rolagem de dados (comandos no chat, como `/r 2d6+3`)
- [ ] Upload de imagem de mapa
- [ ] Tokens no mapa, em tempo real
- [ ] Ligação entre fichas e tokens (vida e CA vindas da ficha)
- [ ] Iniciativa e névoa de guerra
- [ ] Domínio próprio, para um e-mail profissional (SPF, DKIM e DMARC)

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).