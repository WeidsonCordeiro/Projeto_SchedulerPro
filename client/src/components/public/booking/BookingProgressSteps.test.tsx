import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookingProgressSteps from "./BookingProgressSteps";

describe("BookingProgressSteps", () => {
  it("lists the five steps in order", () => {
    render(<BookingProgressSteps currentStep="service" />);

    const labels = Array.from(
      screen.getByRole("list").querySelectorAll("li"),
    ).map((node) => node.textContent);

    expect(labels).toEqual([
      "1Serviço",
      "2Profissional",
      "3Data e hora",
      "4Os seus dados",
      "5Revisão",
    ]);
  });

  it("marks exactly one step as the current one", () => {
    render(<BookingProgressSteps currentStep="schedule" />);

    const current = screen
      .getAllByRole("listitem")
      .filter((item) => item.getAttribute("aria-current") === "step");

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Data e hora");
  });

  it("announces the step position to assistive technology", () => {
    render(<BookingProgressSteps currentStep="details" />);

    // O número da etapa não está no texto do rótulo; é este parágrafo que o
    // dá, e é `aria-live` para que a mudança seja anunciada.
    const live = document.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("Etapa 4 de 5: Os seus dados");
  });

  it("does not mark earlier steps as current", () => {
    render(<BookingProgressSteps currentStep="review" />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[4]).toHaveAttribute("aria-current", "step");
  });
});