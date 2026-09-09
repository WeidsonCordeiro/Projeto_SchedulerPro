import { NavLink } from "react-router-dom";
import type { MenuItem } from "../../config/menu";

export default function SidebarItem({ item, onNavigate }: { item: MenuItem; onNavigate?: () => void }) {
  return (
    <li className="nav-item">
      <NavLink
        to={item.path}
        end={item.path === "/"}
        onClick={onNavigate}
        className={({ isActive }) =>
          `nav-link ${isActive ? "active" : ""}`
        }
      >
        {item.label}
      </NavLink>
    </li>
  );
}
