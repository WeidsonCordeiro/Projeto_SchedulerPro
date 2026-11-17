# SchedulerPro

Sistema de **agendamento multiempresa** (SaaS): API em Node.js, interface em React, documentação técnica em [`docs/`](docs/).

> **Idioma:** Português (estrutura pensada para futura versão em inglês deste ficheiro.)

---

## Objetivo

O SchedulerPro permite que empresas gerem agendamentos, equipas e clientes, com dashboard operacional, regras de visibilidade e escrita por perfil (O6/O7), gestão da empresa e expiração automática de agendamentos vencidos. A visão de produto e roadmap estão sintetizados em [`docs/tasks/ROADMAP_AUDIT_2026-11-11.md`](docs/tasks/ROADMAP_AUDIT_2026-11-11.md).

---

## Características principais

| Área | Descrição (estado documentado em `develop`) |
|------|---------------------------------------------|
| **Dashboard** | KPI de clientes ativos (O1), distribuição por estado (O2), refresh ao regressar à aba com throttle de 45 s (O5) |
| **Agendamentos** | CRUD multi-tenant; visibilidade por role (O6); limites de escrita por role (O7) |
| **Expiração** | Scheduler in-process que cancela `scheduled` vencidos; GET de listagens sem efeito colateral de expiração (E4) |
| **Empresa** | Gestão da própria empresa (permissões API, soft delete na UI) |
| **Público** | Fluxos de marcação e tokens públicos (ver relatórios em `docs/reports/`) |

Detalhes por entrega: índice em [`docs/README.md`](docs/README.md).

---

## Arquitetura e tecnologias

| Camada | Tecnologias (versões nos `package.json` de cada pacote) |
|--------|-----------------------------------------------------------|
| **Frontend** (`client/`) | React 19, Vite 7, Redux Toolkit, React Router, Bootstrap 5, Luxon, Axios |
| **Backend** (`server/`) | Node.js **≥ 22**, Express, TypeScript, MongoDB, Vitest, `tsx` em desenvolvimento |
| **Testes** | Vitest (client `^4.1.7`, server `^4.1.11`; corridas documentadas com runner 4.1.11) |

Padrão backend: Controller → Service → Repository, isolamento por `companyId` e RBAC.

---

## Estrutura do repositório

O repositório **não** tem `package.json` na raiz: são dois pacotes npm independentes.

```
Projeto_SchedulerPro/
├── client/          # SPA React (Vite)
│   └── src/         # pages, components, store, hooks, api, …
├── server/          # API Express
│   └── src/         # modules, routes, middlewares, config, …
├── docs/            # Documentação (tasks, audits, reports)
│   └── README.md    # Índice navegável
└── README.md        # Este ficheiro
```

Outros ficheiros na raiz (por exemplo relatórios de estágios `STAGE-*.md`) são histórico de sessões; a documentação canónica evoluída está em `docs/`.

---

## Pré-requisitos

- **Node.js** ≥ 22 (exigido em [`server/package.json`](server/package.json))
- **npm**
- **MongoDB** acessível (variável `MONGO_URI` no servidor)
- Opcional conforme funcionalidades: Redis, Cloudinary, Resend, WhatsApp, Sentry (ver [`server/.env.example`](server/.env.example))

---

## Instalação

```bash
cd client
npm install

cd ../server
npm install
```

---

## Configuração

Copie os exemplos e preencha com valores locais ou de ambiente de teste — **nunca** commitar `.env` com segredos.

### Frontend — [`client/.env.example`](client/.env.example)

| Variável | Uso |
|----------|-----|
| `VITE_API_URL` | URL base da API. Em desenvolvimento, use `/api` (proxy Vite → backend). |
| `VITE_APP_URL` | (Opcional) URL pública do frontend. |

### Backend — [`server/.env.example`](server/.env.example)

Variáveis listadas no exemplo: `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_SECRET`, `REFRESH_EXPIRES_IN`, chaves de encriptação de tokens públicos, Cloudinary, Redis, Resend, WhatsApp, `LOG_LEVEL`, `SENTRY_DSN`, `FRONTEND_URL`.

Obrigatórias para arranque (validação em [`server/src/config/validateEnv.ts`](server/src/config/validateEnv.ts)): entre outras, `MONGO_URI`, `JWT_SECRET`, `REFRESH_SECRET` e o keyring de tokens públicos.

Em [`server/src/config/env.ts`](server/src/config/env.ts), porta e ambiente usam `APP_PORT` (padrão **3000**) e `APP_NODE_ENV` quando definidos; alinhe o ficheiro `.env` com o que o código consome na sua instalação.

---

## Desenvolvimento

1. Inicie a API (directório `server/`):

   ```bash
   npm run dev
   ```

2. Inicie o frontend (directório `client/`):

   ```bash
   npm run dev
   ```

Com `VITE_API_URL=/api`, o Vite encaminha pedidos `/api` para o backend (tipicamente `http://localhost:3000`), mantendo cookies `httpOnly` em same-origin. O frontend de desenvolvimento usa por defeito `http://localhost:5173` ([`server/src/config/env.ts`](server/src/config/env.ts) — `FRONTEND_URL`).

---

## Testes, typecheck e build

Execute **em cada pacote** (`client/` ou `server/`):

| Comando | Descrição |
|---------|-----------|
| `npm test` | Vitest (`vitest run`) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run test:coverage` | Cobertura V8 |
| `npm run typecheck` | TypeScript sem emit |
| `npm run build` | Build de produção |

**Estado da qualidade frontend** (sem substituir uma corrida local sua): [`docs/reports/frontend-quality-status-2026-11-16.md`](docs/reports/frontend-quality-status-2026-11-16.md).

**Produção (servidor):** após `npm run build`, `npm start` executa `node dist/server.js`.

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [`docs/README.md`](docs/README.md) | Índice de `tasks/`, `audits/`, `reports/` |
| [`docs/reports/frontend-quality-status-2026-11-16.md`](docs/reports/frontend-quality-status-2026-11-16.md) | Snapshot de qualidade frontend (2026-11-16) |
| [`docs/tasks/ROADMAP_AUDIT_2026-11-11.md`](docs/tasks/ROADMAP_AUDIT_2026-11-11.md) | Roadmap e auditoria geral (snapshot 11/11/2026) |

Relatórios antigos mantêm HEAD e data originais; para interpretar resultados de testes ao longo do tempo, use o documento de qualidade acima e a cronologia referenciada lá.