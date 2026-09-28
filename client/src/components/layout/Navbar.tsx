import { useNavigate } from "react-router-dom";
import authApi from "../../api/endpoints/auth.api";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  clearCredentials,
  clearSessionExpirationMessage,
  setLoading,
} from "../../store/slices/authSlice";
import { clearCompany } from "../../store/slices/companySlice";
import NotificationBell from "./NotificationBell";

export default function Navbar({
  onToggleSidebar,
  isSidebarOpen = false,
}: {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  async function handleLogout() {
    dispatch(setLoading(true));
    try {
      await authApi.logout();
    } catch {
      // Erro recuperável no backend não deve deixar a UI fingindo autenticada.
    } finally {
      dispatch(clearCredentials());
      dispatch(clearSessionExpirationMessage());
      dispatch(clearCompany());
      navigate("/login", { replace: true });
    }
  }

  return (
    <nav className="navbar navbar-dark navbar-expand app-navbar">
      <div className="container-fluid min-w-0">
        <div className="d-flex align-items-center flex-shrink-0 gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              className="btn btn-outline-light btn-sm d-lg-none flex-shrink-0"
              aria-label="Abrir menu"
              aria-expanded={isSidebarOpen}
              onClick={onToggleSidebar}
            >
              <span aria-hidden="true">☰</span><span className="visually-hidden">Abrir menu</span>
            </button>
          )}
          <span className="navbar-brand mb-0 h1">SchedulerPro</span>
        </div>
        {user && (
          <div className="d-flex align-items-center gap-2 gap-md-3 ms-auto min-w-0">
            <NotificationBell />
            <div className="text-end user-summary">
              <div className="navbar-text user-name m-0">{user.name}</div>
              <div className="navbar-text user-role text-uppercase small m-0">
                {user.role}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline-light btn-sm flex-shrink-0"
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
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
