import { useNavigate } from "react-router-dom";
import authApi from "../../api/endpoints/auth.api";
import { useAppDispatch } from "../../store";
import {
  clearCredentials,
  clearSessionExpirationMessage,
  setLoading,
} from "../../store/slices/authSlice";
import { clearCompany } from "../../store/slices/companySlice";
import { STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE } from "../../api/errors";

export default function StaffCompanySuspendedView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleLogout() {
    dispatch(setLoading(true));
    try {
      await authApi.logout();
    } catch {
      // Mantém logout local mesmo se o backend falhar.
    } finally {
      dispatch(clearCredentials());
      dispatch(clearSessionExpirationMessage());
      dispatch(clearCompany());
      navigate("/login", { replace: true });
    }
  }

  return (
    <div
      className="card border-warning shadow-sm mx-auto"
      style={{ maxWidth: "42rem" }}
      data-testid="staff-company-suspended-view"
    >
      <div className="card-body">
        <h1 className="h4 card-title text-warning-emphasis">
          Empresa temporariamente suspensa
        </h1>
        <p className="card-text mb-4">{STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE}</p>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => void handleLogout()}
        >
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
