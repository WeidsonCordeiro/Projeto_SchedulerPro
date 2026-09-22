import { describe, expect, it } from "vitest";
import { getReportAbilities } from "./reportPermissions";

describe("getReportAbilities", () => {
  it("permite acesso para OWNER", () => {
    expect(getReportAbilities("OWNER")).toEqual({ canView: true });
  });

  it("permite acesso para ADMIN", () => {
    expect(getReportAbilities("ADMIN")).toEqual({ canView: true });
  });

  it("permite acesso para MANAGER", () => {
    expect(getReportAbilities("MANAGER")).toEqual({ canView: true });
  });

  it("bloqueia EMPLOYEE", () => {
    expect(getReportAbilities("EMPLOYEE")).toEqual({ canView: false });
  });

  it("bloqueia CLIENT", () => {
    expect(getReportAbilities("CLIENT")).toEqual({ canView: false });
  });

  it("bloqueia usuário anônimo", () => {
    expect(getReportAbilities(null)).toEqual({ canView: false });
  });
});