import { describe, expect, it } from "vitest";
import { canAssignRole, Role } from "../../../src/constants/roles";

describe("hierarquia de roles", () => {
  it.each([
    [Role.OWNER, Role.OWNER], [Role.OWNER, Role.ADMIN], [Role.OWNER, Role.MANAGER], [Role.OWNER, Role.EMPLOYEE], [Role.OWNER, Role.CLIENT],
    [Role.ADMIN, Role.ADMIN], [Role.ADMIN, Role.MANAGER], [Role.ADMIN, Role.EMPLOYEE], [Role.ADMIN, Role.CLIENT],
    [Role.MANAGER, Role.MANAGER], [Role.MANAGER, Role.EMPLOYEE], [Role.MANAGER, Role.CLIENT],
    [Role.EMPLOYEE, Role.EMPLOYEE], [Role.EMPLOYEE, Role.CLIENT],
  ])("%s pode atribuir %s", (actor, target) => expect(canAssignRole(actor, target)).toBe(true));

  it.each([
    [Role.ADMIN, Role.OWNER], [Role.MANAGER, Role.ADMIN], [Role.MANAGER, Role.OWNER],
    [Role.EMPLOYEE, Role.MANAGER], [Role.EMPLOYEE, Role.ADMIN], [Role.EMPLOYEE, Role.OWNER],
    [Role.CLIENT, Role.CLIENT], [Role.CLIENT, Role.EMPLOYEE],
  ])("%s não pode atribuir %s", (actor, target) => expect(canAssignRole(actor, target)).toBe(false));
});
