import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon?: string;
  loading?: boolean;
  footer?: ReactNode;
  /** Acento superior opcional (ex.: quarto KPI do Dashboard). */
  accentClassName?: string;
}

export default function DashboardCard({
  title,
  value,
  icon = "bi-calendar3",
  loading = false,
  footer,
  accentClassName,
}: Props) {
  const cardClass = ["card", "dashboard-kpi", "h-100", accentClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h3 className="card-title h6 mb-1">{title}</h3>
            <p className="card-text fs-4 mb-0">
              {loading ? (
                <span
                  className="spinner-border spinner-border-sm"
                  aria-label="Carregando"
                />
              ) : (
                <span data-testid="card-value">{value}</span>
              )}
            </p>
          </div>
          <i className={`bi ${icon} text-muted fs-4`} aria-hidden="true" />
        </div>
        {footer && (
          <small className="text-muted mt-2 d-block">{footer}</small>
        )}
      </div>
    </div>
  );
}
