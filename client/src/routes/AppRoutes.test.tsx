import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AppRoutes from "./AppRoutes";

describe("AppRoutes", () => {
  it("renders the home page on the root route", () => {
    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });
});