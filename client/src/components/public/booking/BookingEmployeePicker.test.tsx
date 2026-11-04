import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingEmployeePicker from "./BookingEmployeePicker";
import type { PublicEmployee } from "../../../types/publicBooking";

const employees: PublicEmployee[] = [
  { id: "emp1", name: "João Silva", avatarUrl: "https://cdn/joao.png" },
  { id: "emp2", name: "Ana Costa", avatarUrl: null },
];

describe("BookingEmployeePicker", () => {
  it("shows every professional returned by the API", () => {
    render(
      <BookingEmployeePicker
        employees={employees}
        selectedEmployeeId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Ana Costa")).toBeInTheDocument();
  });

  it("does not filter by service, because the backend has no service × employee relation", () => {
    // A lista chega inteira; o componente não recebe `serviceId` e portanto
    // não tem como esconder ninguém. Este teste fixa essa garantia.
    render(
      <BookingEmployeePicker
        employees={employees}
        selectedEmployeeId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(employees.length);
  });

  it("renders initials when the professional has no photo", () => {
    render(
      <BookingEmployeePicker
        employees={[employees[1]]}
        selectedEmployeeId={null}
        onSelect={vi.fn()}
      />,
    );

    // `ImageAvatar` desenha as iniciais; sem elas o cartão ficaria com um
    // espaço vazio sem explicação.
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("shows the photo when one exists", () => {
    render(
      <BookingEmployeePicker
        employees={[employees[0]]}
        selectedEmployeeId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: /João Silva/i })).toHaveAttribute(
      "src",
      "https://cdn/joao.png",
    );
  });

  it("reports the id of the chosen professional", () => {
    const onSelect = vi.fn();
    render(
      <BookingEmployeePicker
        employees={employees}
        selectedEmployeeId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Ana Costa/ }));

    expect(onSelect).toHaveBeenCalledWith("emp2");
  });

  it("uses a single radio group name, so the choice is exclusive", () => {
    render(
      <BookingEmployeePicker
        employees={employees}
        selectedEmployeeId="emp1"
        onSelect={vi.fn()}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("name", "booking-employee");
    expect(radios[1]).toHaveAttribute("name", "booking-employee");
    expect(radios[0]).toBeChecked();
  });
});