# Grimório

Tabletop virtual de RPG em formato web app, começando pelo sistema D&D 5ª edição. O mestre cria uma sala, convida os jogadores por um link e, nas próximas etapas, joga com mapa, fichas, dados e chat em tempo real.

> "D&D" e "Dungeons & Dragons" são marcas registradas da Wizards of the Coast. Este é um projeto independente, sem afiliação.

## Funcionalidades

- Cadastro com **confirmação de e-mail** (contas não confirmadas em 24 horas são excluídas de vez)
- Login com sessão em cookie `httpOnly`
- **Salas de RPG**: criar, listar, editar e apagar, com capa, sistema de regras, tipo de jogo, nível inicial, limite de jogadores e agenda
- **Convite por link**: copiar, compartilhar (WhatsApp, Telegram, e-mail) e gerar um novo link quando quiser
- Papéis de mestre e jogador, com permissões diferentes

## Tecnologias

- **Frontend:** React, Vite e React Router
- **Backend:** Node.js, Express e Zod
- **Banco de dados:** PostgreSQL com Prisma 7
- **Autenticação:** bcrypt e JWT em cookie `httpOnly`
- **E-mail:** Resend (API) ou SMTP, com Nodemailer

## Estrutura

```
grimorio/
├── backend/
│   ├── prisma/          # schema e migrations
│   └── src/
│       ├── jobs/        # limpeza de contas não confirmadas
│       ├── middleware/  # autenticação
│       ├── routes/      # auth e rooms
│       ├── scripts/     # teste de envio de e-mail
│       └── utils/       # e-mail e validação
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/
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

A API sobe em `http://localhost:3000`. Sem nenhuma configuração de e-mail, o link de confirmação aparece no terminal do backend.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

## E-mail

Escolha uma opção no `backend/.env`:

- **Nenhuma (só desenvolvimento):** o e-mail é exibido no terminal, sem envio.
- **Resend (recomendado para produção):** defina `RESEND_API_KEY` e `MAIL_FROM`. Para enviar a qualquer destinatário, é preciso verificar um domínio no Resend.
- **SMTP:** defina `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`. Com Gmail, use uma senha de app (exige verificação em duas etapas).

Para testar o envio sem fazer um cadastro:

```bash
cd backend
node src/scripts/testar-email.js destino@exemplo.com
```

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/auth/register` | Cria a conta pendente e envia o e-mail de confirmação |
| POST | `/auth/verify-email` | Confirma o e-mail pelo token do link |
| POST | `/auth/resend-verification` | Reenvia o e-mail de confirmação |
| POST | `/auth/login` | Entra (exige e-mail confirmado) |
| POST | `/auth/logout` | Sai |
| GET | `/auth/me` | Dados do usuário logado |
| GET | `/rooms` | Lista as salas do usuário |
| POST | `/rooms` | Cria uma sala (quem cria vira o mestre) |
| GET | `/rooms/:id` | Detalhes da sala (só membros) |
| PATCH | `/rooms/:id` | Edita a sala (só mestre) |
| DELETE | `/rooms/:id` | Apaga a sala (só mestre) |
| POST | `/rooms/:id/invite/regenerate` | Gera um novo código de convite (só mestre) |
| POST | `/rooms/:id/leave` | Sai da sala (jogador) |
| GET | `/rooms/join/:code` | Prévia do convite |
| POST | `/rooms/join/:code` | Entra na sala pelo convite |
| GET | `/health` | Verificação de saúde |

## Deploy

O backend serve o frontend compilado, então basta um serviço Node e um PostgreSQL.

- **Build:** `npm run build` (na raiz)
- **Start:** `npm start` (aplica as migrations e sobe o servidor)
- **Variáveis:** as mesmas do `backend/.env.example`, mais `NODE_ENV=production`

## Observações técnicas

- Prisma 7 com o gerador `prisma-client-js` e CommonJS. Mantenha a versão fixada (`prisma@7`).
- Depois de mudar o `schema.prisma`, rode `npx prisma migrate dev` e depois `npx prisma generate`.
- Nunca commite o arquivo `.env`.

## Roadmap

- [x] Cadastro, login e confirmação de e-mail
- [x] Salas com convite por link
- [ ] Mesa de jogo em tempo real: mapa, tokens, rolagem de dados e chat
- [ ] Fichas de personagem de D&D 5e
- [ ] Névoa de guerra, iniciativa e upload de mapas