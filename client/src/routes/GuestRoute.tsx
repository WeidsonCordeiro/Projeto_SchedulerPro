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

  return <Outlet />;
}