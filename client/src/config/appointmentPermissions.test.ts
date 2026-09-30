import { describe, expect, it } from "vitest";
import { getAppointmentAbilities } from "./appointmentPermissions";
import type { Role } from "../types/auth";

const ALL_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"];

interface ExpectedAbilities {
  canList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canStatus: boolean;
  canDelete: boolean;
}

describe("getAppointmentAbilities", () => {
  it.each<[Role, ExpectedAbilities]>([
    [
      "OWNER",
      { canList: true, canCreate: true, canUpdate: true, canStatus: true, canDelete: true },
    ],
    [
      "ADMIN",
      { canList: true, canCreate: true, canUpdate: true, canStatus: true, canDelete: false },
    ],
    [
      "MANAGER",
      { canList: true, canCreate: true, canUpdate: true, canStatus: true, canDelete: false },
    ],
    [
      "EMPLOYEE",
      { canList: true, canCreate: false, canUpdate: true, canStatus: true, canDelete: false },
    ],
    [
      "CLIENT",
      { canList: true, canCreate: false, canUpdate: false, canStatus: false, canDelete: false },
    ],
  ])("%s mirrors the backend RBAC", (role, expected) => {
    expect(getAppointmentAbilities(role)).toEqual(expected);
  });

  it("denies everything when there is no logged user", () => {
    expect(getAppointmentAbilities(null)).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canStatus: false,
      canDelete: false,
    });
  });

  it("gives update and status the same permission (APPOINTMENT_UPDATE)", () => {
    for (const role of ALL_ROLES) {
      const abilities = getAppointmentAbilities(role);
      expect(abilities.canStatus).toBe(abilities.canUpdate);
    }
  });

  it("only OWNER can delete (APPOINTMENT_DELETE)", () => {
    for (const role of ALL_ROLES) {
      const abilities = getAppointmentAbilities(role);
      expect(abilities.canDelete).toBe(role === "OWNER");
    }
  });
});