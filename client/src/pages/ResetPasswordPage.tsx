import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function validate(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!password) {
    errors.password = "A nova senha é obrigatória.";
  } else if (password.length < 8) {
    errors.password = "A senha deve possuir pelo menos 8 caracteres.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirme a nova senha.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  return errors;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(password, confirmPassword);
    setFieldErrors(errors);

    if (errors.password || errors.confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      setSuccess(true);
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="row justify-content-center">
        <div className="col-sm-8 col-md-6 col-lg-4">
          <div className="alert alert-danger" role="alert">
            Link de recuperação inválido ou incompleto.
          </div>
          <p className="mb-0 text-center">
            <Link to="/forgot-password">Solicitar novo link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-4">
        <h1 className="h3 mb-3">Redefinir senha</h1>

        {success ? (
          <div className="alert alert-success" role="alert">
            Senha redefinida com sucesso. Pode entrar com a nova senha.
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="reset-password" className="form-label">
                  Nova senha
                </label>
                <input
                  id="reset-password"
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
                <label htmlFor="reset-confirm-password" className="form-label">
                  Confirmar nova senha
                </label>
                <input
                  id="reset-confirm-password"
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

              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </button>
            </form>
          </>
        )}

        {success && (
          <p className="mt-3 mb-0 text-center">
            <Link to="/login">Entrar</Link>
          </p>
        )}
      </div>
    </div>
  );
}