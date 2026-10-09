/**
 * ==========================================================
 * Arquivo: client-invite.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail de convite para criação de conta CLIENT.
 *
 * Segue o formato simples do `reset-password.template`
 * (corpo standalone, sem o layout de agendamento — o convite
 * não tem horário nem serviço).
 * ==========================================================
 */

interface ClientInviteTemplateProps {
  clientName: string;
  companyName: string;
  inviteUrl: string;
}

export function clientInviteTemplate({
  clientName,
  companyName,
  inviteUrl,
}: ClientInviteTemplateProps): string {
  return `
    <div
      style="
        max-width: 600px;
        margin: 0 auto;
        padding: 32px;
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
      "
    >
      <h2>Convite para o portal de agendamentos</h2>

      <p>Olá, ${clientName}.</p>

      <p>
        <strong>${companyName}</strong> convidou-o a criar a sua conta de
        cliente, para gerir os seus agendamentos online.
      </p>

      <p>
        Clique no botão abaixo para definir a sua senha e ativar a conta.
      </p>

      <p style="margin: 32px 0;">
        <a
          href="${inviteUrl}"
          style="
            background-color: #2563eb;
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
          "
        >
          Criar a minha conta
        </a>
      </p>

      <p>Este link expira em 7 dias e só pode ser usado uma vez.</p>

      <hr />

      <p style="font-size: 12px; color: #6b7280;">
        Se não esperava este convite, ignore esta mensagem. Nada será
        associado à sua conta sem a sua confirmação.
      </p>

      <p style="font-size: 12px; color: #6b7280;">
        SchedulerPro
      </p>
    </div>
  `;
}
