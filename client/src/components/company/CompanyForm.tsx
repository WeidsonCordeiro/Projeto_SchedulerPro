import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import companyApi from "../../api/endpoints/company.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import { getIanaTimezones, isValidIanaTimezone } from "../../config/timezones";
import type { Company, UpdateCompanyPayload } from "../../types/company";

interface FieldErrors {
  name?: string;
  timezone?: string;
}

interface CompanyFormProps {
  company: Company;
  onSaved: (company: Company) => void;
}

const NAME_MIN = 3;
const NAME_MAX = 120;

function validate(name: string, timezone: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = "O nome da empresa é obrigatório.";
  } else if (name.trim().length < NAME_MIN || name.trim().length > NAME_MAX) {
    errors.name = `O nome deve possuir entre ${NAME_MIN} e ${NAME_MAX} caracteres.`;
  }

  if (!timezone.trim()) {
    errors.timezone = "O timezone é obrigatório.";
  } else if (!isValidIanaTimezone(timezone.trim())) {
    errors.timezone = "Timezone IANA inválido.";
  }

  return errors;
}

export default function CompanyForm({ company, onSaved }: CompanyFormProps) {
  const [name, setName] = useState(company.name);
  const [timezone, setTimezone] = useState(company.timezone);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const zones = useMemo(() => getIanaTimezones(), []);

  // Preserva o valor real devolvido pelo backend mesmo que não esteja na
  // lista atual do runtime (ex.: zona legada), evitando texto arbitrário.
  const timezoneOptions = useMemo(() => {
    if (zones.includes(company.timezone)) {
      return zones;
    }
    return [company.timezone, ...zones];
  }, [zones, company.timezone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(name, timezone);
    setFieldErrors(errors);

    if (errors.name || errors.timezone) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateCompanyPayload = {
        name: name.trim(),
        timezone: timezone.trim(),
      };
      const response = await companyApi.updateCompany(company.id, payload);
      const saved = response.data;
      if (saved) {
        onSaved(saved);
      }
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="company-name" className="form-label">
          Nome
        </label>
        <input
          id="company-name"
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
        <label htmlFor="company-timezone" className="form-label">
          Timezone
        </label>
        <select
          id="company-timezone"
          className={`form-select ${fieldErrors.timezone ? "is-invalid" : ""}`}
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
        >
          {timezoneOptions.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {fieldErrors.timezone && (
          <div className="invalid-feedback">{fieldErrors.timezone}</div>
        )}
        <div className="form-text">
          Fuso horário da empresa (padrão IANA). Todos os horários de
          agendamento são interpretados neste fuso.
        </div>
      </div>

      <div className="d-grid d-sm-block">
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
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
