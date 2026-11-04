import {
  APPOINTMENT_TIMEZONE,
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import { isValidIanaTimezone } from "../../config/timezones";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
import type { PublicAppointment } from "../../types/publicAppointment";

interface PublicAppointmentCancelDialogProps {
  isOpen: boolean;
  appointment: PublicAppointment;
  isCancelling: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

const TITLE_ID = "public-appointment-cancel-title";
const DESCRIPTION_ID = "public-appointment-cancel-description";

/**
 * Confirmação de cancelamento.
 *
 * Cancelar é irreversível, portanto o primeiro clique só abre esta caixa: o
 * pedido só sai depois de uma confirmação explícita. O resumo do agendamento
 * vem junto para que a pessoa confirme que está a cancelar o atendimento
 * certo, e não outro qualquer.
 *
 * Composição sobre `DestructiveConfirmModal`, com o foco a entrar no botão de
 * dispensar — a ação destrutiva nunca é o foco inicial — e `Escape` a fechar
 * enquanto não há pedido em curso.
 */
export default function PublicAppointmentCancelDialog({
  isOpen,
  appointment,
  isCancelling,
  errorMessage,
  onConfirm,
  onClose,
}: PublicAppointmentCancelDialogProps) {
  const displayTimezone =
    appointment.timezone && isValidIanaTimezone(appointment.timezone)
      ? appointment.timezone
      : APPOINTMENT_TIMEZONE;

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Cancelar agendamento"
      titleId={TITLE_ID}
      descriptionId={DESCRIPTION_ID}
      onClose={onClose}
      onConfirm={onConfirm}
      isSubmitting={isCancelling}
      errorMessage={errorMessage}
      confirmLabel="Sim, cancelar"
      submittingLabel="A cancelar..."
      cancelLabel="Manter agendamento"
      cancelButtonVariant="outline-secondary"
      centered
      focusCancelOnOpen
      closeOnEscape
    >
      <p id={DESCRIPTION_ID} className="mb-3">
        Tem certeza de que deseja cancelar este agendamento? Esta ação não pode
        ser revertida.
      </p>

      <dl className="public-summary public-summary-compact mb-0">
        <div className="public-summary-row">
          <dt>Serviço</dt>
          <dd>{appointment.service.name}</dd>
        </div>
        <div className="public-summary-row">
          <dt>Profissional</dt>
          <dd>{appointment.employee.name}</dd>
        </div>
        <div className="public-summary-row">
          <dt>Data</dt>
          <dd>
            {formatAppointmentDate(appointment.startAt, displayTimezone)}
          </dd>
        </div>
        <div className="public-summary-row">
          <dt>Horário</dt>
          <dd>
            {formatAppointmentTime(appointment.startAt, displayTimezone)}
            {" – "}
            {formatAppointmentTime(appointment.endAt, displayTimezone)}
          </dd>
        </div>
      </dl>
    </DestructiveConfirmModal>
  );
}
