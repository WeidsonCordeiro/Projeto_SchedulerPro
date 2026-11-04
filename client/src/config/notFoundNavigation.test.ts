import { describe, expect, it } from "vitest";
import {
  getNotFoundHomeLabel,
  getNotFoundHomePath,
} from "./notFoundNavigation";

describe("getNotFoundHomePath", () => {
  it("sends guests to login", () => {
    expect(getNotFoundHomePath(false, false, undefined)).toBe("/login");
  });

  it("sends users who must change password to change-password", () => {
    expect(getNotFoundHomePath(true, true, "OWNER")).toBe("/change-password");
  });

  it("sends clients to the portal", () => {
    expect(getNotFoundHomePath(true, false, "CLIENT")).toBe("/portal");
  });

  it("sends staff to the dashboard", () => {
    expect(getNotFoundHomePath(true, false, "ADMIN")).toBe("/");
  });
});

describe("getNotFoundHomeLabel", () => {
  it("labels the guest action", () => {
    expect(getNotFoundHomeLabel(false, false, undefined)).toBe("Ir para o início");
  });

  it("labels the must-change-password action", () => {
    expect(getNotFoundHomeLabel(true, true, "EMPLOYEE")).toBe("Alterar senha");
  });

  it("labels the client action", () => {
    expect(getNotFoundHomeLabel(true, false, "CLIENT")).toBe("Ir para o portal");
  });

  it("labels the staff action", () => {
    expect(getNotFoundHomeLabel(true, false, "MANAGER")).toBe("Ir para o painel");
  });
});
