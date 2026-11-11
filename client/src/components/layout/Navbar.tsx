import { type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { completeSessionLogout } from "../../app/completeSessionLogout";
import { useAppDispatch, useAppSelector } from "../../store";
import NotificationBell from "./NotificationBell";
import ImageAvatar from "../common/ImageAvatar";

export default function Navbar({
  onToggleSidebar,
  isSidebarOpen = false,
  menuToggleRef,
}: {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  menuToggleRef?: RefObject<HTMLButtonElement | null>;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  async function handleLogout() {
    await completeSessionLogout(dispatch, navigate);
  }

  const menuToggleLabel = isSidebarOpen ? "Fechar menu" : "Abrir menu";

  return (
    <nav className="navbar navbar-dark navbar-expand app-navbar">
      <div className="container-fluid min-w-0">
        <div className="d-flex align-items-center flex-shrink-0 gap-2">
          {onToggleSidebar && (
            <button
              ref={menuToggleRef}
              type="button"
              className="btn btn-outline-light btn-sm d-lg-none flex-shrink-0"
              aria-label={menuToggleLabel}
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
              onClick={onToggleSidebar}
            >
              <span aria-hidden="true">☰</span>
              <span className="visually-hidden">{menuToggleLabel}</span>
            </button>
          )}
          <span className="navbar-brand mb-0 h1">SchedulerPro</span>
        </div>
        {user && (
          <div className="navbar-actions">
            <NotificationBell />
            <div className="navbar-user-cluster">
              <ImageAvatar
                image={user.avatar}
                name={user.name}
                size="sm"
                shape="circle"
                alt=""
                className="navbar-user-avatar flex-shrink-0"
              />
              <div className="text-end user-summary">
                <div className="navbar-text user-name m-0">{user.name}</div>
                <div className="navbar-text user-role text-uppercase small m-0">
                  {user.role}
                </div>
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
