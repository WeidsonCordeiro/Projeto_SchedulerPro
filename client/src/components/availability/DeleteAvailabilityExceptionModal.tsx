import { useState } from "react";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  formatExceptionDate,
  formatExceptionPeriod,
} from "../../config/availabilityExceptions";
import type { AvailabilityException } from "../../types/availabilityException";

interface DeleteAvailabilityExceptionModalProps {
  isOpen: boolean;
  exception: AvailabilityException | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAvailabilityExceptionModal({
  isOpen,
  exception,
  onClose,
  onDeleted,
}: DeleteAvailabilityExceptionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!exception) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await availabilityExceptionApi.deleteAvailabilityException(exception.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !exception) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">Excluir exceção de disponibilidade</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isDeleting}
            />
          </div>

          <div className="modal-body">
            <p>Tem certeza que deseja excluir esta exceção?</p>
            <p className="fw-semibold mb-0">
              {formatExceptionDate(exception.date)}
              {" — "}
              {formatExceptionPeriod(exception)}
            </p>

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
              onClick={handleConfirm}
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