import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import publicAppointmentsApi from "../../api/endpoints/publicAppointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { ApiFailure } from "../../api/errors";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import PageHeader from "../../components/common/PageHeader";
import PublicAppointmentCancelDialog from "../../components/public/PublicAppointmentCancelDialog";
import PublicAppointmentEditForm from "../../components/public/PublicAppointmentEditForm";
import PublicAppointmentSummary from "../../components/public/PublicAppointmentSummary";
import {
  getPublicAppointmentLoadFailure,
  getPublicAppointmentWriteMessage,
  isPublicAppointmentEditable,
  isPublicAppointmentNotEditableFailure,
  PUBLIC_APPOINTMENT_INVALID_LINK_MESSAGE,
  PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE,
  PUBLIC_APPOINTMENT_NOT_FOUND_DESCRIPTION,
  PUBLIC_APPOINTMENT_NOT_FOUND_MESSAGE,
  PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE,
  PUBLIC_APPOINTMENT_SUCCESS_MESSAGES,
} from "../../config/publicAppointment";
import type { PublicAppointment } from "../../types/publicAppointment";
import type { UpdatePublicAppointmentPayload } from "../../types/publicAppointment";

/**
 * Página pública do agendamento, em `/agendar/:token`.
 *
 * É a página de quem não tem conta: sem `AppLayout`, sem `Navbar`, sem
 * `Sidebar` e sem guards. A rota é pública por desenho — o token é a
 * credencial, e exigi-la no login seria pedir ao cliente uma conta que não
 * existe.
 *
 * O token nunca sai daqui: é lido do `useParams` e usado apenas como
 * argumento das três chamadas. Não vai para o Redux, nem para
 * localStorage/sessionStorage, nem para os componentes filhos (que recebem o
 * agendamento e callbacks, não a credencial). O Redux global continua a ser
 * do utilizador autenticado — o qual, mesmo com uma sessão administrativa
 * aberta, não influencia esta página em nada.
 *
 * As duas escritas seguem a mesma regra: nada é otimista, a resposta do
 * servidor é o novo estado, e uma falha nunca apaga o que a pessoa escreveu.
 */

interface LoadIssue {
  title: string;
  description?: string;
  /** Só faz sentido repetir o pedido em falhas transitórias. */
  retryable: boolean;
}

/** Traduz uma falha HTTP da consulta inicial para o bloco a apresentar. */
function toLoadIssue(failure: ApiFailure): LoadIssue {
  const kind = getPublicAppointmentLoadFailure(failure);

  if (kind === "not_found") {
    return {
      title: PUBLIC_APPOINTMENT_NOT_FOUND_MESSAGE,
      description: PUBLIC_APPOINTMENT_NOT_FOUND_DESCRIPTION,
      retryable: false,
    };
  }

  if (kind === "rate_limited") {
    return { title: PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE, retryable: true };
  }

  return { title: getFriendlyErrorMessage(failure), retryable: true };
}

/** Texto exibido quando o agendamento já não aceita alterações. */
function getReadOnlyMessage(appointment: PublicAppointment): string {
  switch (appointment.status) {
    case "cancelled":
      return "Este agendamento está cancelado.";
    case "completed":
    case "no-show":
      return "Este agendamento já terminou e não pode ser alterado.";
    default:
      return PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE;
  }
}

export default function PublicAppointmentPage() {
  const { token } = useParams();

  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState<LoadIssue | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  /** Trava de edição decidida pelo servidor após uma recusa. */
  const [isRejectedByServer, setIsRejectedByServer] = useState(false);

  const loadAppointment = useCallback(async () => {
    if (!token) {
      setLoadIssue({
        title: PUBLIC_APPOINTMENT_INVALID_LINK_MESSAGE,
        description: PUBLIC_APPOINTMENT_NOT_FOUND_DESCRIPTION,
        retryable: false,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadIssue(null);

    try {
      const response = await publicAppointmentsApi.getByToken(token);
      if (!response.data) {
        throw new Error("Resposta inválida do servidor.");
      }
      setAppointment(response.data);
      setIsRejectedByServer(false);
    } catch (error) {
      setLoadIssue(toLoadIssue(getApiError(error)));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  const isEditable = useMemo(
    () =>
      !isRejectedByServer &&
      appointment !== null &&
      isPublicAppointmentEditable(appointment),
    [appointment, isRejectedByServer],
  );

  function openEdit() {
    setIsEditing(true);
    setSaveError(null);
    setSuccessMessage(null);
  }

  function closeEdit() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleSave(payload: UpdatePublicAppointmentPayload) {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await publicAppointmentsApi.updateByToken(token, payload);
      if (!response.data) {
        throw new Error("Resposta inválida do servidor.");
      }
      setAppointment(response.data);
      setIsEditing(false);
      setSuccessMessage(PUBLIC_APPOINTMENT_SUCCESS_MESSAGES.updated);
    } catch (error) {
      const failure = getApiError(error);
      setSaveError(getPublicAppointmentWriteMessage(failure));
      if (isPublicAppointmentNotEditableFailure(failure)) {
        setIsRejectedByServer(true);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function openCancelDialog() {
    setIsCancelDialogOpen(true);
    setCancelError(null);
  }

  /** Não fecha a caixa a meio de um cancelamento já enviado. */
  const closeCancelDialog = useCallback(() => {
    if (isCancelling) {
      return;
    }
    setIsCancelDialogOpen(false);
    setCancelError(null);
  }, [isCancelling]);

  async function handleConfirmCancel() {
    if (!token) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await publicAppointmentsApi.cancelByToken(token);
      if (!response.data) {
        throw new Error("Resposta inválida do servidor.");
      }
      setAppointment(response.data);
      setIsCancelDialogOpen(false);
      setIsEditing(false);
      setSuccessMessage(PUBLIC_APPOINTMENT_SUCCESS_MESSAGES.cancelled);
    } catch (error) {
      const failure = getApiError(error);
      setCancelError(getPublicAppointmentWriteMessage(failure));
      if (isPublicAppointmentNotEditableFailure(failure)) {
        setIsRejectedByServer(true);
      }
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="public-shell">
      <div className="public-brand">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>SchedulerPro</span>
      </div>

      <main className="public-content public-appointment">
        <PageHeader
          title="Seu agendamento"
          description="Consulte, altere ou cancele o seu atendimento."
        />

        {isLoading && <LoadingState label="A carregar o seu agendamento…" />}

        {!isLoading && loadIssue && (
          <>
            {loadIssue.retryable ? (
              <ErrorState
                message={loadIssue.title}
                onRetry={() => void loadAppointment()}
              />
            ) : (
              <EmptyState
                title={loadIssue.title}
                description={loadIssue.description}
                icon="!"
              />
            )}
          </>
        )}

        {!isLoading && !loadIssue && appointment && (
          <>
            {successMessage && (
              <div className="alert alert-success" role="status">
                {successMessage}
              </div>
            )}

            {isEditing ? (
              <PublicAppointmentEditForm
                isSaving={isSaving}
                errorMessage={saveError}
                onSave={(payload) => void handleSave(payload)}
                onCancel={closeEdit}
              />
            ) : (
              <>
                <PublicAppointmentSummary appointment={appointment} />

                <div className="public-appointment-actions">
                  {isEditable ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openEdit}
                      >
                        Alterar agendamento
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={openCancelDialog}
                      >
                        Cancelar agendamento
                      </button>
                    </>
                  ) : (
                    <p className="public-form-note mb-0">
                      {getReadOnlyMessage(appointment)}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <p className="public-footer">
        Página pública de agendamento · SchedulerPro
      </p>

      {appointment && (
        <PublicAppointmentCancelDialog
          isOpen={isCancelDialogOpen}
          appointment={appointment}
          isCancelling={isCancelling}
          errorMessage={cancelError}
          onConfirm={() => void handleConfirmCancel()}
          onClose={closeCancelDialog}
        />
      )}
    </div>
  );
}