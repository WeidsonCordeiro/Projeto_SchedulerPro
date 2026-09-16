import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { useAppSelector } from "../../store";
import type { PortalAppointment } from "../../types/appointment";

export default function PortalHomePage() {
  const user = useAppSelector((state) => state.auth.user);

  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const nextAppointments = useMemo(() => {
    const now = DateTime.now().toMillis();
    return appointments
      .filter((appointment) => DateTime.fromISO(appointment.endAt).toMillis() >= now)
      .sort(
        (a, b) =>
          DateTime.fromISO(a.startAt).toMillis() -
          DateTime.fromISO(b.startAt).toMillis(),
      )
      .slice(0, 3);
  }, [appointments]);

  return (
    <section>
      <h1 className="h3 mb-1">Olá, {user?.name}</h1>
      <p className="text-muted">Bem-vindo(a) ao seu portal de agendamentos.</p>

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

      {!isLoading && !loadError && (
        <div className="row g-3">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Próximos agendamentos</span>
                <Link to="/portal/agendamentos" className="btn btn-sm btn-outline-primary">
                  Ver todos
                </Link>
              </div>
              <div className="card-body">
                {nextAppointments.length === 0 ? (
                  <p className="mb-0 text-muted">
                    Você não possui agendamentos futuros por agora.
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {nextAppointments.map((appointment) => (
                      <li
                        key={appointment.id}
                        className="list-group-item d-flex justify-content-between align-items-start gap-3"
                      >
                        <div>
                          <div className="fw-semibold">
                            {appointment.serviceName ?? "Serviço"}
                          </div>
                          <div className="text-muted small">
                            {formatAppointmentDate(appointment.startAt)} às{" "}
                            {formatAppointmentTime(appointment.startAt)} ·{" "}
                            {appointment.employeeName ?? "Funcionário"}
                          </div>
                        </div>
                        <span
                          className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]}`}
                        >
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header fw-semibold">Acesso rápido</div>
              <div className="card-body d-flex flex-column gap-2">
                <Link
                  to="/portal/agendamentos"
                  className="btn btn-outline-primary"
                >
                  Meus agendamentos
                </Link>
                <Link to="/portal/perfil" className="btn btn-outline-secondary">
                  Meu perfil
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}