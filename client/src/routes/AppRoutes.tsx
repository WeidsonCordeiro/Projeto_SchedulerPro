import { lazy, type ComponentType } from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import ChangePasswordRoute from "./ChangePasswordRoute";
import RouteSuspense from "./RouteSuspense";

const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const ClientsPage = lazy(() => import("../pages/clients/ClientsPage"));
const ServicesPage = lazy(() => import("../pages/services/ServicesPage"));
const EmployeesPage = lazy(() => import("../pages/employees/EmployeesPage"));
const AvailabilityPage = lazy(() => import("../pages/availability/AvailabilityPage"));
const AppointmentsPage = lazy(() => import("../pages/appointments/AppointmentsPage"));
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage"));
const CompanyPage = lazy(() => import("../pages/company/CompanyPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const ChangePasswordPage = lazy(() => import("../pages/ChangePasswordPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));
const PortalHomePage = lazy(() => import("../pages/portal/PortalHomePage"));
const PortalAppointmentsPage = lazy(
  () => import("../pages/portal/PortalAppointmentsPage"),
);
const PortalProfilePage = lazy(() => import("../pages/portal/PortalProfilePage"));
const PublicAppointmentPage = lazy(
  () => import("../pages/public/PublicAppointmentPage"),
);
const PublicBookingPage = lazy(() => import("../pages/public/PublicBookingPage"));
const ClientInvitePage = lazy(() => import("../pages/public/ClientInvitePage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

function lazyPage(Page: ComponentType) {
  return (
    <RouteSuspense>
      <Page />
    </RouteSuspense>
  );
}

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
        element={lazyPage(PublicBookingPage)}
      />
      <Route path="/agendar/:token" element={lazyPage(PublicAppointmentPage)} />
      <Route path="/agendar" element={lazyPage(PublicAppointmentPage)} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={lazyPage(LoginPage)} />
        <Route path="/register" element={lazyPage(RegisterPage)} />
        <Route path="/forgot-password" element={lazyPage(ForgotPasswordPage)} />
      </Route>

      <Route path="/reset-password" element={lazyPage(ResetPasswordPage)} />
      <Route path="/verify-email" element={lazyPage(VerifyEmailPage)} />

      {/**
        Convite de conta CLIENT: `/convite/cliente/:token`.

        Declarada FORA de GuestRoute/ProtectedRoute/AppLayout — quem
        abre o link não tem conta (é ela que o convite vai criar) e uma
        sessão administrativa aberta não pode redirecionar o convite
        para o login. Colocada antes do `*` para nunca cair no catch-all.
      */}
      <Route
        path="/convite/cliente/:token"
        element={lazyPage(ClientInvitePage)}
      />

      <Route element={<ChangePasswordRoute />}>
        <Route
          path="/change-password"
          element={lazyPage(ChangePasswordPage)}
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={lazyPage(DashboardPage)} />
          <Route path="/clients" element={lazyPage(ClientsPage)} />
          <Route path="/services" element={lazyPage(ServicesPage)} />
          <Route path="/employees" element={lazyPage(EmployeesPage)} />
          <Route path="/availability" element={lazyPage(AvailabilityPage)} />
          <Route path="/appointments" element={lazyPage(AppointmentsPage)} />
          <Route path="/reports" element={lazyPage(ReportsPage)} />
          <Route path="/company" element={lazyPage(CompanyPage)} />
          <Route path="/portal" element={lazyPage(PortalHomePage)} />
          <Route
            path="/portal/agendamentos"
            element={lazyPage(PortalAppointmentsPage)}
          />
          <Route path="/portal/perfil" element={lazyPage(PortalProfilePage)} />
        </Route>
      </Route>

      <Route path="*" element={lazyPage(NotFoundPage)} />
    </Routes>
  );
}