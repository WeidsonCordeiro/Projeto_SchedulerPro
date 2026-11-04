import { describe, expect, it } from "vitest";
import { getCompanyAbilities } from "./companyPermissions";

describe("getCompanyAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getCompanyAbilities(null)).toEqual({
      canView: false,
      canUpdate: false,
      canActivate: false,
      canDeactivate: false,
    });
  });

  it("gives OWNER view, update and lifecycle", () => {
    expect(getCompanyAbilities("OWNER")).toEqual({
      canView: true,
      canUpdate: true,
      canActivate: true,
      canDeactivate: true,
    });
  });

  it("gives ADMIN view and update only", () => {
    expect(getCompanyAbilities("ADMIN")).toEqual({
      canView: true,
      canUpdate: true,
      canActivate: false,
      canDeactivate: false,
    });
  });

  it("denies MANAGER", () => {
    expect(getCompanyAbilities("MANAGER")).toEqual({
      canView: false,
      canUpdate: false,
      canActivate: false,
      canDeactivate: false,
    });
  });

  it("denies EMPLOYEE", () => {
    expect(getCompanyAbilities("EMPLOYEE")).toEqual({
      canView: false,
      canUpdate: false,
      canActivate: false,
      canDeactivate: false,
    });
  });

  it("denies the CLIENT role", () => {
    expect(getCompanyAbilities("CLIENT")).toEqual({
      canView: false,
      canUpdate: false,
      canActivate: false,
      canDeactivate: false,
    });
  });
});
