import { useEffect, useRef } from "react";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
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
 * Modal próprio (mesmo markup de `DeleteAppointmentModal`), com o foco a
 * entrar no botão de dispensar — a ação destrutiva nunca é o foco inicial —
 * e `Escape` a fechar enquanto não há pedido em curso.
 */
export default function PublicAppointmentCancelDialog({
  isOpen,
  appointment,
  isCancelling,
  errorMessage,
  onConfirm,
  onClose,
}: PublicAppointmentCancelDialogProps) {
  const dismissButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      dismissButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCancelling) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCancelling, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={DESCRIPTION_ID}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 id={TITLE_ID} className="modal-title h5">
              Cancelar agendamento
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isCancelling}
            />
          </div>

          <div className="modal-body">
            <p id={DESCRIPTION_ID} className="mb-3">
              Tem certeza de que deseja cancelar este agendamento? Esta ação
              não pode ser revertida.
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
                <dd>{formatAppointmentDate(appointment.startAt)}</dd>
              </div>
              <div className="public-summary-row">
                <dt>Horário</dt>
                <dd>
                  {formatAppointmentTime(appointment.startAt)}
                  {" – "}
                  {formatAppointmentTime(appointment.endAt)}
                </dd>
              </div>
            </dl>

            {errorMessage && (
              <div className="alert alert-danger mt-3" role="alert">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              ref={dismissButtonRef}
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={isCancelling}
            >
              Manter agendamento
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={isCancelling}
            >
              {isCancelling && (
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
              )}
              {isCancelling ? "A cancelar..." : "Sim, cancelar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}