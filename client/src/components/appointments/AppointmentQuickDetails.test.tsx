import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentQuickDetails from "./AppointmentQuickDetails";
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

const anchorRect = new DOMRect(100, 200, 80, 24);

describe("AppointmentQuickDetails", () => {
  it("renders available fields on desktop popover", () => {
    render(
      <AppointmentQuickDetails
        appointment={makeAppointment()}
        clientName="Maria Silva"
        serviceName="Corte de cabelo"
        employeeName="João Costa"
        servicePrice={15.5}
        timezone="Europe/Lisbon"
        anchorRect={anchorRect}
        isMobilePanel={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("João Costa")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(screen.getByText(/15,50/)).toBeInTheDocument();
  });

  it("omits optional fields when unavailable", () => {
    render(
      <AppointmentQuickDetails
        appointment={makeAppointment()}
        clientName="Maria Silva"
        serviceName="—"
        employeeName="—"
        timezone="Europe/Lisbon"
        anchorRect={anchorRect}
        isMobilePanel={false}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Funcionário")).not.toBeInTheDocument();
    expect(screen.queryByText("Preço")).not.toBeInTheDocument();
  });

  it("closes via button and Escape", () => {
    const onClose = vi.fn();
    render(
      <AppointmentQuickDetails
        appointment={makeAppointment()}
        clientName="Maria Silva"
        serviceName="Corte"
        timezone="Europe/Lisbon"
        anchorRect={anchorRect}
        isMobilePanel={false}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders mobile modal layout", () => {
    render(
      <AppointmentQuickDetails
        appointment={makeAppointment()}
        clientName="Maria Silva"
        serviceName="Corte"
        timezone="Europe/Lisbon"
        anchorRect={null}
        isMobilePanel={true}
        onClose={vi.fn()}
      />,
    );

    expect(document.querySelector(".appointment-quick-details-modal")).not.toBeNull();
  });
});
