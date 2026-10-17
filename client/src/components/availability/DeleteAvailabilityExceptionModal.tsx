import { useState } from "react";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  formatExceptionDate,
  formatExceptionPeriod,
} from "../../config/availabilityExceptions";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
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
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir exceção de disponibilidade"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir esta exceção?</p>
      <p className="fw-semibold mb-0">
        {formatExceptionDate(exception.date)}
        {" — "}
        {formatExceptionPeriod(exception)}
      </p>
    </DestructiveConfirmModal>
  );
}
