import { useState } from "react";
import availabilityApi from "../../api/endpoints/availability.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { Availability } from "../../types/availability";

interface DeleteAvailabilityDayModalProps {
  isOpen: boolean;
  availability: Availability | null;
  dayLabel: string;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAvailabilityDayModal({
  isOpen,
  availability,
  dayLabel,
  onClose,
  onDeleted,
}: DeleteAvailabilityDayModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!availability) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await availabilityApi.deleteAvailability(availability.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      setIsDeleting(false);
    }
  }

  if (!isOpen || !availability) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">Excluir disponibilidade</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={onClose}
              disabled={isDeleting}
            />
          </div>

          <div className="modal-body">
            <p>Tem certeza que deseja excluir esta disponibilidade?</p>
            <p className="fw-semibold mb-0">{dayLabel}</p>

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