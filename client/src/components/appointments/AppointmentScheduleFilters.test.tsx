import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentScheduleFilters from "./AppointmentScheduleFilters";
import { EMPTY_APPOINTMENT_FILTER_CRITERIA } from "../../config/appointmentFilters";

describe("AppointmentScheduleFilters", () => {
  it("toggles status with aria-pressed", () => {
    const onCriteriaChange = vi.fn();
    render(
      <AppointmentScheduleFilters
        criteria={EMPTY_APPOINTMENT_FILTER_CRITERIA}
        onCriteriaChange={onCriteriaChange}
        employees={[]}
        showEmployeeFilter={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirmado" }));
    expect(onCriteriaChange).toHaveBeenCalledWith({
      statuses: new Set(["confirmed"]),
      employeeId: null,
    });
  });

  it("shows clear button when filters are active", () => {
    render(
      <AppointmentScheduleFilters
        criteria={{ statuses: new Set(["scheduled"]), employeeId: null }}
        onCriteriaChange={vi.fn()}
        employees={[]}
        showEmployeeFilter={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Limpar filtros" }),
    ).toBeInTheDocument();
  });

  it("hides employee select when showEmployeeFilter is false", () => {
    render(
      <AppointmentScheduleFilters
        criteria={EMPTY_APPOINTMENT_FILTER_CRITERIA}
        onCriteriaChange={vi.fn()}
        employees={[
          {
            id: "e1",
            name: "Maria",
            role: "EMPLOYEE",
            companyId: "c",
            email: "m@test.com",
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
        showEmployeeFilter={false}
      />,
    );

    expect(screen.queryByLabelText("Funcionário")).not.toBeInTheDocument();
  });

  it("renders employee select when enabled", () => {
    render(
      <AppointmentScheduleFilters
        criteria={EMPTY_APPOINTMENT_FILTER_CRITERIA}
        onCriteriaChange={vi.fn()}
        employees={[
          {
            id: "e1",
            name: "Maria Silva",
            role: "EMPLOYEE",
            companyId: "c",
            email: "m@test.com",
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
        showEmployeeFilter={true}
      />,
    );

    expect(screen.getByLabelText("Funcionário")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Maria Silva" })).toBeInTheDocument();
  });
});
