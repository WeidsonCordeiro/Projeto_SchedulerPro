import { describe, expect, it } from "vitest";
import { getClientAbilities } from "./clientPermissions";

describe("getClientAbilities", () => {
  it("denies everything when there is no authenticated user", () => {
    expect(getClientAbilities(null)).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canInvite: false,
    });
  });

  it("gives OWNER every ability including delete", () => {
    expect(getClientAbilities("OWNER")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canInvite: true,
    });
  });

  it("gives ADMIN create/update/read but not delete, and allows invite", () => {
    expect(getClientAbilities("ADMIN")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      canInvite: true,
    });
  });

  it("gives MANAGER create/update/read but neither delete nor invite", () => {
    expect(getClientAbilities("MANAGER")).toEqual({
      canList: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      canInvite: false,
    });
  });

  it("gives EMPLOYEE read only", () => {
    expect(getClientAbilities("EMPLOYEE")).toEqual({
      canList: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canInvite: false,
    });
  });

  it("denies everything for the CLIENT role", () => {
    expect(getClientAbilities("CLIENT")).toEqual({
      canList: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canInvite: false,
    });
  });
});