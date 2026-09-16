import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): string | undefined {
  if (!value.trim()) {
    return "O email é obrigatório.";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Informe um email válido.";
  }
  return undefined;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const error = validateEmail(email);
    setFieldError(error);

    if (error) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-4">
        <h1 className="h3 mb-3">Recuperar senha</h1>

        {submitted ? (
          <div className="alert alert-success" role="alert">
            Se existir uma conta com este email, enviaremos um link para
            redefinir a senha. Verifique sua caixa de entrada.
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
                <label htmlFor="forgot-email" className="form-label">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  className={`form-control ${fieldError ? "is-invalid" : ""}`}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {fieldError && (
                  <div className="invalid-feedback">{fieldError}</div>
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
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </button>
            </form>
          </>
        )}

        <p className="mt-3 mb-0 text-center">
          Lembrou a senha? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}