import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon?: string;
  loading?: boolean;
  footer?: ReactNode;
}

export default function DashboardCard({
  title,
  value,
  icon = "bi-calendar3",
  loading = false,
  footer,
}: Props) {
  return (
    <div className="card h-100">
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
          <i className={`bi ${icon} text-muted fs-4`} />
        </div>
        {footer && (
          <small className="text-muted mt-2 d-block">{footer}</small>
        )}
      </div>
    </div>
  );
}
