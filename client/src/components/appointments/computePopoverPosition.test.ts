import { describe, expect, it } from "vitest";
import { computePopoverPosition } from "./computePopoverPosition";

describe("computePopoverPosition", () => {
  it("places popover below anchor when there is room", () => {
    const anchor = new DOMRect(100, 100, 50, 20);
    const pos = computePopoverPosition(anchor, { width: 200, height: 120 }, 800, 600);
    expect(pos.top).toBeGreaterThan(anchor.bottom);
    expect(pos.left).toBeGreaterThanOrEqual(8);
  });

  it("clamps horizontal position inside viewport", () => {
    const anchor = new DOMRect(0, 100, 40, 20);
    const pos = computePopoverPosition(anchor, { width: 200, height: 100 }, 300, 600);
    expect(pos.left).toBe(8);
  });
});
