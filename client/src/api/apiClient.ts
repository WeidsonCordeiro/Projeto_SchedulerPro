import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { store } from "../store";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import { clearCompany } from "../store/slices/companySlice";
import type { ApiResponse } from "../types/api";
import type { AuthSession } from "../types/auth";

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

/**
 * Configuração que já passou por uma tentativa de refresh (anti-loop).
 */
type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Endpoints públicos de autenticação.
 *
 * Um 401 nesses endpoints é um erro ESPERADO do fluxo (ex.: credenciais
 * inválidas no login, token de verificação inválido, refresh token expirado)
 * e não deve disparar refresh nem logout automático.
 *
 * O próprio /auth/refresh precisa estar aqui para evitar reentrância: um
 * refresh que falha nunca dispara outro refresh.
 */
const PUBLIC_AUTH_PATHS: readonly string[] = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/refresh",
  "/auth/logout",
];

function isPublicAuthRequest(url?: string): boolean {
  if (!url) {
    return false;
  }
  return PUBLIC_AUTH_PATHS.includes(url.split("?")[0]);
}

type RefreshResult = "ok" | "expired" | "error";

/**
 * Refresh compartilhado: quando várias requisições recebem 401 ao mesmo
 * tempo, apenas um POST /auth/refresh é disparado. Todas aguardam o mesmo
 * resultado e repetem a requisição original após o refresh bem-sucedido.
 */
let sessionRefreshPromise: Promise<RefreshResult> | null = null;

async function performSessionRefresh(): Promise<RefreshResult> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthSession>>(
      "/auth/refresh",
    );
    if (data?.data) {
      store.dispatch(setCredentials(data.data));
    }
    return "ok";
  } catch (error) {
    // 401 no refresh = sessão definitivamente expirada/inválida.
    // Qualquer outro erro (403, 5xx, rede) é tratado como falha transitória.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return "expired";
    }
    return "error";
  }
}

function getSharedSessionRefresh(): Promise<RefreshResult> {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = performSessionRefresh().finally(() => {
      sessionRefreshPromise = null;
    });
  }
  return sessionRefreshPromise;
}

/**
 * Logout automático local: limpa o estado global de autenticação (e os dados
 * de sessão derivados). O redirecionamento para /login já é responsabilidade
 * dos guards existentes (ProtectedRoute redireciona quando isAuthenticated
 * fica falso), então nenhum navigate é necessário aqui.
 */
function handleSessionExpired(): void {
  store.dispatch(clearCredentials());
  store.dispatch(clearCompany());
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    // Apenas 401 relacionados à sessão disparam refresh/logout.
    // 403 (EMAIL_NOT_VERIFIED, CLIENT_LINK_REQUIRED, RBAC etc.) mantém o
    // comportamento atual conforme a regra desta stage.
    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Erros esperados de endpoints públicos nunca geram refresh/logout.
    if (isPublicAuthRequest(original.url)) {
      return Promise.reject(error);
    }

    // Anti-loop: uma requisição já repetida após refresh não é repetida
    // novamente, mesmo que falhe outra vez com 401.
    if (original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    const result = await getSharedSessionRefresh();

    if (result === "ok") {
      return apiClient(original);
    }

    if (result === "expired") {
      handleSessionExpired();
    }

    return Promise.reject(error);
  },
);

export default apiClient;