import { beforeEach, describe, expect, it, vi } from "vitest";

const { userModel } = vi.hoisted(() => ({
  userModel: {
    updateMany: vi.fn(),
  },
}));

vi.mock("../../../src/modules/users/models/User.model", () => ({
  default: userModel,
}));

import UserRepository from "../../../src/modules/users/repositories/UserRepository";
import { Role } from "../../../src/constants/roles";

const companyId = "507f1f77bcf86cd799439011";
const session = { id: "mongo-session" };

describe("UserRepository — suspensão por desactivação da empresa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
  });

  it("suspende utilizadores activos excepto OWNER", async () => {
    const count =
      await UserRepository.suspendActiveNonOwnerStaffForCompanyDeactivation(
        companyId,
        session as never,
      );
    expect(count).toBe(2);
    expect(userModel.updateMany).toHaveBeenCalledWith(
      {
        companyId,
        role: { $ne: Role.OWNER },
        isActive: true,
        deletedAt: null,
      },
      {
        $set: {
          isActive: false,
          companyDeactivationSuspended: true,
        },
      },
      { session },
    );
  });

  it("restaura apenas contas com flag de suspensão da empresa", async () => {
    await UserRepository.restoreUsersSuspendedByCompanyDeactivation(companyId);
    expect(userModel.updateMany).toHaveBeenCalledWith(
      {
        companyId,
        companyDeactivationSuspended: true,
        deletedAt: null,
      },
      {
        $set: {
          isActive: true,
          companyDeactivationSuspended: false,
        },
      },
      { session: undefined },
    );
  });
});
