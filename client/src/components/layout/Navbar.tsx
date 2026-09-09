import { useNavigate } from "react-router-dom";
import authApi from "../../api/endpoints/auth.api";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearCredentials, setLoading } from "../../store/slices/authSlice";

export default function Navbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
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
      navigate("/login", { replace: true });
    }
  }

  return (
    <nav className="navbar navbar-dark bg-dark navbar-expand">
      <div className="container-fluid">
        <div className="d-flex align-items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              className="btn btn-outline-light btn-sm d-lg-none"
              aria-label="Abrir menu"
              onClick={onToggleSidebar}
            >
              Menu
            </button>
          )}
          <span className="navbar-brand mb-0 h1">SchedulerPro</span>
        </div>
        {user && (
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="navbar-text text-light m-0">{user.name}</div>
              <div className="navbar-text text-secondary text-uppercase small m-0">
                {user.role}
              </div>
            </div>
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
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
