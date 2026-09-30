import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authApi from "../api/endpoints/auth.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";
import FullPageLoader from "../components/common/FullPageLoader";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<VerifyState>(
    token ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage("Link de verificação inválido ou incompleto.");
      return;
    }

    let active = true;

    (async () => {
      try {
        await authApi.verifyEmail(token);
        if (active) {
          setState("success");
        }
      } catch (error) {
        const failure = getApiError(error);
        if (active) {
          setErrorMessage(getFriendlyErrorMessage(failure));
          setState("error");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (state === "loading") {
    return <FullPageLoader />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-8 col-md-6 col-lg-4">
        {state === "success" ? (
          <div className="alert alert-success" role="alert">
            Email verificado com sucesso. Pode entrar na sua conta.
          </div>
        ) : (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="d-flex justify-content-center gap-3">
          {state === "success" && (
            <Link to="/login" className="btn btn-primary">
              Entrar
            </Link>
          )}
          {state === "error" && (
            <>
              <Link to="/login" className="btn btn-outline-primary">
                Entrar
              </Link>
              <Link to="/forgot-password" className="btn btn-outline-secondary">
                Recuperar senha
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}