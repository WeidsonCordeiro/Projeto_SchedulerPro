import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentsViewSwitcher from "./AppointmentsViewSwitcher";

describe("AppointmentsViewSwitcher", () => {
  it("renders view buttons and navigation", () => {
    render(
      <AppointmentsViewSwitcher
        viewType="month"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="Setembro 2026"
      />,
    );

    expect(screen.getByRole("button", { name: "Mês" })).toHaveClass("btn-primary");
    expect(screen.getByRole("button", { name: "Semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lista" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
    expect(document.querySelector(".calendar-toolbar-nav")).toBeTruthy();
    expect(document.querySelector(".calendar-toolbar-period")).toBeTruthy();
    expect(document.querySelector(".calendar-toolbar-views")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Visualização" })).toBeInTheDocument();
  });

  it("marks the active view with aria-pressed", () => {
    render(
      <AppointmentsViewSwitcher
        viewType="list"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="Lista de agendamentos"
      />,
    );

    expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Mês" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls the right handlers", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();
    const onViewTypeChange = vi.fn();
    render(
      <AppointmentsViewSwitcher
        viewType="month"
        onViewTypeChange={onViewTypeChange}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        label="Setembro 2026"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
    expect(onToday).toHaveBeenCalled();
    expect(onViewTypeChange).toHaveBeenCalledWith("week");
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(onViewTypeChange).toHaveBeenCalledWith("list");
  });
});
