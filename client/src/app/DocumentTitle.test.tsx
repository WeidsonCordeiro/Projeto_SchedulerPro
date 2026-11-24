import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DocumentTitle from "./DocumentTitle";

describe("DocumentTitle", () => {
  it("sets document.title from the current path", () => {
    render(
      <MemoryRouter initialEntries={["/clients"]}>
        <DocumentTitle />
        <Routes>
          <Route path="/clients" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(document.title).toBe("Clientes | SchedulerPro");
  });
});