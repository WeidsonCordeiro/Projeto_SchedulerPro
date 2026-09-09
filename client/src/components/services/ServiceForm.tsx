import { useState } from "react";
import type { FormEvent } from "react";
import servicesApi from "../../api/endpoints/services.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { Service } from "../../types/service";

interface FieldErrors {
  name?: string;
  description?: string;
  duration?: string;
  price?: string;
}

interface ServiceFormProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSaved: (service: Service) => void;
}

const MIN_DURATION = 5;

function parseDecimal(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function validate(
  name: string,
  description: string,
  duration: string,
  price: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = "O nome do serviço é obrigatório.";
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.name = "O nome deve ter entre 2 e 100 caracteres.";
  }

  if (description.length > 500) {
    errors.description = "A descrição deve ter no máximo 500 caracteres.";
  }

  if (!duration.trim()) {
    errors.duration = "A duração do serviço é obrigatória.";
  } else {
    const durationValue = Number(duration.trim());
    if (
      !Number.isInteger(durationValue) ||
      durationValue < MIN_DURATION
    ) {
      errors.duration = `A duração deve ser um número inteiro maior ou igual a ${MIN_DURATION} minutos.`;
    }
  }

  if (!price.trim()) {
    errors.price = "O preço do serviço é obrigatório.";
  } else {
    const priceValue = parseDecimal(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      errors.price = "O preço deve ser um número maior ou igual a zero.";
    }
  }

  return errors;
}

export default function ServiceForm({
  isOpen,
  service,
  onClose,
  onSaved,
}: ServiceFormProps) {
  const isEdit = Boolean(service);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(
    service ? String(service.duration) : "",
  );
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(name, description, duration, price);
    setFieldErrors(errors);

    if (errors.name || errors.description || errors.duration || errors.price) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        duration: Number(duration.trim()),
        price: parseDecimal(price),
      };
      const response = isEdit
        ? await servicesApi.updateService(service!.id, payload)
        : await servicesApi.createService(payload);
      const saved = response.data;
      if (saved) {
        onSaved(saved);
      }
      handleClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">
              {isEdit ? "Editar serviço" : "Novo serviço"}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={handleClose}
            />
          </div>

          <div className="modal-body">
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="service-name" className="form-label">
                  Nome
                </label>
                <input
                  id="service-name"
                  type="text"
                  className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                {fieldErrors.name && (
                  <div className="invalid-feedback">{fieldErrors.name}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="service-description" className="form-label">
                  Descrição
                </label>
                <textarea
                  id="service-description"
                  className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                {fieldErrors.description && (
                  <div className="invalid-feedback">{fieldErrors.description}</div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="service-duration" className="form-label">
                    Duração (minutos)
                  </label>
                  <input
                    id="service-duration"
                    type="number"
                    min={MIN_DURATION}
                    step={1}
                    className={`form-control ${fieldErrors.duration ? "is-invalid" : ""}`}
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                  {fieldErrors.duration && (
                    <div className="invalid-feedback">{fieldErrors.duration}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="service-price" className="form-label">
                    Preço
                  </label>
                  <input
                    id="service-price"
                    type="number"
                    min={0}
                    step="0.01"
                    className={`form-control ${fieldErrors.price ? "is-invalid" : ""}`}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  {fieldErrors.price && (
                    <div className="invalid-feedback">{fieldErrors.price}</div>
                  )}
                </div>
              </div>

              <div className="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting
                    ? isEdit
                      ? "Salvando..."
                      : "Criando..."
                    : isEdit
                      ? "Salvar"
                      : "Criar serviço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}