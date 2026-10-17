import { useState } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
import type { Client } from "../../types/client";

interface DeleteClientModalProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteClientModal({
  isOpen,
  client,
  onClose,
  onDeleted,
}: DeleteClientModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!client) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await clientsApi.deleteClient(client.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !client) {
    return null;
  }

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir cliente"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir este cliente?</p>
      <p className="fw-semibold mb-0">{client.name}</p>
    </DestructiveConfirmModal>
  );
}
