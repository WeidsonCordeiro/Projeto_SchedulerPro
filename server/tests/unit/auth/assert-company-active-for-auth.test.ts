import { describe, expect, it } from "vitest";

import { assertUserMayAuthenticateAgainstCompany } from "../../../src/modules/auth/utils/assert-company-active-for-auth";
import { Role } from "../../../src/constants/roles";
import { AppError } from "../../../src/errors/AppError";
import { HttpStatus } from "../../../src/constants/http-status";

describe("assertUserMayAuthenticateAgainstCompany", () => {
  it("permite OWNER com empresa desactivada", () => {
    expect(() =>
      assertUserMayAuthenticateAgainstCompany(
        { role: Role.OWNER },
        { isActive: false },
      ),
    ).not.toThrow();
  });

  it("bloqueia staff com empresa desactivada", () => {
    expect(() =>
      assertUserMayAuthenticateAgainstCompany(
        { role: Role.ADMIN },
        { isActive: false },
      ),
    ).toThrow(AppError);
    try {
      assertUserMayAuthenticateAgainstCompany(
        { role: Role.CLIENT },
        { isActive: false },
      );
    } catch (error) {
      expect(error).toMatchObject({ statusCode: HttpStatus.FORBIDDEN });
    }
  });

  it("falha quando empresa não existe", () => {
    expect(() =>
      assertUserMayAuthenticateAgainstCompany({ role: Role.OWNER }, null),
    ).toThrow(AppError);
  });
});
