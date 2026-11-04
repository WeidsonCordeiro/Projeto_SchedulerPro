import { useState } from "react";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import DestructiveConfirmModal from "../common/DestructiveConfirmModal";
import type { Employee } from "../../types/employee";

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteEmployeeModal({
  isOpen,
  employee,
  onClose,
  onDeleted,
}: DeleteEmployeeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!employee) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await employeesApi.deleteEmployee(employee.id);
      onDeleted();
      onClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen || !employee) {
    return null;
  }

  return (
    <DestructiveConfirmModal
      isOpen={isOpen}
      title="Excluir funcionário"
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      isSubmitting={isDeleting}
      errorMessage={errorMessage}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
    >
      <p>Tem certeza que deseja excluir este funcionário?</p>
      <p className="fw-semibold mb-0">{employee.name}</p>
    </DestructiveConfirmModal>
  );
}
