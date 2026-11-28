# Guia de cópia — frontend SchedulerPro

**Locale alvo:** português europeu (PT-PT), alinhado a `lang="pt"` em `index.html` e a formatadores `pt-PT` (Luxon/`toLocaleString`).

## Princípios

- **Palavra-passe**, não “senha”.
- **Terminar sessão**, não “Logout”.
- **Registar** / **utilizador**, preferir PT-PT a “cadastrar” / “você” (BR), salvo contexto de produto já publicado.
- Mensagens de permissão: preferir impessoal — **“Não tem permissão para aceder a esta página.”** (migração gradual; testes actualizam por branch).

## Quick wins aplicados (FE-FU-002)

| Antes | Depois | Ficheiro |
|-------|--------|----------|
| Logout | Terminar sessão | `Navbar.tsx` |

## FE-Wave-2 (branch `feat/fe-wave-2-copy-pt-pt`)

- Mensagem impessoal de acesso negado nas páginas admin.
- Empty states: **registar** / **registado** (clientes, serviços, funcionários, agendamentos).
- **Palavra-passe** nos fluxos de autenticação e convite.
- Portal: **O meu perfil**, **registo**.
- Erros de rede: **ligação à Internet** (`api/errors.ts`).
- Constantes partilhadas: `client/src/config/copyPt.ts`.

## Pendente (futuro)

- Revisão residual de “seu/sua” em marketing (`GuestRoute`, público).
- Alinhar mensagens devolvidas pelo backend quando forem expostas na UI.