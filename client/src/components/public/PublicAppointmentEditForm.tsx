import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH } from "../../config/publicAppointment";
import type { UpdatePublicAppointmentPayload } from "../../types/publicAppointment";

interface PublicAppointmentEditFormProps {
  isSaving: boolean;
  errorMessage: string | null;
  onSave: (payload: UpdatePublicAppointmentPayload) => void;
  onCancel: () => void;
}

const NOTES_INPUT_ID = "public-appointment-notes";
const NOTES_HINT_ID = "public-appointment-notes-hint";

/**
 * Formulário de alteração do agendamento público.
 *
 * Porque só há observações neste formulário: o contrato público do GET não
 * devolve listas de serviços, de profissionais nem de horários livres, e as
 * rotas que os devolvem são administrativas (exigem sessão e RBAC). Escolher
 * um serviço ou uma hora aqui seria escrever no escuro — o cliente seria
 * recitado com um 400 de "horário indisponível" sem nunca ter visto as
 * opções. O que o link permite, permite bem.
 *
 * O token não é recebido: o componente entrega um payload e a página trata
 * do pedido.
 */
export default function PublicAppointmentEditForm({
  isSaving,
  errorMessage,
  onSave,
  onCancel,
}: PublicAppointmentEditFormProps) {
  const [notes, setNotes] = useState("");
  const [isNotesTouched, setIsNotesTouched] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * O formulário substitui o resumo, e com ele desaparece o botão que o
   * abriu. Sem isto, quem navega por teclado ficaria a ler do fim do
   * documento. O foco vai para o formulário — e não para a caixa de texto —
   * para anunciar o seu nome sem saltar para um campo de escrita.
   */
  useEffect(() => {
    formRef.current?.focus();
  }, []);

  const remaining = PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH - notes.length;

  /**
   * Só envia `notes` quando o campo foi tocado.
   *
   * A resposta pública não inclui as observações existentes, por isso o
   * formulário começa vazio. Enviar `notes: null` a partir desse estado
   * apagaria o que a empresa tem sem o cliente ter pedido nada.
   */
  function buildPayload(): UpdatePublicAppointmentPayload {
    const trimmed = notes.trim();
    return { notes: trimmed === "" ? null : trimmed };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (notes.length > PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH) {
      setNotesError(
        `As observações devem ter no máximo ${PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH} caracteres.`,
      );
      return;
    }

    setNotesError(null);
    onSave(buildPayload());
  }

  const hasChanges = isNotesTouched;

  return (
    <form
      ref={formRef}
      tabIndex={-1}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Alterar agendamento"
    >
      <div className="mb-3">
        <label htmlFor={NOTES_INPUT_ID} className="form-label">
          Observações
        </label>
        <textarea
          id={NOTES_INPUT_ID}
          className={`form-control ${notesError ? "is-invalid" : ""}`}
          rows={3}
          value={notes}
          maxLength={PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH}
          disabled={isSaving}
          aria-describedby={`${NOTES_HINT_ID}${notesError ? " public-appointment-notes-error" : ""}`}
          onChange={(event) => {
            setIsNotesTouched(true);
            setNotes(event.target.value);
          }}
        />
        {notesError && (
          <div
            id="public-appointment-notes-error"
            className="invalid-feedback"
          >
            {notesError}
          </div>
        )}
        <div
          id={NOTES_HINT_ID}
          className={`form-text ${remaining < 50 ? "text-warning" : ""}`.trim()}
        >
          {remaining} caracteres restantes.
        </div>
      </div>

      <p className="public-form-note">
        Neste link, só as observações podem ser alteradas. Para mudar o
        serviço, o profissional ou a hora, fale com a empresa que marcou o
        agendamento.
      </p>

      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="d-flex flex-column flex-sm-row gap-2">
        <button
          type="submit"
          className="btn btn-primary flex-grow-1"
          disabled={isSaving || !hasChanges}
        >
          {isSaving && (
            <span
              className="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            />
          )}
          {isSaving ? "A guardar..." : "Guardar alterações"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Voltar
        </button>
      </div>
    </form>
  );
}