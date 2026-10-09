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
import PublicAppointmentPage from "../pages/public/PublicAppointmentPage";
import PublicBookingPage from "../pages/public/PublicBookingPage";
import ClientInvitePage from "../pages/public/ClientInvitePage";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import ChangePasswordRoute from "./ChangePasswordRoute";

export default function AppRoutes() {
  return (
    <Routes>
      {/**
        Link público do agendamento, entregue a quem não tem conta.
        `/agendar/` sem token é o mesmo 404 da rota com token inválido.
       */}
      {/**
        MARCAÇÃO (nova): `/agendar/empresa/:companyId`.

        Declarada ANTES de `/agendar/:token` por legibilidade, não por
        necessidade — o react-router pontua segmentos estáticos acima de dinâmicos
        e escolheria esta rota para `/agendar/empresa/x` de qualquer maneira.
        Escrever por ordem inversa faria o token dinâmico parecer o dono do
        prefixo, e alguém acabaria por "acertar" a ordem por tentativa e erro.
      */}
      <Route
        path="/agendar/empresa/:companyId"
        element={<PublicBookingPage />}
      />
      <Route path="/agendar/:token" element={<PublicAppointmentPage />} />
      <Route path="/agendar" element={<PublicAppointmentPage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/**
        Convite de conta CLIENT: `/convite/cliente/:token`.

        Declarada FORA de GuestRoute/ProtectedRoute/AppLayout — quem
        abre o link não tem conta (é ela que o convite vai criar) e uma
        sessão administrativa aberta não pode redirecionar o convite
        para o login. Colocada antes do `*` para nunca cair no catch-all.
      */}
      <Route
        path="/convite/cliente/:token"
        element={<ClientInvitePage />}
      />

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
