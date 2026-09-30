import { describe, expect, it, vi } from "vitest";
import { hasPermission } from "../../../src/middlewares/permission.middleware";
import { Permission } from "../../../src/constants/permissions";

describe("hasPermission", () => {
  it("permite role com a permission", () => {
    const next = vi.fn();
    hasPermission(Permission.APPOINTMENT_READ)({ user: { userId: "u", companyId: "c", role: "CLIENT" } } as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejeita role sem permission", () => {
    const next = vi.fn();
    expect(() => hasPermission(Permission.USER_DELETE)({ user: { userId: "u", companyId: "c", role: "CLIENT" } } as never, {} as never, next)).toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejeita role inválida sem causar erro interno", () => {
    const next = vi.fn();
    expect(() => hasPermission(Permission.USER_READ)({ user: { userId: "u", companyId: "c", role: "UNKNOWN" } } as never, {} as never, next)).toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});
