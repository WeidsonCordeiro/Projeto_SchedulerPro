import { Link } from "react-router-dom";
import EmptyState from "../components/common/EmptyState";
import FullPageLoader from "../components/common/FullPageLoader";
import {
  getNotFoundHomeLabel,
  getNotFoundHomePath,
} from "../config/notFoundNavigation";
import { useAppSelector } from "../store";

export default function NotFoundPage() {
  const { isInitializing, isAuthenticated, mustChangePassword, user } =
    useAppSelector((state) => state.auth);

  if (isInitializing) {
    return <FullPageLoader />;
  }
  const homePath = getNotFoundHomePath(
    isAuthenticated,
    mustChangePassword,
    user?.role,
  );
  const homeLabel = getNotFoundHomeLabel(
    isAuthenticated,
    mustChangePassword,
    user?.role,
  );

  const content = (
    <EmptyState
      title="Página não encontrada"
      description="O endereço que abriu não existe ou deixou de estar disponível. Verifique o link ou volte a uma área válida da aplicação."
      icon="404"
      action={
        <Link to={homePath} className="btn btn-primary">
          {homeLabel}
        </Link>
      }
    />
  );

  if (!isAuthenticated) {
    return (
      <div className="public-shell">
        <div className="public-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SchedulerPro</span>
        </div>
        <main className="public-layout public-layout-not-found" role="main">
          <div className="public-content w-100">{content}</div>
        </main>
        <p className="public-footer">
          Gestão simples para negócios que cuidam do seu tempo.
        </p>
      </div>
    );
  }

  return (
    <main className="container py-5" role="main">
      <div className="mx-auto" style={{ maxWidth: "32rem" }}>
        {content}
      </div>
    </main>
  );
}
