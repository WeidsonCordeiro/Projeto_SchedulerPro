import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import clientInvitesApi from "../../api/endpoints/clientInvites.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { ApiFailure } from "../../api/errors";
import PageHeader from "../../components/common/PageHeader";
import type { ClientInviteInfo } from "../../types/clientInvite";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function validate(password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

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

  return errors;
}

/**
 * Página pública de aceite de convite, em `/convite/cliente/:token`.
 *
 * É a página de quem AINDA NÃO TEM conta: sem `AppLayout`, sem guards e
 * sem sessão — exigir login seria pedir ao cliente uma conta que o convite
 * ainda não criou. Uma sessão administrativa aberta não influencia nada
 * aqui: `companyId`, `clientId` e `role` nunca vêm do browser.
 *
 * O token vem da URL e é usado apenas como argumento das duas chamadas
 * (consulta e aceite). Não vai para o Redux, nem para storage, nem para
 * componentes filhos.
 */
export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>();

  const [invite, setInvite] = useState<ClientInviteInfo | null>(null);
  const [loadFailure, setLoadFailure] = useState<ApiFailure | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [reloadKey, setReloadKey] = useState(0);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const inspectInvite = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadFailure(null);
    try {
      const response = await clientInvitesApi.inspect({ token });
      setInvite(response.data ?? null);
      if (!response.data) {
        setLoadFailure({
          kind: "not_found",
          message: "Este convite não é mais válido.",
        });
      }
    } catch (error) {
      setInvite(null);
      setLoadFailure(getApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void inspectInvite();
  }, [inspectInvite, reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(password, confirmPassword);
    setFieldErrors(errors);

    if (errors.password || errors.confirmPassword || !token) {
      return;
    }

    setIsSubmitting(true);
    try {
      await clientInvitesApi.accept({ token, password, confirmPassword });
      setSuccess(true);
    } catch (error) {
      const failure = getApiError(error);

      if (failure.kind === "not_found") {
        /**
         * O convite deixou de existir (expirou, foi revogado ou
         * já foi usado) entre a consulta e o aceite: volta à
         * consulta para mostrar o estado atual do link.
         */
        setErrorMessage(null);
        setInvite(null);
        setLoadFailure(failure);
        setReloadKey((key) => key + 1);
      } else {
        setErrorMessage(getFriendlyErrorMessage(failure));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="public-shell">
        <div className="public-brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SchedulerPro</span>
        </div>

        <main className="public-content">
          <div className="alert alert-danger" role="alert">
            Convite inválido ou incompleto.
          </div>
          <p className="mb-0 text-center">
            <Link to="/">Ir para o início</Link>
          </p>
        </main>
      </div>
    );
  }

  const loadIssue = loadFailure
    ? getFriendlyErrorMessage(loadFailure)
    : null;
  const showLoginLinkOnFailure = loadFailure?.kind === "conflict";
  const isRetryableFailure =
    loadFailure != null &&
    (loadFailure.kind === "network" ||
      loadFailure.kind === "server" ||
      loadFailure.kind === "unknown");

  return (
    <div className="public-shell">
      <div className="public-brand">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>SchedulerPro</span>
      </div>

      <main className="public-content">
        <PageHeader
          title="Criar conta de cliente"
          description="Defina a sua senha para aceder aos seus agendamentos."
        />

        {isLoading && (
          <div className="d-flex justify-content-center py-5" role="status">
            <div className="spinner-border text-primary" aria-hidden="true" />
            <span className="visually-hidden">A verificar o convite...</span>
          </div>
        )}

        {!isLoading && loadIssue && (
          <>
            <div className="alert alert-danger" role="alert">
              {loadIssue}
            </div>

            {showLoginLinkOnFailure && (
              <p className="text-center">
                <Link to="/login">Entrar</Link>
              </p>
            )}

            {isRetryableFailure && (
              <div className="text-center">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <p className="mt-3 mb-0 text-center">
              <Link to="/">Ir para o início</Link>
            </p>
          </>
        )}

        {!isLoading && !loadIssue && invite && (
          <>
            {success ? (
              <>
                <div className="alert alert-success" role="alert">
                  Conta criada com sucesso. Já pode iniciar sessão com o email{" "}
                  <strong>{invite.email}</strong>.
                </div>
                <p className="mt-3 mb-0 text-center">
                  <Link to="/login">Entrar</Link>
                </p>
              </>
            ) : (
              <>
                <p className="text-muted">
                  <strong>{invite.companyName}</strong> convidou{" "}
                  <strong>{invite.clientName}</strong> a criar uma conta de
                  acesso com o email <strong>{invite.email}</strong>.
                </p>

                {errorMessage && (
                  <div className="alert alert-danger" role="alert">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="invite-password" className="form-label">
                      Senha
                    </label>
                    <input
                      id="invite-password"
                      type="password"
                      autoComplete="new-password"
                      className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    {fieldErrors.password && (
                      <div className="invalid-feedback">
                        {fieldErrors.password}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="invite-confirm-password"
                      className="form-label"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="invite-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      className={`form-control ${fieldErrors.confirmPassword ? "is-invalid" : ""}`}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
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
                          aria-hidden="true"
                        />
                        Criando conta...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
