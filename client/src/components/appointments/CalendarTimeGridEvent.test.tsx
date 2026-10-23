import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CalendarTimeGridEvent, {
  resolveTimeGridEventDisplay,
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

describe("resolveTimeGridEventDisplay", () => {
  it("uses minimal tier below 36px", () => {
    expect(resolveTimeGridEventDisplay(24)).toEqual({
      tier: "minimal",
      timeMode: "startOnly",
      showClient: true,
      showService: false,
      showStatusText: false,
    });
  });

  it("uses compact tier from 36px to 51px", () => {
    expect(resolveTimeGridEventDisplay(40).tier).toBe("compact");
    expect(resolveTimeGridEventDisplay(40).timeMode).toBe("range");
  });

  it("uses comfortable tier from 52px to 71px", () => {
    const d = resolveTimeGridEventDisplay(60);
    expect(d.tier).toBe("comfortable");
    expect(d.showService).toBe(true);
    expect(d.showStatusText).toBe(false);
  });

  it("uses expanded tier from 72px", () => {
    const d = resolveTimeGridEventDisplay(80);
    expect(d.tier).toBe("expanded");
    expect(d.showStatusText).toBe(true);
  });
});

describe("CalendarTimeGridEvent", () => {
  it("shows start time only in minimal tier", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={24} />,
    );
    const time = container.querySelector(".calendar-event-time");
    expect(time?.textContent).toMatch(/10:00/);
    expect(time?.textContent).not.toMatch(/–/);
    expect(container.querySelector(".calendar-event-service")).toBeNull();
    expect(container.querySelector(".calendar-event-status")).toBeNull();
    expect(screen.getByText("Agendado", { selector: ".visually-hidden" })).toBeInTheDocument();
  });

  it("shows range and client in compact tier without service or status text", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={40} />,
    );
    expect(container.querySelector(".calendar-event-time")?.textContent).toContain("–");
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(container.querySelector(".calendar-event-service")).toBeNull();
    expect(container.querySelector(".calendar-event-status")).toBeNull();
    expect(container.querySelector(".calendar-week-event--compact")).not.toBeNull();
  });

  it("shows service in comfortable tier", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={60} />,
    );
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(container.querySelector(".calendar-event-status")).toBeNull();
  });

  it("shows status text in expanded tier", () => {
    render(<CalendarTimeGridEvent {...baseProps} heightPx={80} />);
    expect(screen.getByText("Agendado", { selector: ".calendar-event-status" })).toBeInTheDocument();
  });

  it("keeps status colour class on the block", () => {
    const { container } = render(
      <CalendarTimeGridEvent {...baseProps} heightPx={24} />,
    );
    expect(container.querySelector(".status-scheduled")).not.toBeNull();
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
