import { Navigate, Outlet } from "react-router-dom";
import FullPageLoader from "../components/common/FullPageLoader";
import { useAppSelector } from "../store";

export default function GuestRoute() {
  const { isInitializing, isAuthenticated, mustChangePassword } = useAppSelector(
    (state) => state.auth,
  );

  if (isInitializing) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={mustChangePassword ? "/change-password" : "/"} replace />;
  }

  return (
    <div className="public-shell">
      <div className="public-brand"><span className="brand-mark" aria-hidden="true">S</span><span>SchedulerPro</span></div>
      <div className="public-layout">
        <aside className="public-context" aria-label="Sobre o SchedulerPro">
          <span className="page-eyebrow">Gestão sem ruído</span>
          <h1>O seu dia, organizado.</h1>
          <p>Uma visão simples para acompanhar clientes, equipa, serviços e agendamentos.</p>
          <div className="public-context-list"><span>01</span><strong>Agenda clara</strong><span>02</span><strong>Operação no ritmo da sua equipa</strong><span>03</span><strong>Decisões com contexto</strong></div>
        </aside>
        <main className="public-content"><Outlet /></main>
      </div>
      <p className="public-footer">Gestão simples para negócios que cuidam do seu tempo.</p>
    </div>
  );
}
