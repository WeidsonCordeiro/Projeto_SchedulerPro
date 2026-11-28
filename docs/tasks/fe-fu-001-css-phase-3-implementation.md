# FE-FU-001 — CSS global fase 3

**Branch:** `feat/fe-fu-001-css-phase-3`

## Alterações

Extracção de blocos de `index.css` para CSS por rota lazy:

| Ficheiro | Import em | Conteúdo |
|----------|-----------|----------|
| `public-appointment-token.css` | `PublicAppointmentPage` | resumo `/agendar/:token` |
| `public-booking.css` | `PublicBookingPage` | fluxo de marcação |
| `reports-ranking.css` | `ReportsPage` | rankings mobile |
| (append) `appointments-calendar.css` | `AppointmentsPage` | `employee-picker` |

## Medição (build)

| Asset | Fase 2 | Fase 3 |
|-------|--------|--------|
| `index-*.css` | 346.68 kB (51.67 gzip) | **338.27 kB** (50.35 gzip) |
| Chunks por rota | `AppointmentsPage` 14.48 kB | + `PublicBooking` 4.07 kB, `Reports` 1.71 kB, `PublicAppointment` 1.28 kB; calendário ~15.84 kB |

`index.css` ~1759 linhas (vs ~2367 antes da onda 3).