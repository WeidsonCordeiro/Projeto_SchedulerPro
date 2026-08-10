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
}

export function welcomeTemplate({
  name,
  companyName,
  loginUrl,
}: WelcomeTemplateProps): string {
  /**
   * ==========================================================
   * Gera o HTML do e-mail de boas-vindas.
   * ==========================================================
   */
  return `
    <!DOCTYPE html>
    <html lang="pt-PT">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>Bem-vindo ao SchedulerPro</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        "
      >
        <div
          style="
            max-width: 600px;
            margin: 40px auto;
            padding: 32px;
            background-color: #ffffff;
            border-radius: 8px;
          "
        >
          <h1
            style="
              margin-bottom: 24px;
              font-size: 24px;
            "
          >
            Bem-vindo ao SchedulerPro!
          </h1>

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
        </div>
      </body>
    </html>
  `;
}
