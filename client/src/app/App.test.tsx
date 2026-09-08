import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { store } from "../store";
import App from "./App";

describe("App", () => {
  it("renders the main route through the layout", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("SchedulerPro")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /bem-vindo ao schedulerpro/i }),
    ).toBeInTheDocument();
  });
});