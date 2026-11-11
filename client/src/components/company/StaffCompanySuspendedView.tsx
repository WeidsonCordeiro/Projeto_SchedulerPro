import { useNavigate } from "react-router-dom";
import { completeSessionLogout } from "../../app/completeSessionLogout";
import { useAppDispatch } from "../../store";
import { STAFF_COMPANY_SUSPENSION_FRIENDLY_MESSAGE } from "../../api/errors";

export default function StaffCompanySuspendedView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function handleLogout() {
    await completeSessionLogout(dispatch, navigate);
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
