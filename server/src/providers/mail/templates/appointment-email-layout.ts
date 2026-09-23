/**
 * ==========================================================
 * Arquivo: appointment-email-layout.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Fornecer o layout base e os dados comuns dos e-mails de
 * agendamento (criado, atualizado e cancelado).
 *
 * ==========================================================
 */

export interface AppointmentEmailData {
  clientName: string;
  companyName: string;
  serviceName?: string | null;
  employeeName?: string | null;
  dateLabel: string;
  timeLabel: string;
  endTimeLabel: string;
  notes?: string | null;
}

interface AppointmentEmailLayoutProps {
  statusLabel: string;
  data: AppointmentEmailData;
}

/**
 * ==========================================================
 * Monta o HTML base dos e-mails de agendamento.
 *
 * As data/hora já chegam formatadas no timezone da empresa.
 * ==========================================================
 */
export function appointmentEmailLayout({
  statusLabel,
  data,
}: AppointmentEmailLayoutProps): string {
  return `
<p>
  Olá, <strong>${data.clientName}</strong>.
</p>

<p>
  Segue o resumo do seu agendamento:
</p>

<div
  style="
    margin: 24px 0;
    padding: 20px;
    background-color: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  "
>
  <p
    style="
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: bold;
      color: #111827;
    "
  >
    ${statusLabel}
  </p>

  <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
    <strong>Data:</strong> ${data.dateLabel}
  </p>

  <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
    <strong>Horário:</strong> ${data.timeLabel} às ${data.endTimeLabel}
  </p>

  <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
    <strong>Serviço:</strong> ${data.serviceName ?? "-"}
  </p>

  <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
    <strong>Profissional:</strong> ${data.employeeName ?? "-"}
  </p>

  ${
    data.notes
      ? `
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
          <strong>Observações:</strong> ${data.notes}
        </p>
      `
      : ""
  }
</div>

<p>
  Obrigado por escolher
  <strong>${data.companyName}</strong>.
</p>

<hr
  style="
    margin: 32px 0;
    border: 0;
    border-top: 1px solid #e5e7eb;
  "
/>

<p
  style="
    margin: 0;
    font-size: 12px;
    color: #6b7280;
  "
>
  Este é um e-mail automático. Por favor, não responda.
</p>

<p
  style="
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
  "
>
  SchedulerPro
</p>
`;
}