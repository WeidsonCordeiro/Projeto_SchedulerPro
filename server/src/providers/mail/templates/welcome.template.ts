/**
 * ==========================================================
 * Arquivo: welcome.template.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Modelo de e-mail de boas-vindas.
 *
 * ==========================================================
 */

interface WelcomeTemplateProps {
  name: string;
  companyName: string;
}

export function welcomeTemplate({
  name,
  companyName,
}: WelcomeTemplateProps): string {
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
      <h2>Bem-vindo ao SchedulerPro</h2>

      <p>Olá, ${name}.</p>

      <p>
        A sua conta foi criada com sucesso.
      </p>

      <p>
        Empresa: <strong>${companyName}</strong>
      </p>

      <p>
        Agora já pode aceder ao sistema e começar a utilizar
        todos os recursos disponíveis.
      </p>

      <hr />

      <p style="font-size: 12px; color: #6b7280;">
        SchedulerPro
      </p>
    </div>
  `;
}
