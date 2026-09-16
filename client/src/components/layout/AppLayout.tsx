import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAppSelector } from "../../store";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  const isClient = user?.role === "CLIENT";
  const isPortalPath = location.pathname.startsWith("/portal");

  if (isClient && !isPortalPath) {
    return <Navigate to="/portal" replace />;
  }
  if (!isClient && isPortalPath) {
    return <Navigate to="/" replace />;
  }

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell d-flex flex-column vh-100">
      <Navbar onToggleSidebar={openSidebar} />

      <div className="app-body d-flex flex-grow-1 overflow-hidden">
        <aside
          id="app-sidebar"
          data-testid="sidebar"
          className={`app-sidebar d-flex flex-column flex-shrink-0 bg-light border-end ${sidebarOpen ? "open" : ""}`}
        >
          <div className="d-flex justify-content-between align-items-center border-bottom p-2 d-lg-none">
            <span className="fw-semibold">Menu</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar menu"
              onClick={closeSidebar}
            />
          </div>
          <div className="p-2 flex-grow-1">
            <Sidebar onNavigate={closeSidebar} />
          </div>
        </aside>

        <main className="flex-grow-1 overflow-auto p-3 p-md-4">
          <Outlet />
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
