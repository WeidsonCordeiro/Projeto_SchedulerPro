import { useCallback, useEffect, useState } from "react";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AvailabilityExceptionFormModal from "./AvailabilityExceptionFormModal";
import DeleteAvailabilityExceptionModal from "./DeleteAvailabilityExceptionModal";
import {
  EXCEPTION_TYPE_LABELS,
  formatExceptionDate,
  formatExceptionPeriod,
} from "../../config/availabilityExceptions";
import type { AvailabilityException } from "../../types/availabilityException";

interface AvailabilityExceptionsSectionProps {
  employeeId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onSuccess: (message: string) => void;
}

/**
 * Gerencia as exceções de disponibilidade (bloqueios, férias e feriados) de um
 * funcionário. Seção autocontida: recebe o funcionário selecionado na página e
 * gerencia própria listagem, criação/edição/remoção e confirmações.
 */
export default function AvailabilityExceptionsSection({
  employeeId,
  canCreate,
  canUpdate,
  canDelete,
  onSuccess,
}: AvailabilityExceptionsSectionProps) {
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingException, setEditingException] =
    useState<AvailabilityException | null>(null);
  const [removingException, setRemovingException] =
    useState<AvailabilityException | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) {
      setExceptions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const response =
        await availabilityExceptionApi.getAvailabilityExceptions(employeeId);
      setExceptions(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
      setExceptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleCreate() {
    setEditingException(null);
    setIsModalOpen(true);
  }

  function handleEdit(exception: AvailabilityException) {
    setEditingException(exception);
    setIsModalOpen(true);
  }

  function handleSaved(message: string) {
    onSuccess(message);
    void load();
  }

  function handleDeleted() {
    onSuccess("Exceção de disponibilidade removida com sucesso.");
    void load();
    setRemovingException(null);
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 className="h6 mb-1">Exceções de disponibilidade</h2>
            <span className="small text-muted">
              Bloqueios pontuais, férias e feriados sobrepõem a disponibilidade
              semanal.
            </span>
          </div>

          {canCreate && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleCreate}
            >
              Nova exceção
            </button>
          )}
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="alert alert-danger py-2" role="alert">
            {loadError}
            <div className="mt-2">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => void load()}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {!isLoading && !loadError && exceptions.length === 0 && (
          <p className="text-muted mb-0">
            Nenhuma exceção cadastrada para este funcionário.
          </p>
        )}

        {!isLoading &&
          !loadError &&
          exceptions.length > 0 && (
            <ul className="list-group">
              {exceptions.map((exception) => (
                <li
                  key={exception.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-semibold">
                      {formatExceptionDate(exception.date)}
                      <span className="badge text-bg-secondary ms-2">
                        {EXCEPTION_TYPE_LABELS[exception.type] ?? exception.type}
                      </span>
                    </div>
                    <div className="small text-muted">
                      {exception.allDay ? "Dia inteiro" : formatExceptionPeriod(exception)}
                      {exception.reason ? ` — ${exception.reason}` : ""}
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleEdit(exception)}
                      >
                        Editar
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setRemovingException(exception)}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>

      <AvailabilityExceptionFormModal
        isOpen={isModalOpen}
        employeeId={employeeId}
        exception={editingException}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />

      <DeleteAvailabilityExceptionModal
        isOpen={removingException != null}
        exception={removingException}
        onClose={() => setRemovingException(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}