/**
 * ==========================================================
 * Arquivo: welcome.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail enviado quando um novo usuário
 * é criado no SchedulerPro.
 *
 * ==========================================================
 */

interface WelcomeTemplateProps {
  name: string;
  companyName: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export function welcomeTemplate({
  name,
  companyName,
  loginUrl,
  temporaryPassword,
}: WelcomeTemplateProps): string {
  /**

==========================================================
Gera o HTML do e-mail de boas-vindas.
==========================================================
*/
  return `
<p>
Olá, <strong>${name}</strong>.
</p>
<p>
  A sua conta foi criada com sucesso no SchedulerPro.
</p>

<p>
  Está associado à empresa
  <strong>${companyName}</strong>.
</p>

${
  temporaryPassword
    ? `
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
          Dados de acesso
        </p>

        <p
          style="
            margin: 0 0 6px 0;
            font-size: 14px;
            color: #6b7280;
          "
        >
          Palavra-passe temporária:
        </p>

        <p
          style="
            margin: 0;
            padding: 10px 12px;
            background-color: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            color: #111827;
          "
        >
          ${temporaryPassword}
        </p>
      </div>

      <div
        style="
          margin: 24px 0;
          padding: 16px;
          background-color: #fff7ed;
          border-left: 4px solid #f97316;
        "
      >
        <p
          style="
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: #9a3412;
          "
        >
          <strong>Importante:</strong>
          esta é uma palavra-passe temporária.
          Por motivos de segurança, deverá alterá-la
          após o primeiro acesso.
        </p>
      </div>
    `
    : ""
}

<p>
  Para aceder à plataforma, clique no botão abaixo:
</p>

<div style="margin: 32px 0;">
  <a
    href="${loginUrl}"
    style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    "
  >
    Aceder ao SchedulerPro
  </a>
</div>

<p>
  Se não reconhece esta conta, pode ignorar este e-mail.
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
