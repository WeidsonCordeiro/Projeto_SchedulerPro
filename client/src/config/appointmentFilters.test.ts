import { describe, expect, it } from "vitest";
import {
  EMPTY_APPOINTMENT_FILTER_CRITERIA,
  filterAppointments,
  hasActiveFilters,
} from "./appointmentFilters";
import type { Appointment } from "../types/appointment";

function makeAppointment(
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id: "a1",
    companyId: "c1",
    clientId: "cl1",
    serviceId: "s1",
    employeeId: "e1",
    startAt: "2026-09-10T09:00:00.000Z",
    endAt: "2026-09-10T09:30:00.000Z",
    status: "scheduled",
    notes: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const sample = [
  makeAppointment({ id: "1", status: "scheduled", employeeId: "emp-a" }),
  makeAppointment({ id: "2", status: "confirmed", employeeId: "emp-a" }),
  makeAppointment({ id: "3", status: "cancelled", employeeId: "emp-b" }),
];

describe("filterAppointments", () => {
  it("returns all when no filters active", () => {
    expect(filterAppointments(sample, EMPTY_APPOINTMENT_FILTER_CRITERIA)).toEqual(
      sample,
    );
    expect(hasActiveFilters(EMPTY_APPOINTMENT_FILTER_CRITERIA)).toBe(false);
  });

  it("filters by a single status", () => {
    const result = filterAppointments(sample, {
      statuses: new Set(["confirmed"]),
      employeeId: null,
    });
    expect(result.map((a) => a.id)).toEqual(["2"]);
  });

  it("filters by multiple statuses (OR)", () => {
    const result = filterAppointments(sample, {
      statuses: new Set(["scheduled", "cancelled"]),
      employeeId: null,
    });
    expect(result.map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("filters by employee", () => {
    const result = filterAppointments(sample, {
      statuses: new Set(),
      employeeId: "emp-b",
    });
    expect(result.map((a) => a.id)).toEqual(["3"]);
  });

  it("combines status and employee with AND", () => {
    const result = filterAppointments(sample, {
      statuses: new Set(["scheduled", "confirmed"]),
      employeeId: "emp-a",
    });
    expect(result.map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("matches employeeId even when employee not in lookup maps", () => {
    const result = filterAppointments(
      [makeAppointment({ employeeId: "unknown-emp" })],
      { statuses: new Set(), employeeId: "unknown-emp" },
    );
    expect(result).toHaveLength(1);
  });
});
