import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings } from "luxon";
import { useAppDispatch, useAppSelector } from "../store";
import { setCredentials, setLoading } from "../store/slices/authSlice";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";
import { getIanaTimezones, isValidIanaTimezone } from "../config/timezones";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  companyName?: string;
  companyTimezone?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIMEZONES = getIanaTimezones();

function getDefaultTimezone(): string {
  try {
    const local = Settings.defaultZone?.name;
    if (local && isValidIanaTimezone(local)) {
      return local;
    }
  } catch {
    // segue para o fallback
  }
  return "Europe/Lisbon";
}

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  companyName: string,
  companyTimezone: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = "O nome é obrigatório.";
  } else if (name.trim().length < 3 || name.trim().length > 120) {
    errors.name = "O nome deve ter entre 3 e 120 caracteres.";
  }

  if (!email.trim()) {
    errors.email = "O email é obrigatório.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Informe um email válido.";
  }

  if (!password) {
    errors.password = "A senha é obrigatória.";
  } else if (password.length < 8) {
    errors.password = "A senha deve possuir pelo menos 8 caracteres.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirme a senha.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  if (!companyName.trim()) {
    errors.companyName = "O nome da empresa é obrigatório.";
  } else if (companyName.trim().length < 3 || companyName.trim().length > 120) {
    errors.companyName = "O nome da empresa deve ter entre 3 e 120 caracteres.";
  }

  if (!companyTimezone || !isValidIanaTimezone(companyTimezone)) {
    errors.companyTimezone = "Selecione um fuso horário válido.";
  }

  return errors;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyTimezone, setCompanyTimezone] = useState(getDefaultTimezone());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(
      name,
      email,
      password,
      confirmPassword,
      companyName,
      companyTimezone,
    );
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    dispatch(setLoading(true));
    try {
      const response = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        company: {
          name: companyName.trim(),
          timezone: companyTimezone,
        },
      });
      const session = response.data;
      if (!session) {
        throw new Error("Resposta inválida do servidor.");
      }
      dispatch(setCredentials(session));
      navigate("/", { replace: true });
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      dispatch(setLoading(false));
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-5">
        <h1 className="h3 mb-3">Criar conta</h1>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="register-name" className="form-label">
              Nome
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name && (
              <div className="invalid-feedback">{fieldErrors.name}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="register-email" className="form-label">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {fieldErrors.email && (
              <div className="invalid-feedback">{fieldErrors.email}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="register-password" className="form-label">
              Senha
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {fieldErrors.password && (
              <div className="invalid-feedback">{fieldErrors.password}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="register-confirm-password" className="form-label">
              Confirmar senha
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {fieldErrors.confirmPassword && (
              <div className="invalid-feedback">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="register-company-name" className="form-label">
              Nome da empresa
            </label>
            <input
              id="register-company-name"
              type="text"
              className={`form-control ${fieldErrors.companyName ? "is-invalid" : ""}`}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
            {fieldErrors.companyName && (
              <div className="invalid-feedback">{fieldErrors.companyName}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="register-company-timezone" className="form-label">
              Fuso horário
            </label>
            <select
              id="register-company-timezone"
              className={`form-select ${fieldErrors.companyTimezone ? "is-invalid" : ""}`}
              value={companyTimezone}
              onChange={(event) => setCompanyTimezone(event.target.value)}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            {fieldErrors.companyTimezone && (
              <div className="invalid-feedback">
                {fieldErrors.companyTimezone}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Criando conta...
              </>
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        <p className="mt-3 mb-0 text-center">
          Já possui uma conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}