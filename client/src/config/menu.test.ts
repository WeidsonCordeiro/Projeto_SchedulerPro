import { describe, expect, it } from "vitest";
import { getMenuItemsForRole, MENU_ITEMS } from "./menu";
import type { Role } from "../types/auth";

describe("menu", () => {
  it("uses only the existing roles", () => {
    const allowedRoles: Role[] = ["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"];
    for (const item of MENU_ITEMS) {
      for (const role of item.roles) {
        expect(allowedRoles).toContain(role);
      }
    }
  });

  it("returns no items for an anonymous user", () => {
    expect(getMenuItemsForRole(null)).toEqual([]);
  });

  it("filters items by role", () => {
    expect(getMenuItemsForRole("OWNER").length).toBeGreaterThan(0);
    expect(getMenuItemsForRole("CLIENT").every((i) => i.roles.includes("CLIENT"))).toBe(
      true,
    );
  });

  it("gives every item a label and a path", () => {
    for (const item of MENU_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.path.startsWith("/")).toBe(true);
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });
});
