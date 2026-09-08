import { describe, expect, it, vi } from "vitest";

const authRegister = vi.fn();
const authRefresh = vi.fn();
const authService = vi.fn();
const setAccessToken = vi.fn();
const setRefreshToken = vi.fn();
const getRefreshToken = vi.fn();

vi.mock("../../../src/modules/auth/services/AuthService", () => ({
  default: {
    register: authRegister,
    refresh: authRefresh,
  },
}));

vi.mock("../../../src/providers/security/CookieProvider", () => ({
  default: {
    setAccessToken,
    setRefreshToken,
    getRefreshToken,
  },
}));

vi.mock("../../../src/modules/users/services/UserService", () => ({
  default: {
    create: authService,
  },
}));

function response() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { json, status } as unknown as Response;
}

describe("API contract - status e resposta de autenticacao", () => {
  it("retorna 201 e mustChangePassword no registro", async () => {
    authRegister.mockResolvedValueOnce({
      user: { id: "user-1", role: "OWNER" },
      tokens: { accessToken: "access", refreshToken: "refresh" },
      mustChangePassword: false,
    });

    const { default: AuthController } = await import(
      "../../../src/modules/auth/controllers/AuthController"
    );
    const res = response();

    await AuthController.register({ body: {} } as never, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect((res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json)
      .toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ mustChangePassword: false }),
      }));
  });

  it("retorna mustChangePassword no refresh", async () => {
    getRefreshToken.mockReturnValueOnce("refresh");
    authRefresh.mockResolvedValueOnce({
      user: { id: "user-1", role: "OWNER" },
      tokens: { accessToken: "access", refreshToken: "refresh" },
      mustChangePassword: true,
    });

    const { default: AuthController } = await import(
      "../../../src/modules/auth/controllers/AuthController"
    );
    const res = response();

    await AuthController.refresh({ cookies: { refreshToken: "refresh" } } as never, res);

    expect((res.status as ReturnType<typeof vi.fn>).mock.results[0].value.json)
      .toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: true }),
      }));
  });
});

describe("API contract - criacao de utilizador", () => {
  it("retorna 201 na criacao de utilizador", async () => {
    authService.mockResolvedValueOnce({ id: "user-1" });

    const { default: UserController } = await import(
      "../../../src/modules/users/controllers/UserController"
    );
    const res = response();

    await UserController.create({
      body: {},
      user: { companyId: "company-1", role: "OWNER", userId: "owner-1" },
    } as never, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});
