export const APP_TITLE_SUFFIX = "SchedulerPro";

const EXACT_PATH_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clientes",
  "/services": "Serviços",
  "/employees": "Funcionários",
  "/availability": "Disponibilidade",
  "/appointments": "Agendamentos",
  "/reports": "Relatórios",
  "/company": "Empresa",
  "/portal": "Portal",
  "/portal/agendamentos": "Meus agendamentos",
  "/portal/perfil": "O meu perfil",
  "/login": "Entrar",
  "/register": "Criar conta",
  "/forgot-password": "Recuperar palavra-passe",
  "/reset-password": "Redefinir palavra-passe",
  "/verify-email": "Verificar e-mail",
  "/change-password": "Alterar palavra-passe",
  "/agendar": "Agendamento",
};

export function resolvePageTitle(pathname: string): string {
  const base = pathname.split("?")[0];

  if (EXACT_PATH_TITLES[base]) {
    return `${EXACT_PATH_TITLES[base]} | ${APP_TITLE_SUFFIX}`;
  }

  if (base.startsWith("/agendar/empresa/")) {
    return `Marcar atendimento | ${APP_TITLE_SUFFIX}`;
  }

  if (base.startsWith("/agendar/")) {
    return `Seu agendamento | ${APP_TITLE_SUFFIX}`;
  }

  if (base.startsWith("/convite/cliente/")) {
    return `Convite de cliente | ${APP_TITLE_SUFFIX}`;
  }

  return APP_TITLE_SUFFIX;
}