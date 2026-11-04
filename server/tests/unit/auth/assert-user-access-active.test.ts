import { describe, expect, it } from "vitest";
import { assertUserIsActiveForAccess } from "../../../src/modules/auth/utils/assert-user-access-active";
import { AppError } from "../../../src/errors/AppError";
import { ErrorCode } from "../../../src/constants/error-codes";

describe("assertUserIsActiveForAccess", () => {
  it("allows active users", () => {
    expect(() =>
      assertUserIsActiveForAccess({
        isActive: true,
        companyDeactivationSuspended: false,
      }),
    ).not.toThrow();
  });

  it("throws USER_SUSPENDED_BY_COMPANY_DEACTIVATION when flagged", () => {
    try {
      assertUserIsActiveForAccess({
        isActive: false,
        companyDeactivationSuspended: true,
      });
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(403);
      expect((error as AppError).code).toBe(
        ErrorCode.USER_SUSPENDED_BY_COMPANY_DEACTIVATION,
      );
    }
  });

  it("throws USER_INACTIVE for individual deactivation", () => {
    try {
      assertUserIsActiveForAccess({
        isActive: false,
        companyDeactivationSuspended: false,
      });
      expect.unreachable("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.USER_INACTIVE);
    }
  });
});
