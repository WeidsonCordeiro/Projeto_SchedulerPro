import { useState } from "react";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import type { Appointment } from "../../types/appointment";

interface DeleteAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  clientName?: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAppointmentModal({
  isOpen,
  appointment,
  clientName,
  onClose,
  onDeleted,
}: DeleteAppointmentModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!appointment) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await appointmentsApi.deleteAppointment(appointment.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      setIsDeleting(false);
    }
  }

  if (!isOpen || !appointment) {
    return null;
  }

  const summary = [
    clientName?.trim() || null,
    formatAppointmentDate(appointment.startAt),
    formatAppointmentTime(appointment.startAt),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">Excluir agendamento</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isDeleting}
            />
          </div>

          <div className="modal-body">
            <p>Tem certeza que deseja excluir este agendamento?</p>
            <p className="fw-semibold mb-0">{summary}</p>

            {errorMessage && (
              <div className="alert alert-danger mt-3" role="alert">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void handleConfirm()}
              disabled={isDeleting}
            >
              {isDeleting && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {isDeleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}