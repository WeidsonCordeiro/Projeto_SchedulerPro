import { beforeEach, describe, expect, it, vi } from "vitest";

const { user } = vi.hoisted(() => ({
  user: { findOne: vi.fn(), find: vi.fn(), exists: vi.fn(), findOneAndUpdate: vi.fn() },
}));
vi.mock("../../../src/modules/users/models/User.model", () => ({ default: user }));

import UserRepository from "../../../src/modules/users/repositories/UserRepository";

const id = "507f1f77bcf86cd799439011";
const activeById = { _id: id, deletedAt: null };

describe("UserRepository - autenticação e controle de acesso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findByEmail e existsByEmail excluem usuários soft-deleted", async () => {
    const select = vi.fn().mockResolvedValue(null);
    user.findOne.mockReturnValue({ select });
    user.exists.mockResolvedValue(null);
    await expect(UserRepository.findByEmail("user@example.com")).resolves.toBeNull();
    await expect(UserRepository.existsByEmail("user@example.com")).resolves.toBe(false);
    expect(user.findOne).toHaveBeenCalledWith({ email: "user@example.com", deletedAt: null });
    expect(select).toHaveBeenCalledWith("+passwordHash");
    expect(user.exists).toHaveBeenCalledWith({ email: "user@example.com", deletedAt: null });
  });

  it("findByCompanyId mantém o isolamento por companyId e deletedAt", async () => {
    user.find.mockResolvedValue([]);
    await UserRepository.findByCompanyId(id);
    expect(user.find).toHaveBeenCalledWith({ companyId: id, deletedAt: null });
  });

  it.each([
    ["updateLastLogin", () => UserRepository.updateLastLogin(id), { lastLogin: expect.any(Date) }],
    ["resetFailedLogin", () => UserRepository.resetFailedLogin(id), { failedLoginAttempts: 0, lockUntil: null }],
    ["incrementFailedLogin", () => UserRepository.incrementFailedLogin(id), { $inc: { failedLoginAttempts: 1 } }],
    ["lockUser", () => UserRepository.lockUser(id, new Date("2030-01-01")), { lockUntil: new Date("2030-01-01") }],
  ])("%s só atualiza usuário ativo", async (_name, operation, update) => {
    await operation();
    expect(user.findOneAndUpdate).toHaveBeenCalledWith(activeById, update);
  });
});
