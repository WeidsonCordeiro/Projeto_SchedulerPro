import { Navigate, Outlet } from "react-router-dom";
import FullPageLoader from "../components/common/FullPageLoader";
import { useAppSelector } from "../store";

export default function ChangePasswordRoute() {
  const { isInitializing, isAuthenticated, mustChangePassword } = useAppSelector(
    (state) => state.auth,
  );

  if (isInitializing) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}