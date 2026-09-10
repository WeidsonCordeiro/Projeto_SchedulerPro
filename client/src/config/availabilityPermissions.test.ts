import { describe, expect, it } from "vitest";
import { getAvailabilityAbilities } from "./availabilityPermissions";

describe("getAvailabilityAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getAvailabilityAbilities(null)).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("gives OWNER every ability including delete", () => {
    expect(getAvailabilityAbilities("OWNER")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    });
  });

  it("gives ADMIN list/create/update but not delete", () => {
    expect(getAvailabilityAbilities("ADMIN")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
    });
  });

  it("gives MANAGER list and update but not create or delete", () => {
    expect(getAvailabilityAbilities("MANAGER")).toEqual({
      canList: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
    });
  });

  it("gives EMPLOYEE read only", () => {
    expect(getAvailabilityAbilities("EMPLOYEE")).toEqual({
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("denies everything for the CLIENT role", () => {
    expect(getAvailabilityAbilities("CLIENT")).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });
});