import { describe, expect, it } from "vitest";
import {
  canAssignEmployeeRole,
  getAssignableEmployeeRoles,
  getEmployeeAbilities,
} from "./employeePermissions";

describe("getEmployeeAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getEmployeeAbilities(null)).toEqual({
      canList: false,
      canCreate: false,
      canEdit: false,
      canActivate: false,
      canDeactivate: false,
      canDelete: false,
    });
  });

  it("gives OWNER every ability including delete", () => {
    expect(getEmployeeAbilities("OWNER")).toEqual({
      canList: true,
      canCreate: true,
      canEdit: true,
      canActivate: true,
      canDeactivate: true,
      canDelete: true,
    });
  });

  it("gives ADMIN list/create/edit/toggle but not delete", () => {
    expect(getEmployeeAbilities("ADMIN")).toEqual({
      canList: true,
      canCreate: true,
      canEdit: true,
      canActivate: true,
      canDeactivate: true,
      canDelete: false,
    });
  });

  it("denies everything for MANAGER", () => {
    expect(getEmployeeAbilities("MANAGER")).toEqual({
      canList: false,
      canCreate: false,
      canEdit: false,
      canActivate: false,
      canDeactivate: false,
      canDelete: false,
    });
  });

  it("denies everything for EMPLOYEE", () => {
    expect(getEmployeeAbilities("EMPLOYEE")).toEqual({
      canList: false,
      canCreate: false,
      canEdit: false,
      canActivate: false,
      canDeactivate: false,
      canDelete: false,
    });
  });

  it("denies everything for the CLIENT role", () => {
    expect(getEmployeeAbilities("CLIENT")).toEqual({
      canList: false,
      canCreate: false,
      canEdit: false,
      canActivate: false,
      canDeactivate: false,
      canDelete: false,
    });
  });
});

describe("canAssignEmployeeRole", () => {
  it("denies assignment when there is no authenticated user", () => {
    expect(canAssignEmployeeRole(null, "EMPLOYEE")).toBe(false);
  });

  it("allows OWNER to assign any team role", () => {
    expect(canAssignEmployeeRole("OWNER", "OWNER")).toBe(true);
    expect(canAssignEmployeeRole("OWNER", "ADMIN")).toBe(true);
    expect(canAssignEmployeeRole("OWNER", "MANAGER")).toBe(true);
    expect(canAssignEmployeeRole("OWNER", "EMPLOYEE")).toBe(true);
  });

  it("allows ADMIN to assign ADMIN and below but never OWNER", () => {
    expect(canAssignEmployeeRole("ADMIN", "OWNER")).toBe(false);
    expect(canAssignEmployeeRole("ADMIN", "ADMIN")).toBe(true);
    expect(canAssignEmployeeRole("ADMIN", "MANAGER")).toBe(true);
    expect(canAssignEmployeeRole("ADMIN", "EMPLOYEE")).toBe(true);
  });

  it("allows a role to assign itself and roles below it", () => {
    expect(canAssignEmployeeRole("MANAGER", "MANAGER")).toBe(true);
    expect(canAssignEmployeeRole("MANAGER", "EMPLOYEE")).toBe(true);
    expect(canAssignEmployeeRole("MANAGER", "ADMIN")).toBe(false);
    expect(canAssignEmployeeRole("EMPLOYEE", "EMPLOYEE")).toBe(true);
    expect(canAssignEmployeeRole("EMPLOYEE", "MANAGER")).toBe(false);
  });

  it("denies CLIENT as an assignable team role", () => {
    expect(canAssignEmployeeRole("OWNER", "CLIENT")).toBe(false);
  });
});

describe("getAssignableEmployeeRoles", () => {
  it("returns an empty list without an authenticated user", () => {
    expect(getAssignableEmployeeRoles(null)).toEqual([]);
  });

  it("returns every team role for OWNER", () => {
    expect(getAssignableEmployeeRoles("OWNER")).toEqual([
      "OWNER",
      "ADMIN",
      "MANAGER",
      "EMPLOYEE",
    ]);
  });

  it("returns ADMIN and below for ADMIN", () => {
    expect(getAssignableEmployeeRoles("ADMIN")).toEqual([
      "ADMIN",
      "MANAGER",
      "EMPLOYEE",
    ]);
  });

  it("returns only the role itself and below for MANAGER", () => {
    expect(getAssignableEmployeeRoles("MANAGER")).toEqual([
      "MANAGER",
      "EMPLOYEE",
    ]);
  });

  it("returns only EMPLOYEE for EMPLOYEE", () => {
    expect(getAssignableEmployeeRoles("EMPLOYEE")).toEqual(["EMPLOYEE"]);
  });

  it("returns an empty list for CLIENT", () => {
    expect(getAssignableEmployeeRoles("CLIENT")).toEqual([]);
  });
});