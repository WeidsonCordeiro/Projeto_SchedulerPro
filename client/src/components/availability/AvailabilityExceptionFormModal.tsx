import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  EXCEPTION_TYPE_LABELS,
  toExceptionPayload,
  validateExceptionForm,
} from "../../config/availabilityExceptions";
import type {
  AvailabilityException,
  AvailabilityExceptionType,
} from "../../types/availabilityException";

interface AvailabilityExceptionFormModalProps {
  isOpen: boolean;
  employeeId: string;
  exception: AvailabilityException | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function AvailabilityExceptionFormModal({
  isOpen,
  employeeId,
  exception,
  onClose,
  onSaved,
}: AvailabilityExceptionFormModalProps) {
  const isEdit = Boolean(exception);

  const [date, setDate] = useState(exception?.date ?? "");
  const [allDay, setAllDay] = useState(exception?.allDay ?? false);
  const [startTime, setStartTime] = useState(exception?.startTime ?? "");
  const [endTime, setEndTime] = useState(exception?.endTime ?? "");
  const [type, setType] = useState<AvailabilityExceptionType>(
    exception?.type ?? "BLOCK",
  );
  const [reason, setReason] = useState(exception?.reason ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(exception?.date ?? "");
      setAllDay(exception?.allDay ?? false);
      setStartTime(exception?.startTime ?? "");
      setEndTime(exception?.endTime ?? "");
      setType(exception?.type ?? "BLOCK");
      setReason(exception?.reason ?? "");
      setFormError(null);
    }
  }, [isOpen, exception]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const clientError = validateExceptionForm({
      date,
      allDay,
      startTime,
      endTime,
      type,
      reason,
    });
    if (clientError) {
      setFormError(clientError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...toExceptionPayload({ date, allDay, startTime, endTime, type, reason }) };
      if (isEdit && exception) {
        await availabilityExceptionApi.updateAvailabilityException(exception.id, payload);
        onSaved("Exceção de disponibilidade atualizada com sucesso.");
      } else {
        await availabilityExceptionApi.createAvailabilityException({
          employeeId,
          ...payload,
        });
        onSaved("Exceção de disponibilidade criada com sucesso.");
      }
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setFormError(getFriendlyErrorMessage(failure));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">
              {isEdit ? "Editar exceção de disponibilidade" : "Nova exceção de disponibilidade"}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isSaving}
            />
          </div>

          <div className="modal-body">
            {formError && (
              <div className="alert alert-danger" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="exception-date" className="form-label">
                  Data
                </label>
                <input
                  id="exception-date"
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              <div className="mb-3">
                <span className="form-label d-block">Tipo</span>
                <div>
                  {(Object.keys(EXCEPTION_TYPE_LABELS) as AvailabilityExceptionType[]).map(
                    (option) => (
                      <div className="form-check form-check-inline" key={option}>
                        <input
                          id={`exception-type-${option}`}
                          className="form-check-input"
                          type="radio"
                          name="exception-type"
                          value={option}
                          checked={type === option}
                          onChange={() => setType(option)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`exception-type-${option}`}
                        >
                          {EXCEPTION_TYPE_LABELS[option]}
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="form-check form-switch mb-3">
                <input
                  id="exception-allday"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                />
                <label className="form-check-label" htmlFor="exception-allday">
                  Dia inteiro
                </label>
              </div>

              {!allDay && (
                <div className="row g-3 mb-3">
                  <div className="col">
                    <label htmlFor="exception-start" className="form-label">
                      Início
                    </label>
                    <input
                      id="exception-start"
                      type="time"
                      className="form-control"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </div>
                  <div className="col">
                    <label htmlFor="exception-end" className="form-label">
                      Fim
                    </label>
                    <input
                      id="exception-end"
                      type="time"
                      className="form-control"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="exception-reason" className="form-label">
                  Motivo (opcional)
                </label>
                <textarea
                  id="exception-reason"
                  className="form-control"
                  rows={2}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>

              <div className="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {isSaving ? "Salvando..." : isEdit ? "Salvar" : "Criar exceção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}