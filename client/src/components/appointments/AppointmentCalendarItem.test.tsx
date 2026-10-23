import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentCalendarItem from "./AppointmentCalendarItem";
import type { Appointment } from "../../types/appointment";

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-09-10T09:00:00.000Z",
    endAt: "2026-09-10T09:30:00.000Z",
    status: "scheduled",
    notes: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

vi.mock("../../store", () => ({
  useAppSelector: () => "Europe/Lisbon",
}));

describe("AppointmentCalendarItem", () => {
  it("renders service background without status stripe classes", () => {
    const { container } = render(
      <AppointmentCalendarItem
        appointment={makeAppointment()}
        clientName="Maria"
        serviceName="Corte"
        onClick={() => {}}
      />,
    );
    const button = container.querySelector("button");
    expect(button?.className).not.toMatch(/calendar-status-stripe/);
    expect((button as HTMLElement).style.backgroundColor).not.toBe("");
    expect(screen.getByText("Agendado", { selector: ".visually-hidden" })).toBeInTheDocument();
  });

  it("shows visible status text when showStatusText is true", () => {
    render(
      <AppointmentCalendarItem
        appointment={makeAppointment({ status: "confirmed" })}
        showStatusText
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Confirmado", { selector: ".calendar-event-status" })).toBeInTheDocument();
  });
});
