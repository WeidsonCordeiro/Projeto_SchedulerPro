import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ClientsPage from "../pages/clients/ClientsPage";
import ServicesPage from "../pages/services/ServicesPage";
import EmployeesPage from "../pages/employees/EmployeesPage";
import AvailabilityPage from "../pages/availability/AvailabilityPage";
import AppointmentsPage from "../pages/appointments/AppointmentsPage";
import ReportsPage from "../pages/reports/ReportsPage";
import CompanyPage from "../pages/company/CompanyPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import PortalHomePage from "../pages/portal/PortalHomePage";
import PortalAppointmentsPage from "../pages/portal/PortalAppointmentsPage";
import PortalProfilePage from "../pages/portal/PortalProfilePage";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import ChangePasswordRoute from "./ChangePasswordRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ChangePasswordRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/portal" element={<PortalHomePage />} />
          <Route path="/portal/agendamentos" element={<PortalAppointmentsPage />} />
          <Route path="/portal/perfil" element={<PortalProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
