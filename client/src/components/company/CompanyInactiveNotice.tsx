import type { Role } from "../../types/auth";

export type CompanyInactiveNoticeVariant = "page" | "global";

interface CompanyInactiveNoticeProps {
  role: Role | null;
  variant?: CompanyInactiveNoticeVariant;
}

export default function CompanyInactiveNotice({
  role,
  variant = "page",
}: CompanyInactiveNoticeProps) {
  const marginClass = variant === "global" ? "mb-3" : "mb-4";

  if (role === "OWNER") {
    return (
      <div
        className={`alert alert-warning ${marginClass}`}
        role="alert"
        data-testid="company-inactive-notice"
        data-notice-role="OWNER"
      >
        <p className="fw-semibold mb-2">Empresa suspensa</p>
        <ul className="mb-0 ps-3">
          <li>O agendamento público está bloqueado.</li>
          <li>
            Os utilizadores que não sejam OWNER foram suspensos
            automaticamente.
          </li>
          <li>
            Apenas o OWNER pode reativar a empresa na secção «Estado
            operacional».
          </li>
          <li>
            Os dados abaixo permanecem disponíveis para consulta; a edição e a
            logo estão indisponíveis enquanto a empresa estiver suspensa.
          </li>
        </ul>
      </div>
    );
  }

  if (role === "ADMIN") {
    return (
      <div
        className={`alert alert-warning ${marginClass}`}
        role="alert"
        data-testid="company-inactive-notice"
        data-notice-role="ADMIN"
      >
        <p className="fw-semibold mb-2">Empresa suspensa</p>
        <p className="mb-2">
          A empresa está suspensa. Não tem permissão para reativá-la — contacte
          o OWNER da empresa.
        </p>
        <p className="mb-0">
          Os dados estão disponíveis apenas para consulta; não é possível editar
          o perfil nem alterar a logo enquanto a suspensão estiver activa.
        </p>
      </div>
    );
  }

  return null;
}
