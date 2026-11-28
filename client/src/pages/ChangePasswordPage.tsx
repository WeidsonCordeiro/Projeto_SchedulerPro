import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import {
  clearMustChangePassword,
  setLoading,
} from "../store/slices/authSlice";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!currentPassword) {
    errors.currentPassword = "A palavra-passe atual é obrigatória.";
  }

  if (!newPassword) {
    errors.newPassword = "A nova palavra-passe é obrigatória.";
  } else if (newPassword.length < 8) {
    errors.newPassword = "A nova palavra-passe deve ter pelo menos 8 caracteres.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirme a nova palavra-passe.";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "As palavras-passe não coincidem.";
  }

  return errors;
}

export default function ChangePasswordPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const mustChangePassword = useAppSelector(
    (state) => state.auth.mustChangePassword,
  );
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(currentPassword, newPassword, confirmPassword);
    setFieldErrors(errors);

    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    dispatch(setLoading(true));
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      dispatch(clearMustChangePassword());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate("/", { replace: true });
    } catch (error) {
      const failure = getApiError(error);
      let message = getFriendlyErrorMessage(failure);
      if (failure.kind === "auth") {
        message = "A palavra-passe atual está incorreta.";
      }
      setErrorMessage(message);
      dispatch(setLoading(false));
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-4">
        <h1 className="h3 mb-2">Alterar palavra-passe</h1>
        {mustChangePassword && (
          <p className="text-muted">
            Por segurança, é necessário alterar a sua palavra-passe antes de continuar.
          </p>
        )}

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="cp-current-password" className="form-label">
              Palavra-passe atual
            </label>
            <input
              id="cp-current-password"
              type="password"
              autoComplete="current-password"
              className={`form-control ${fieldErrors.currentPassword ? "is-invalid" : ""}`}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            {fieldErrors.currentPassword && (
              <div className="invalid-feedback">
                {fieldErrors.currentPassword}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="cp-new-password" className="form-label">
              Nova palavra-passe
            </label>
            <input
              id="cp-new-password"
              type="password"
              autoComplete="new-password"
              className={`form-control ${fieldErrors.newPassword ? "is-invalid" : ""}`}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {fieldErrors.newPassword && (
              <div className="invalid-feedback">{fieldErrors.newPassword}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="cp-confirm-password" className="form-label">
              Confirmar nova palavra-passe
            </label>
            <input
              id="cp-confirm-password"
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
                Alterando...
              </>
            ) : (
              "Alterar palavra-passe"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}