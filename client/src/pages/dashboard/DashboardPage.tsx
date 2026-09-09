import { useAppSelector } from "../../store";

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <section>
      <h1 className="h3 mb-1">Bem-vindo ao SchedulerPro</h1>
      {user && <p className="text-muted">Olá, {user.name}</p>}

      <h2 className="h5 mt-4 mb-3">Resumo</h2>
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title h6">Clientes</h3>
              <p className="card-text fs-4 mb-0">—</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title h6">Serviços</h3>
              <p className="card-text fs-4 mb-0">—</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title h6">Agendamentos</h3>
              <p className="card-text fs-4 mb-0">—</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <h3 className="card-title h6">Funcionários</h3>
              <p className="card-text fs-4 mb-0">—</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
