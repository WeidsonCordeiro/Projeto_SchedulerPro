import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store";
import type { Role } from "../types/auth";

interface RoleRestrictedRouteProps {
  allow: (role: Role | null) => boolean;
  redirectTo?: string;
}

export default function RoleRestrictedRoute({
  allow,
  redirectTo = "/",
}: RoleRestrictedRouteProps) {
  const user = useAppSelector((state) => state.auth.user);

  if (!allow(user?.role ?? null)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}