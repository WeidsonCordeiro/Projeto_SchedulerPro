import { beforeEach, describe, expect, it, vi } from "vitest";

const { userRepository, companyRepository, passwordProvider, resendProvider, jwtProvider, userMapper } = vi.hoisted(() => ({
  userRepository: { existsByEmail: vi.fn(), create: vi.fn(), findById: vi.fn(), update: vi.fn() },
  companyRepository: { findById: vi.fn() },
  passwordProvider: { hash: vi.fn() },
  resendProvider: { send: vi.fn() },
  jwtProvider: { generateEmailVerificationToken: vi.fn() },
  userMapper: { toResponse: vi.fn((value: unknown) => value) },
}));

vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/providers/security/PasswordProvider", () => ({ default: passwordProvider }));
vi.mock("../../../src/providers/mail/ResendProvider", () => ({ default: resendProvider }));
vi.mock("../../../src/providers/security/JwtProvider", () => ({ default: jwtProvider }));
vi.mock("../../../src/modules/users/mappers/UserMapper", () => ({ default: userMapper }));
vi.mock("../../../src/providers/mail/templates/welcome.template", () => ({ welcomeTemplate: vi.fn(() => "html") }));
vi.mock("../../../src/providers/logger", () => ({ default: { auth: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/config/env", () => ({ env: { frontend: { FRONTEND_URL: "http://localhost" } } }));

import UserService from "../../../src/modules/users/services/UserService";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const company = { _id: { toString: () => companyId }, name: "Empresa" };
const user = { _id: { toString: () => userId }, id: userId, name: "User", email: "user@example.com", companyId: { toString: () => companyId }, role: Role.EMPLOYEE };

beforeEach(() => {
  vi.clearAllMocks();
  userRepository.existsByEmail.mockResolvedValue(false);
  userRepository.findById.mockResolvedValue(user);
  userRepository.update.mockResolvedValue({ ...user, role: Role.MANAGER });
  userRepository.create.mockResolvedValue(user);
  companyRepository.findById.mockResolvedValue(company);
  passwordProvider.hash.mockResolvedValue("hashed-password");
  jwtProvider.generateEmailVerificationToken.mockReturnValue("verification-token");
  resendProvider.send.mockResolvedValue(undefined);
});

describe("UserService.create/update", () => {
  const dto = { name: "User", email: "user@example.com", password: "password123", confirmPassword: "password123", role: Role.EMPLOYEE };

  it("cria com hash, companyId e mustChangePassword para EMPLOYEE", async () => {
    await UserService.create(dto, companyId, Role.ADMIN);
    expect(passwordProvider.hash).toHaveBeenCalledWith(dto.password);
    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: expect.objectContaining({ toString: expect.any(Function) }),
      passwordHash: "hashed-password",
      role: Role.EMPLOYEE,
      mustChangePassword: true,
    }));
  });

  it("não permite CLIENT criar usuário nem atribuir role acima da hierarquia", async () => {
    await expect(UserService.create(dto, companyId, Role.CLIENT)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    await expect(UserService.create({ ...dto, role: Role.OWNER }, companyId, Role.ADMIN)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("propaga erro do repository durante a criação", async () => {
    const error = new Error("repository failure");
    userRepository.create.mockRejectedValue(error);
    await expect(UserService.create(dto, companyId, Role.ADMIN)).rejects.toBe(error);
  });

  it("atualiza dentro da company e permite alteração autorizada de role", async () => {
    await UserService.update(userId, { name: "Atualizado", role: Role.MANAGER }, companyId, "other-user", Role.ADMIN);
    expect(userRepository.update).toHaveBeenCalledWith(userId, { name: "Atualizado", role: Role.MANAGER });
  });

  it.each([
    ["inexistente", null, companyId, { statusCode: HttpStatus.NOT_FOUND }],
    ["outra company", { ...user, companyId: { toString: () => "507f1f77bcf86cd799439099" } }, companyId, { statusCode: HttpStatus.FORBIDDEN }],
  ])("rejeita atualização de usuário %s", async (_name, found, tenant, error) => {
    userRepository.findById.mockResolvedValue(found);
    await expect(UserService.update(userId, { name: "X" }, tenant, "actor", Role.ADMIN)).rejects.toMatchObject(error);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("bloqueia role proibida e autoalteração de role", async () => {
    await expect(UserService.update(userId, { role: Role.ADMIN }, companyId, "actor", Role.MANAGER)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    await expect(UserService.update(userId, { role: Role.MANAGER }, companyId, userId, Role.EMPLOYEE)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
