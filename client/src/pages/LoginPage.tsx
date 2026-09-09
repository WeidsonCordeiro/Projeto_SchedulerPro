import { useState } from "react";
import type { FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { setCredentials, setLoading } from "../store/slices/authSlice";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: password ? undefined : "A senha é obrigatória.",
    };
    setFieldErrors(errors);

    if (errors.email || errors.password) {
      return;
    }

    dispatch(setLoading(true));
    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
      });
      const session = response.data;
      if (!session) {
        throw new Error("Resposta inválida do servidor.");
      }
      dispatch(setCredentials(session));
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      dispatch(setLoading(false));
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-4">
        <h1 className="h3 mb-3">Entrar</h1>

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="form-label">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {fieldErrors.password && (
              <div className="invalid-feedback">{fieldErrors.password}</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) {
    return "O email é obrigatório.";
  }
  if (!EMAIL_PATTERN.test(value)) {
    return "Informe um email válido.";
  }
  return undefined;
}