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
vi.mock("../../../src/providers/mail/templates/welcome.template", () => ({ welcomeTemplate: vi.fn(() => "") }));
vi.mock("../../../src/providers/logger", () => ({ default: { auth: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/config/env", () => ({ env: { frontend: { FRONTEND_URL: "http://localhost" } } }));

import UserService from "../../../src/modules/users/services/UserService";
import { Role } from "../../../src/constants/roles";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const targetId = "507f1f77bcf86cd799439012";
const company = { _id: { toString: () => companyId }, name: "Empresa" };
const target = { _id: { toString: () => targetId }, id: targetId, companyId: { toString: () => companyId }, role: Role.EMPLOYEE, isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  userRepository.existsByEmail.mockResolvedValue(false);
  companyRepository.findById.mockResolvedValue(company);
  passwordProvider.hash.mockResolvedValue("hash");
  jwtProvider.generateEmailVerificationToken.mockReturnValue("token");
  resendProvider.send.mockResolvedValue(undefined);
  userRepository.create.mockResolvedValue({ ...target, id: targetId });
  userRepository.findById.mockResolvedValue(target);
  userRepository.update.mockResolvedValue({ ...target, role: Role.MANAGER });
});

describe("UserService - autorização por hierarquia", () => {
  it("bloqueia ADMIN criando OWNER com 403", async () => {
    await expect(UserService.create({ name: "A", email: "a@a.com", password: "password", confirmPassword: "password", role: Role.OWNER }, companyId, Role.ADMIN)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("permite ADMIN criar MANAGER", async () => {
    await expect(UserService.create({ name: "A", email: "a@a.com", password: "password", confirmPassword: "password", role: Role.MANAGER }, companyId, Role.ADMIN)).resolves.toBeTruthy();
    expect(userRepository.create).toHaveBeenCalled();
  });

  it("bloqueia MANAGER alterando usuário para ADMIN", async () => {
    await expect(UserService.update(targetId, { role: Role.ADMIN }, companyId, "507f1f77bcf86cd799439099", Role.MANAGER)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("permite ADMIN alterar usuário para MANAGER", async () => {
    await expect(UserService.update(targetId, { role: Role.MANAGER }, companyId, "507f1f77bcf86cd799439099", Role.ADMIN)).resolves.toBeTruthy();
    expect(userRepository.update).toHaveBeenCalledWith(targetId, { role: Role.MANAGER });
  });

  it.each([Role.MANAGER, Role.OWNER, Role.EMPLOYEE])("bloqueia ADMIN alterando o próprio role para %s", async (role) => {
    const self = { ...target, id: companyId, _id: { toString: () => companyId }, role: Role.ADMIN };
    userRepository.findById.mockResolvedValue(self);
    await expect(UserService.update(companyId, { role }, companyId, companyId, Role.ADMIN)).rejects.toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
