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

## Pendente (branches futuras)

- Unificar “Você não tem permissão…” em páginas admin.
- Empty states com “cadastrar” → “registar” onde fizer sentido.
- Revisão completa via grep antes de mass replace.