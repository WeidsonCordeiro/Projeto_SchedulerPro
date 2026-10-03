import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  BOOKING_EMAIL_MAX_LENGTH,
  BOOKING_NAME_MAX_LENGTH,
  BOOKING_NOTES_MAX_LENGTH,
  BOOKING_PHONE_MAX_LENGTH,
  isClientDetailsValid,
  validateClientDetails,
} from "../../../config/publicBooking";
import type {
  ClientDetailsErrors,
  ClientDetailsInput,
} from "../../../config/publicBooking";

interface BookingClientDetailsFormProps {
  value: ClientDetailsInput;
  onChange: (value: ClientDetailsInput) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Dados de contacto de quem marca.
 *
 * Os erros só aparecem depois de o campo ser tocado, e o formulário valida pelo
 * `onBlur` de cada campo: mostrar "o e-mail é obrigatório" na primeira tecla de
 * um campo vazio é um sistema a validar antes de o utilizador ter escrito nada.
 *
 * A validação local replica as regras do backend para dar o erro no campo certo
 * (ver `validateClientDetails`). Na submissão, se algo escapar, o 400 do
 * servidor é apresentado sem deixar de avançar — é a autoridade.
 */
export default function BookingClientDetailsForm({
  value,
  onChange,
  onSubmit,
  onBack,
}: BookingClientDetailsFormProps) {
  const fieldId = useId();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<ClientDetailsErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Foco no formulário quando se chega a esta etapa.
   *
   * A etapa anterior é substituída por este formulário, e com ela desaparece o
   * botão que a abriu. Sem isto, quem navega por teclado ficaria com o foco
   * perdido no fim do documento. Vai para o formulário — não para o primeiro
   * campo — para anunciar a etapa sem lançar o utilizador direto numa caixa de
   * escrita.
   */
  useEffect(() => {
    formRef.current?.focus();
  }, []);

  function update(field: keyof ClientDetailsInput, next: string) {
    const updated = { ...value, [field]: next };
    onChange(updated);
    if (touched[field]) {
      setErrors(validateClientDetails(updated));
    }
  }

  function handleBlur(field: keyof ClientDetailsInput) {
    setTouched((previous) => ({ ...previous, [field]: true }));
    setErrors(validateClientDetails(value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateClientDetails(value);
    setErrors(found);
    // Marca tudo como tocado para que, havendo erro, ele fique visível.
    setTouched({
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
    });
    if (isClientDetailsValid(found)) {
      onSubmit();
    }
  }

  const id = (name: string) => `${fieldId}-${name}`;

  return (
    <form
      ref={formRef}
      tabIndex={-1}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Os seus dados"
      className="booking-form"
    >
      <h3 className="booking-section-title">Os seus dados</h3>

      <div className="booking-field">
        <label className="form-label" htmlFor={id("name")}>
          Nome
        </label>
        <input
          id={id("name")}
          className={`form-control${errors.clientName ? " is-invalid" : ""}`}
          type="text"
          value={value.clientName}
          maxLength={BOOKING_NAME_MAX_LENGTH}
          autoComplete="name"
          onChange={(event) => update("clientName", event.target.value)}
          onBlur={() => handleBlur("clientName")}
        />
        {errors.clientName && (
          <div className="invalid-feedback">{errors.clientName}</div>
        )}
      </div>

      <div className="booking-field">
        <label className="form-label" htmlFor={id("email")}>
          E-mail
        </label>
        <input
          id={id("email")}
          className={`form-control${errors.clientEmail ? " is-invalid" : ""}`}
          type="email"
          value={value.clientEmail}
          maxLength={BOOKING_EMAIL_MAX_LENGTH}
          autoComplete="email"
          onChange={(event) => update("clientEmail", event.target.value)}
          onBlur={() => handleBlur("clientEmail")}
        />
        {errors.clientEmail && (
          <div className="invalid-feedback">{errors.clientEmail}</div>
        )}
      </div>

      <div className="booking-field">
        <label className="form-label" htmlFor={id("phone")}>
          Telefone <span className="text-muted">(opcional)</span>
        </label>
        <input
          id={id("phone")}
          className={`form-control${
            errors.clientPhone ? " is-invalid" : ""
          }`}
          type="tel"
          value={value.clientPhone}
          maxLength={BOOKING_PHONE_MAX_LENGTH}
          autoComplete="tel"
          onChange={(event) => update("clientPhone", event.target.value)}
          onBlur={() => handleBlur("clientPhone")}
        />
        {errors.clientPhone && (
          <div className="invalid-feedback">{errors.clientPhone}</div>
        )}
      </div>

      <div className="booking-field">
        <label className="form-label" htmlFor={id("notes")}>
          Observações <span className="text-muted">(opcional)</span>
        </label>
        <textarea
          id={id("notes")}
          className={`form-control${errors.notes ? " is-invalid" : ""}`}
          rows={3}
          value={value.notes}
          maxLength={BOOKING_NOTES_MAX_LENGTH}
          onChange={(event) => update("notes", event.target.value)}
          onBlur={() => handleBlur("notes")}
        />
        {errors.notes && (
          <div className="invalid-feedback">{errors.notes}</div>
        )}
      </div>

      <div className="d-flex flex-column flex-sm-row gap-2">
        {/*
          O botão nunca é desativado por haver erros. Desativá-lo deixaria o
          formulário sem forma de explicar PORQUÊ não avança — e, num campo
          tocado com erro, o utilizador ficaria preso sem botão funcional.
          A validação corre na submissão e pinta os campos.
        */}
        <button type="submit" className="btn btn-primary flex-grow-1">
          Continuar
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          Voltar
        </button>
      </div>
    </form>
  );
}