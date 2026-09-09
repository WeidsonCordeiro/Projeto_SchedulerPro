import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../../api/endpoints/auth.api";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearCredentials, setLoading } from "../../store/slices/authSlice";

export default function AppLayout({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

  async function handleLogout() {
    dispatch(setLoading(true));
    try {
      await authApi.logout();
    } catch {
      // Erro recuperável no backend não deve deixar a UI fingindo autenticada.
    } finally {
      dispatch(clearCredentials());
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">SchedulerPro</span>
          {isAuthenticated && user && (
            <div className="d-flex align-items-center gap-3">
              <span className="navbar-text text-light">{user.name}</span>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading && (
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="container py-4">{children}</main>
    </>
  );
}