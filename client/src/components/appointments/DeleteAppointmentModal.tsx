import { useState } from "react";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
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
  const timezone = useAppSelector(selectCompanyTimezone);
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
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !appointment) {
    return null;
  }

  const summary = [
    clientName?.trim() || null,
    formatAppointmentDate(appointment.startAt, timezone),
    formatAppointmentTime(appointment.startAt, timezone),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir agendamento"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir este agendamento?</p>
      <p className="fw-semibold mb-0">{summary}</p>
    </DestructiveConfirmModal>
  );
}
