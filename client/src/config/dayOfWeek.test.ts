import { describe, expect, it } from "vitest";
import {
  DAY_LABELS,
  DAY_ORDER,
  SHORT_DAY_LABELS,
  getDayLabel,
} from "./dayOfWeek";

describe("dayOfWeek mapping", () => {
  it("follows the backend enum order with SUNDAY as 0", () => {
    expect(DAY_ORDER).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("maps every numeric day to its label without shifting", () => {
    expect(getDayLabel(0)).toBe("Domingo");
    expect(getDayLabel(1)).toBe("Segunda-feira");
    expect(getDayLabel(2)).toBe("Terça-feira");
    expect(getDayLabel(3)).toBe("Quarta-feira");
    expect(getDayLabel(4)).toBe("Quinta-feira");
    expect(getDayLabel(5)).toBe("Sexta-feira");
    expect(getDayLabel(6)).toBe("Sábado");
  });

  it("exposes short labels matching the same values", () => {
    expect(SHORT_DAY_LABELS[0]).toBe("Dom");
    expect(SHORT_DAY_LABELS[1]).toBe("Seg");
    expect(SHORT_DAY_LABELS[6]).toBe("Sáb");
  });

  it("keeps full and short label maps consistent with the day enum", () => {
    const values = Object.keys(DAY_LABELS).sort();
    const shorts = Object.keys(SHORT_DAY_LABELS).sort();
    const expected = ["0", "1", "2", "3", "4", "5", "6"];
    expect(values).toEqual(expected);
    expect(shorts).toEqual(expected);
  });
});