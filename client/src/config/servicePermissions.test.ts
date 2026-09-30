import { describe, expect, it } from "vitest";
import { getServiceAbilities } from "./servicePermissions";

describe("getServiceAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getServiceAbilities(null)).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("gives OWNER every ability including delete", () => {
    expect(getServiceAbilities("OWNER")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    });
  });

  it("gives ADMIN create/update/read but not delete", () => {
    expect(getServiceAbilities("ADMIN")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
    });
  });

  it("gives MANAGER read only", () => {
    expect(getServiceAbilities("MANAGER")).toEqual({
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("gives EMPLOYEE read only", () => {
    expect(getServiceAbilities("EMPLOYEE")).toEqual({
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("denies everything for the CLIENT role", () => {
    expect(getServiceAbilities("CLIENT")).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
  });
});