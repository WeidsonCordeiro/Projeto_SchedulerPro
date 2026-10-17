import { useState } from "react";
import servicesApi from "../../api/endpoints/services.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
import type { Service } from "../../types/service";

interface DeleteServiceModalProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteServiceModal({
  isOpen,
  service,
  onClose,
  onDeleted,
}: DeleteServiceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!service) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await servicesApi.deleteService(service.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !service) {
    return null;
  }

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir serviço"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir este serviço?</p>
      <p className="fw-semibold mb-0">{service.name}</p>
    </DestructiveConfirmModal>
  );
}
