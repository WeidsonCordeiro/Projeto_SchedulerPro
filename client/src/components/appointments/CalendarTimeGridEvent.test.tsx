import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CalendarTimeGridEvent, {
  shouldShowTimeGridStatusText,
  TIME_GRID_STATUS_TEXT_MIN_PX,
} from "./CalendarTimeGridEvent";
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

const baseProps = {
  appointment: makeAppointment(),
  clientName: "Maria Silva",
  serviceName: "Corte de cabelo",
  timezone: "Europe/Lisbon",
};

describe("shouldShowTimeGridStatusText", () => {
  it("is false below expanded threshold", () => {
    expect(shouldShowTimeGridStatusText(TIME_GRID_STATUS_TEXT_MIN_PX - 1)).toBe(
      false,
    );
  });

  it("is true at or above expanded threshold", () => {
    expect(shouldShowTimeGridStatusText(TIME_GRID_STATUS_TEXT_MIN_PX)).toBe(
      true,
    );
  });
});

describe("CalendarTimeGridEvent", () => {
  it("uses start time only and month-aligned comfortable surface", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={24} />,
    );
    const time = container.querySelector(".calendar-event-time");
    expect(time?.textContent).toMatch(/10:00/);
    expect(time?.textContent).not.toMatch(/–/);
    const block = container.querySelector(".calendar-week-event");
    expect(block).toHaveClass("calendar-week-event--comfortable");
    expect(block).toHaveClass("calendar-item");
    expect(block).not.toHaveClass("calendar-week-event--minimal");
  });

  it("always shows client and service like month pills", () => {
    render(<CalendarTimeGridEvent {...baseProps} heightPx={24} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("Agendado", { selector: ".visually-hidden" })).toBeInTheDocument();
  });

  it("shows status text in tall blocks only", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={80} />,
    );
    expect(screen.getByText("Agendado", { selector: ".calendar-event-status" })).toBeInTheDocument();
    expect(container.querySelector(".calendar-week-event--comfortable")).not.toBeNull();
  });

  it("applies service background without status stripe classes", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={24} />,
    );
    const block = container.querySelector(".calendar-week-event");
    expect(block).not.toHaveClass("calendar-status-stripe--scheduled");
    expect((block as HTMLElement).style.backgroundColor).not.toBe("");
    expect(block).not.toHaveClass("status-scheduled");
  });

  it("applies muted style for terminal statuses", () => {
    const { container } = render(
      <CalendarTimeGridEvent
        {...baseProps}
        appointment={makeAppointment({ status: "cancelled" })}
        heightPx={24}
      />,
    );
    expect(container.querySelector(".calendar-week-event")).toHaveClass(
      "calendar-event--muted",
    );
  });

  it("exposes full details in title and aria-label for long names", () => {
    const longClient = "Cliente com nome muito longo para truncar na grelha";
    const { container } = render(
      <CalendarTimeGridEvent
        {...baseProps}
        clientName={longClient}
        heightPx={40}
      />,
    );
    const block = container.querySelector(".calendar-week-event");
    expect(block?.getAttribute("title")).toContain(longClient);
    expect(block?.getAttribute("aria-label")).toContain(longClient);
    expect(screen.getByText(longClient)).toHaveClass("text-truncate");
  });
});
