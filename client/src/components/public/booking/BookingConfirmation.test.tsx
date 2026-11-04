import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import BookingConfirmation from "./BookingConfirmation";
import type { PublicAppointment } from "../../../types/publicAppointment";

const appointment = {
  id: "apt1",
  startAt: "2026-10-08T09:00:00.000Z",
  endAt: "2026-10-08T09:45:00.000Z",
  status: "scheduled",
  clientName: "Maria Silva",
  service: { id: "svc1", name: "Corte de cabelo" },
  employee: { id: "emp1", name: "João Silva", avatarUrl: null },
} as PublicAppointment;

const service = {
  id: "svc1",
  name: "Corte de cabelo",
  description: null,
  durationMinutes: 45,
  price: 25,
};

const slot = {
  startAt: "2026-10-08T09:00:00.000+01:00",
  endAt: "2026-10-08T09:45:00.000+01:00",
};

const baseProps = {
  appointment,
  service,
  slot,
  timezone: "Europe/Lisbon",
  publicAccessToken: "tok-abc-123",
  onRestart: vi.fn(),
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BookingConfirmation {...baseProps} />
    </MemoryRouter>,
  );
}

describe("BookingConfirmation", () => {
  it("confirms that the booking was created", () => {
    renderAt("/agendar/empresa/company1");

    expect(
      screen.getByRole("heading", { name: "Agendamento confirmado" }),
    ).toBeInTheDocument();
  });

  it("repeats the appointment details the user chose", () => {
    renderAt("/agendar/empresa/company1");

    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("Quinta-feira, 8 de outubro de 2026")).toBeInTheDocument();
    expect(screen.getByText("às 09:00")).toBeInTheDocument();
  });

  it("links to the existing management route with the token", () => {
    renderAt("/agendar/empresa/company1");

    // Reutiliza a página da Parte 3, em /agendar/:token.
    expect(screen.getByRole("link", { name: /Abrir agendamento/ })).toHaveAttribute(
      "href",
      "/agendar/tok-abc-123",
    );
  });

  it("encodes the token in the link", () => {
    render(
      <MemoryRouter initialEntries={["/agendar/empresa/company1"]}>
        <BookingConfirmation {...baseProps} publicAccessToken="a/b c" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Abrir agendamento/ })).toHaveAttribute(
      "href",
      "/agendar/a%2Fb%20c",
    );
  });

  it("warns that the link cannot be recovered later", () => {
    renderAt("/agendar/empresa/company1");

    expect(screen.getByText(/não será possível recuperá-lo/i)).toBeInTheDocument();
  });

  it("offers a new booking", () => {
    const onRestart = vi.fn();
    render(
      <MemoryRouter initialEntries={["/agendar/empresa/company1"]}>
        <BookingConfirmation {...baseProps} onRestart={onRestart} />
      </MemoryRouter>,
    );

    screen.getByRole("button", { name: "Fazer novo agendamento" }).click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("does not persist the token anywhere", () => {
    renderAt("/agendar/empresa/company1");

    // O token puro só vive em memória: o backend guarda o hash, e escrevê-lo em
    // localStorage deixaria o link acessível a qualquer script de outra origem.
    expect(window.localStorage.getItem("publicAccessToken")).toBeNull();
    expect(window.sessionStorage.getItem("publicAccessToken")).toBeNull();
    expect(document.cookie).not.toContain("tok-abc-123");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});