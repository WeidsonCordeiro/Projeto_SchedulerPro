import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingServicePicker from "./BookingServicePicker";
import type { PublicService } from "../../../types/publicBooking";

const services: PublicService[] = [
  {
    id: "svc1",
    name: "Corte de cabelo",
    description: "Inclui lavagem e secagem",
    durationMinutes: 45,
    price: 25,
  },
  {
    id: "svc2",
    name: "Coloração",
    description: null,
    durationMinutes: 90,
    price: 60.5,
  },
];

describe("BookingServicePicker", () => {
  it("shows the name, the duration and the price of every service", () => {
    render(
      <BookingServicePicker
        services={services}
        selectedServiceId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("25,00")).toBeInTheDocument();
    expect(screen.getByText("Coloração")).toBeInTheDocument();
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
  });

  it("shows the description only when there is one", () => {
    render(
      <BookingServicePicker
        services={services}
        selectedServiceId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Inclui lavagem e secagem")).toBeInTheDocument();
    // `null` não deve renderizar uma linha vazia com aspas.
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("exposes real radio inputs, so keyboard and screen readers work", () => {
    render(
      <BookingServicePicker
        services={services}
        selectedServiceId={null}
        onSelect={vi.fn()}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("name", "booking-service");
  });

  it("reports the id of the chosen service", () => {
    const onSelect = vi.fn();
    render(
      <BookingServicePicker
        services={services}
        selectedServiceId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Coloração/ }));

    expect(onSelect).toHaveBeenCalledWith("svc2");
  });

  it("marks only the selected service as checked", () => {
    const { rerender } = render(
      <BookingServicePicker
        services={services}
        selectedServiceId="svc1"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Corte de cabelo/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Coloração/ })).not.toBeChecked();

    rerender(
      <BookingServicePicker
        services={services}
        selectedServiceId="svc2"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Corte de cabelo/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Coloração/ })).toBeChecked();
  });

  it("labels each radio with its service name, so the group is readable", () => {
    render(
      <BookingServicePicker
        services={services}
        selectedServiceId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Corte de cabelo/ })).toBeInTheDocument();
  });
});