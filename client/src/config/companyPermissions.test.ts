import { describe, expect, it } from "vitest";
import { getCompanyAbilities } from "./companyPermissions";

describe("getCompanyAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getCompanyAbilities(null)).toEqual({
      canView: false,
      canUpdate: false,
    });
  });

  it("gives OWNER view and update", () => {
    expect(getCompanyAbilities("OWNER")).toEqual({
      canView: true,
      canUpdate: true,
    });
  });

  it("gives ADMIN view and update", () => {
    expect(getCompanyAbilities("ADMIN")).toEqual({
      canView: true,
      canUpdate: true,
    });
  });

  it("denies MANAGER", () => {
    expect(getCompanyAbilities("MANAGER")).toEqual({
      canView: false,
      canUpdate: false,
    });
  });

  it("denies EMPLOYEE", () => {
    expect(getCompanyAbilities("EMPLOYEE")).toEqual({
      canView: false,
      canUpdate: false,
    });
  });

  it("denies the CLIENT role", () => {
    expect(getCompanyAbilities("CLIENT")).toEqual({
      canView: false,
      canUpdate: false,
    });
  });
});