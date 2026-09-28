import { useAppSelector } from "../../store";
import { getMenuItemsForRole } from "../../config/menu";
import SidebarItem from "./SidebarItem";
import { selectCompany } from "../../store/slices/companySlice";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAppSelector((state) => state.auth.user);
  const items = getMenuItemsForRole(user?.role ?? null);
  const company = useAppSelector(selectCompany);
  const primaryItems = items.filter((item) => ["/", "/portal"].includes(item.path));
  const operationItems = items.filter((item) => ["/appointments", "/clients", "/services", "/availability", "/portal/agendamentos"].includes(item.path));
  const managementItems = items.filter((item) => ["/employees", "/reports", "/company", "/portal/perfil"].includes(item.path));

  function renderGroup(label: string, groupItems: typeof items) {
    if (groupItems.length === 0) return null;
    return (
      <div className="sidebar-group">
        <div className="sidebar-group-label">{label}</div>
        <ul className="navbar-nav flex-column w-100">
          {groupItems.map((item) => <SidebarItem key={item.path} item={item} onNavigate={onNavigate} />)}
        </ul>
      </div>
    );
  }

  return (
    <nav className="navbar navbar-light flex-column align-items-stretch p-0">
      <div className="sidebar-context">
        <div className="sidebar-context-mark">{(company?.name ?? "S").charAt(0).toUpperCase()}</div>
        <div className="text-truncate"><span className="sidebar-context-label">Espaço de trabalho</span><strong className="d-block text-truncate">{company?.name ?? "SchedulerPro"}</strong></div>
      </div>
      {renderGroup("Visão geral", primaryItems)}
      {renderGroup("Operação", operationItems)}
      {renderGroup("Gestão", managementItems)}
    </nav>
  );
}
