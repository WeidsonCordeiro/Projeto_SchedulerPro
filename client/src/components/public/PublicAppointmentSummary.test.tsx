import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PublicAppointmentSummary from "./PublicAppointmentSummary";
import type { PublicAppointment } from "../../types/publicAppointment";

function makeAppointment(
  overrides: Partial<PublicAppointment> = {},
): PublicAppointment {
  return {
    id: "apt1",
    startAt: "2026-10-10T14:30:00.000Z",
    endAt: "2026-10-10T15:00:00.000Z",
    status: "scheduled",
    clientName: "Maria Silva",
    service: { id: "svc1", name: "Corte de cabelo" },
    employee: { id: "emp1", name: "João Silva", avatarUrl: null },
    ...overrides,
  };
}

describe("PublicAppointmentSummary", () => {
  it("shows the service, the professional, the date and the period", () => {
    render(<PublicAppointmentSummary appointment={makeAppointment()} />);

    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("10/10/2026")).toBeInTheDocument();
    expect(screen.getByText("15:30 – 16:00")).toBeInTheDocument();
  });

  it("pairs each label with its value in a definition list", () => {
    const { container } = render(
      <PublicAppointmentSummary appointment={makeAppointment()} />,
    );

    const list = container.querySelector("dl");
    expect(list).not.toBeNull();

    const labels = Array.from(list!.querySelectorAll("dt")).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual([
      "Serviço",
      "Profissional",
      "Data",
      "Horário",
      "Estado",
    ]);
    expect(list!.querySelectorAll("dd")).toHaveLength(labels.length);
  });

  it("translates the status into the application's own wording", () => {
    const { rerender } = render(
      <PublicAppointmentSummary appointment={makeAppointment()} />,
    );
    expect(screen.getByText("Agendado")).toBeInTheDocument();

    rerender(
      <PublicAppointmentSummary
        appointment={makeAppointment({ status: "cancelled" })}
      />,
    );
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("renders the photo when the public contract provides one", () => {
    const { container } = render(
      <PublicAppointmentSummary
        appointment={makeAppointment({
          employee: {
            id: "emp1",
            name: "João Silva",
            avatarUrl: "https://cdn.example/joao.jpg",
          },
        })}
      />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "https://cdn.example/joao.jpg");
    // Decorativa: o nome já está em texto ao lado.
    expect(image).toHaveAttribute("alt", "");
  });

  it("falls back to the initials when there is no photo", () => {
    const { container } = render(
      <PublicAppointmentSummary appointment={makeAppointment()} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("keeps the name visible when the photo URL is broken", () => {
    const { container } = render(
      <PublicAppointmentSummary
        appointment={makeAppointment({
          employee: {
            id: "emp1",
            name: "João Silva",
            avatarUrl: "https://cdn.example/quebrada.jpg",
          },
        })}
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("never renders the public token or internal identifiers", () => {
    const { container } = render(
      <PublicAppointmentSummary appointment={makeAppointment()} />,
    );

    expect(container.textContent).not.toContain("svc1");
    expect(container.textContent).not.toContain("emp1");
    expect(container.textContent).not.toContain("apt1");
    expect(container.textContent).not.toContain("Maria Silva");
  });
});