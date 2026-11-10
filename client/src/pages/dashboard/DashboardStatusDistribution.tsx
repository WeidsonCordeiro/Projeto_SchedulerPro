import type { AppointmentStatus } from "../../types/appointment";
import {
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";

export const DASHBOARD_STATUS_DISTRIBUTION_ORDER: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

/**
 * Classes `bg-*` para barras Bootstrap, alinhadas às cores de
 * APPOINTMENT_STATUS_BADGE_CLASS (text-bg-* não se aplica a progress-bar).
 */
export const APPOINTMENT_STATUS_PROGRESS_BAR_CLASS: Record<
  AppointmentStatus,
  string
> = {
  scheduled: "bg-primary",
  confirmed: "bg-info",
  completed: "bg-success",
  cancelled: "bg-secondary",
  "no-show": "bg-warning",
};

export function statusDistributionBarWidthPercent(
  count: number,
  total: number,
): number {
  if (total <= 0 || count <= 0 || !Number.isFinite(count) || !Number.isFinite(total)) {
    return 0;
  }
  const percent = (count / total) * 100;
  return Math.min(100, Math.max(0, percent));
}

export interface DashboardStatusDistributionPeriod {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
}

interface Props {
  period: DashboardStatusDistributionPeriod;
}

function formatCount(value: number): string {
  return value.toLocaleString("pt-PT", { maximumFractionDigits: 0 });
}

export default function DashboardStatusDistribution({ period }: Props) {
  const { total, byStatus } = period;

  return (
    <div
      className="card dashboard-status-distribution"
      data-testid="dashboard-status-distribution"
    >
      <div className="card-body">
        <h3 className="h6 mb-1">Distribuição por estado</h3>
        <p className="text-muted small mb-3">
          Contagens do dia no período reportado pela API.
        </p>
        {total === 0 && (
          <p
            className="text-muted small mb-3 mb-md-2"
            data-testid="dashboard-status-distribution-empty"
          >
            Sem agendamentos no período.
          </p>
        )}
        <ul className="list-unstyled dashboard-status-distribution-list mb-0">
          {DASHBOARD_STATUS_DISTRIBUTION_ORDER.map((status) => {
            const count = byStatus[status] ?? 0;
            const widthPercent = statusDistributionBarWidthPercent(count, total);
            const badgeClass = APPOINTMENT_STATUS_BADGE_CLASS[status];
            const barClass = APPOINTMENT_STATUS_PROGRESS_BAR_CLASS[status];

            return (
              <li
                key={status}
                className="dashboard-status-distribution-row"
                data-testid={`dashboard-status-row-${status}`}
              >
                <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                  <span className="dashboard-status-distribution-label">
                    <span
                      className={`badge status-badge-80 ${badgeClass}`}
                      data-testid={`dashboard-status-label-${status}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[status]}
                    </span>
                  </span>
                  <span
                    className="dashboard-status-distribution-count fw-semibold"
                    data-testid={`dashboard-status-count-${status}`}
                  >
                    {formatCount(count)}
                  </span>
                </div>
                <div
                  className="progress dashboard-status-distribution-progress"
                  role="presentation"
                >
                  <div
                    className={`progress-bar ${barClass}`}
                    role="progressbar"
                    data-testid={`dashboard-status-bar-${status}`}
                    style={{ width: `${widthPercent}%` }}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={total > 0 ? total : 0}
                    aria-label={`${APPOINTMENT_STATUS_LABELS[status]}: ${formatCount(count)}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
