import { useState } from "react";
import availabilityApi from "../../api/endpoints/availability.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
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
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !availability) {
    return null;
  }

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir disponibilidade"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir esta disponibilidade?</p>
      <p className="fw-semibold mb-0">{dayLabel}</p>
    </DestructiveConfirmModal>
  );
}
