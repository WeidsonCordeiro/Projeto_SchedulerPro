import { useAppSelector } from "../../store";
import { getMenuItemsForRole } from "../../config/menu";
import SidebarItem from "./SidebarItem";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAppSelector((state) => state.auth.user);
  const items = getMenuItemsForRole(user?.role ?? null);

  return (
    <nav className="navbar navbar-light flex-column align-items-stretch p-0">
      <ul className="navbar-nav flex-column w-100">
        {items.map((item) => (
          <SidebarItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </ul>
    </nav>
  );
}
