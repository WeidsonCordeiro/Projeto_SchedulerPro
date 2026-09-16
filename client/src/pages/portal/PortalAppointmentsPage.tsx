import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import type { PortalAppointment } from "../../types/appointment";

type Filter = "all" | "upcoming" | "past";

export default function PortalAppointmentsPage() {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await appointmentsApi.getMyAppointments();
      setAppointments(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const visibleAppointments = useMemo(() => {
    const now = DateTime.now().toMillis();
    const filtered = appointments.filter((appointment) => {
      const start = DateTime.fromISO(appointment.startAt).toMillis();
      if (filter === "upcoming") {
        return start >= now;
      }
      if (filter === "past") {
        return start < now;
      }
      return true;
    });

    return filtered.sort(
      (a, b) =>
        DateTime.fromISO(b.startAt).toMillis() -
        DateTime.fromISO(a.startAt).toMillis(),
    );
  }, [appointments, filter]);

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">Meus agendamentos</h1>
        <div className="btn-group" role="group" aria-label="Filtrar agendamentos">
          <button
            type="button"
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter("all")}
          >
            Todos
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "upcoming" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter("upcoming")}
          >
            Próximos
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "past" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setFilter("past")}
          >
            Passados
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => void loadAppointments()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && visibleAppointments.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="mb-0 text-muted">Nenhum agendamento encontrado.</p>
          </div>
        </div>
      )}

      {!isLoading && !loadError && visibleAppointments.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">Serviço</th>
                <th scope="col">Funcionário</th>
                <th scope="col">Data</th>
                <th scope="col">Hora</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {visibleAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.serviceName ?? "—"}</td>
                  <td>{appointment.employeeName ?? "—"}</td>
                  <td>{formatAppointmentDate(appointment.startAt)}</td>
                  <td>{formatAppointmentTime(appointment.startAt)}</td>
                  <td>
                    <span
                      className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]}`}
                    >
                      {APPOINTMENT_STATUS_LABELS[appointment.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}