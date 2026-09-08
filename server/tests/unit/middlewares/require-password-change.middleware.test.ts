import { beforeEach, describe, expect, it, vi } from "vitest";

const { userRepository } = vi.hoisted(() => ({ userRepository: { findByIdForAccessControl: vi.fn() } }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));

import PasswordChangeMiddleware from "../../../src/middlewares/require-password-change.middleware";

describe("requirePasswordChangeCompleted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia usuário que precisa trocar a senha", async () => {
    userRepository.findByIdForAccessControl.mockResolvedValue({ mustChangePassword: true });
    const next = vi.fn();
    await expect(PasswordChangeMiddleware.requirePasswordChangeCompleted({ user: { userId: "u" } } as never, {} as never, next)).rejects.toMatchObject({ statusCode: 403 });
    expect(next).not.toHaveBeenCalled();
  });

  it("permite troca já concluída e rejeita usuário inexistente/soft-deleted", async () => {
    const next = vi.fn();
    userRepository.findByIdForAccessControl.mockResolvedValue({ mustChangePassword: false });
    await PasswordChangeMiddleware.requirePasswordChangeCompleted({ user: { userId: "u" } } as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
    userRepository.findByIdForAccessControl.mockResolvedValue(null);
    await expect(PasswordChangeMiddleware.requirePasswordChangeCompleted({ user: { userId: "deleted" } } as never, {} as never, vi.fn())).rejects.toMatchObject({ statusCode: 404 });
  });
});
