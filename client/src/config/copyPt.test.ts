import { describe, expect, it } from "vitest";
import {
  COPY_ACCESS_DENIED,
  COPY_AVAILABILITY_SELF_VIEW,
  COPY_EMPLOYEE_SELF_LABEL,
} from "./copyPt";

describe("copyPt", () => {
  it("uses PT-PT access denied wording", () => {
    expect(COPY_ACCESS_DENIED).toMatch(/aceder/);
    expect(COPY_ACCESS_DENIED).not.toMatch(/acessar|Você/i);
  });

  it("exposes availability self-view copy", () => {
    expect(COPY_AVAILABILITY_SELF_VIEW).toContain("Está a ver");
  });

  it("labels the current user row in employees", () => {
    expect(COPY_EMPLOYEE_SELF_LABEL).toBe("A sua conta");
  });
});