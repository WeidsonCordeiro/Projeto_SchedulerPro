import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import CompanyInactiveNotice from "../company/CompanyInactiveNotice";
import StaffCompanySuspendedView from "../company/StaffCompanySuspendedView";
import { useAppSelector } from "../../store";
import { selectCompany } from "../../store/slices/companySlice";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const staffCompanyAccessSuspended = useAppSelector(
    (state) => state.auth.staffCompanyAccessSuspended,
  );
  const company = useAppSelector(selectCompany);
  const location = useLocation();

  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const isClient = user?.role === "CLIENT";
  const isPortalPath = location.pathname.startsWith("/portal");

  const restoreMenuToggleFocus = useCallback(() => {
    queueMicrotask(() => {
      menuToggleRef.current?.focus();
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    restoreMenuToggleFocus();
  }, [restoreMenuToggleFocus]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      if (open) {
        restoreMenuToggleFocus();
        return false;
      }
      return true;
    });
  }, [restoreMenuToggleFocus]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      mainRef.current?.removeAttribute("inert");
      return;
    }

    mainRef.current?.setAttribute("inert", "");
    queueMicrotask(() => {
      sidebarCloseRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSidebar();
        return;
      }

      if (event.key !== "Tab" || !sidebarRef.current) {
        return;
      }

      const focusable = getFocusableElements(sidebarRef.current);
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      mainRef.current?.removeAttribute("inert");
    };
  }, [closeSidebar, sidebarOpen]);

  if (isClient && !isPortalPath) {
    return <Navigate to="/portal" replace />;
  }
  if (!isClient && isPortalPath) {
    return <Navigate to="/" replace />;
  }

  const showGlobalInactiveNotice =
    Boolean(company && !company.isActive) &&
    (user?.role === "OWNER" || user?.role === "ADMIN");

  const showStaffSuspendedView =
    staffCompanyAccessSuspended &&
    (user?.role === "MANAGER" || user?.role === "EMPLOYEE");

  return (
    <div className="app-shell">
      <Navbar
        menuToggleRef={menuToggleRef as RefObject<HTMLButtonElement>}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={sidebarOpen}
      />

      <div className="app-body d-flex overflow-hidden">
        <aside
          ref={sidebarRef}
          id="app-sidebar"
          data-testid="sidebar"
          className={`app-sidebar d-flex flex-column flex-shrink-0 bg-light border-end ${sidebarOpen ? "open" : ""}`}
        >
          <div className="d-flex justify-content-between align-items-center border-bottom p-2 d-lg-none flex-shrink-0">
            <span className="fw-semibold">Menu</span>
            <button
              ref={sidebarCloseRef}
              type="button"
              className="btn-close"
              aria-label="Fechar menu"
              onClick={closeSidebar}
            />
          </div>
          <div className="p-2 flex-grow-1 app-sidebar-scroll">
            <Sidebar onNavigate={closeSidebar} />
          </div>
        </aside>

        <main
          ref={mainRef}
          className="flex-grow-1 overflow-auto p-3 p-md-4"
          data-testid="app-main"
        >
          {showGlobalInactiveNotice && (
            <CompanyInactiveNotice
              role={user?.role ?? null}
              variant="global"
            />
          )}
          {showStaffSuspendedView ? (
            <StaffCompanySuspendedView />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          data-testid="sidebar-backdrop"
          className="app-sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}
