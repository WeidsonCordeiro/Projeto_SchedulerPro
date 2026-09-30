import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmployeeAvatarPicker from "./EmployeeAvatarPicker";
import type { Employee } from "../../types/employee";

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "employee1",
    name: "Ana Lima",
    email: "ana@example.com",
    role: "EMPLOYEE",
    isActive: true,
    companyId: "company1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const withPhoto = makeEmployee({
  avatar: { url: "https://res.cloudinary.com/demo/ana.jpg", publicId: "avatars/ana" },
});

const employees = [
  withPhoto,
  makeEmployee({ id: "employee2", name: "Bruno Dias" }),
  makeEmployee({ id: "client-user", name: "Carla Reis", role: "CLIENT" }),
];

function renderPicker(
  props: Partial<React.ComponentProps<typeof EmployeeAvatarPicker>> = {},
) {
  const base: React.ComponentProps<typeof EmployeeAvatarPicker> = {
    employees,
    value: "",
    onChange: vi.fn(),
    label: "Funcionário",
    ...props,
  };
  render(<EmployeeAvatarPicker {...base} />);
  return base;
}

describe("EmployeeAvatarPicker", () => {
  it("shows the photo for a professional that has an avatar", () => {
    renderPicker();

    // A imagem é decorativa (alt vazio) porque o nome aparece em texto ao lado.
    const image = screen
      .getByRole("radio", { name: "Ana Lima" })
      .querySelector("img");
    expect(image).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/ana.jpg",
    );
    expect(image).toHaveAttribute("alt", "");
  });

  it("falls back to the initials when the professional has no photo", () => {
    renderPicker();

    expect(screen.getByText("BD")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Bruno Dias" }).querySelector("img"),
    ).toBeNull();
  });

  it("falls back to the initials when the photo fails to load", () => {
    renderPicker({ employees: [withPhoto] });

    const option = screen.getByRole("radio", { name: "Ana Lima" });
    fireEvent.error(option.querySelector("img") as HTMLImageElement);

    // O marcador de iniciais assume o lugar da imagem quebrada.
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(option.querySelector("img")).toBeNull();
  });

  it("shows the name of every professional next to the picture", () => {
    renderPicker();

    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
    expect(screen.getByText("Bruno Dias")).toBeInTheDocument();
    expect(screen.getByText("Carla Reis")).toBeInTheDocument();
  });

  it("marks the chosen professional as selected", () => {
    renderPicker({ value: "employee2" });

    const selected = screen.getByRole("radio", { name: "Bruno Dias" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected).toHaveClass("is-selected");
    expect(within(selected).getByText("✓")).toBeInTheDocument();

    expect(screen.getByRole("radio", { name: "Ana Lima" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("exposes the selection state without relying on colour alone", () => {
    renderPicker({ value: "employee1" });

    // O estado é comunicado por um selo visível (✓) e por `aria-checked`,
    // e não apenas pela cor de fundo/borda do cartão.
    const selected = screen.getByRole("radio", { name: "Ana Lima" });
    expect(within(selected).getByText("✓")).toBeInTheDocument();
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(within(screen.getByRole("radio", { name: "Bruno Dias" })).queryByText("✓"))
      .not.toBeInTheDocument();
  });

  it("reports the chosen professional to the consumer", () => {
    const onChange = vi.fn();
    renderPicker({ onChange });

    fireEvent.click(screen.getByRole("radio", { name: "Bruno Dias" }));

    expect(onChange).toHaveBeenCalledWith("employee2");
  });

  it("keeps the accessible name stable whether or not the option is selected", () => {
    renderPicker({ value: "employee1" });

    // O selo de seleção não altera o nome acessível do cartão.
    expect(screen.getByRole("radio", { name: "Ana Lima" })).toBeInTheDocument();
  });

  it("labels the group and associates the error message", () => {
    render(
      <>
        <span id="employee-label">Funcionário</span>
        <EmployeeAvatarPicker
          employees={employees}
          value=""
          onChange={vi.fn()}
          label="Funcionário"
          labelId="employee-label"
          describedById="employee-error"
          invalid
        />
        <div id="employee-error">O funcionário é obrigatório.</div>
      </>,
    );

    const group = screen.getByRole("radiogroup", { name: "Funcionário" });
    expect(group).toHaveAttribute("aria-labelledby", "employee-label");
    expect(group).toHaveAttribute("aria-describedby", "employee-error");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveClass("is-invalid");
  });

  it("falls back to aria-label when no label element is provided", () => {
    renderPicker();

    expect(screen.getByRole("radiogroup", { name: "Funcionário" })).toBeInTheDocument();
  });

  it("keeps only the selected card in the tab order", () => {
    renderPicker({ value: "employee2" });

    expect(screen.getByRole("radio", { name: "Bruno Dias" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: "Ana Lima" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("puts the first card in the tab order when nothing is selected", () => {
    renderPicker({ value: "" });

    expect(screen.getByRole("radio", { name: "Ana Lima" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: "Bruno Dias" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("selects the next professional with the arrow keys", () => {
    const onChange = vi.fn();
    renderPicker({ value: "employee1", onChange });

    const first = screen.getByRole("radio", { name: "Ana Lima" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith("employee2");
    expect(screen.getByRole("radio", { name: "Bruno Dias" })).toHaveFocus();
  });

  it("selects the previous professional with the left arrow key", () => {
    const onChange = vi.fn();
    renderPicker({ value: "employee2", onChange });

    const second = screen.getByRole("radio", { name: "Bruno Dias" });
    second.focus();
    fireEvent.keyDown(second, { key: "ArrowLeft" });

    expect(onChange).toHaveBeenCalledWith("employee1");
    expect(screen.getByRole("radio", { name: "Ana Lima" })).toHaveFocus();
  });

  it("wraps around at the edges of the list", () => {
    const onChange = vi.fn();
    renderPicker({ value: "employee1", onChange });

    const first = screen.getByRole("radio", { name: "Ana Lima" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });

    expect(onChange).toHaveBeenCalledWith("client-user");
  });

  it("wraps from the last professional back to the first", () => {
    const onChange = vi.fn();
    const lastName = "Carla Reis (sem perfil de funcionário)";
    renderPicker({ value: "client-user", onChange });

    const last = screen.getByRole("radio", { name: lastName });
    last.focus();
    fireEvent.keyDown(last, { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith("employee1");
    expect(screen.getByRole("radio", { name: "Ana Lima" })).toHaveFocus();
  });

  it("jumps to the first and last professional with Home and End", () => {
    const onChange = vi.fn();
    const lastName = "Carla Reis (sem perfil de funcionário)";
    renderPicker({ value: "employee2", onChange });

    const second = screen.getByRole("radio", { name: "Bruno Dias" });
    second.focus();
    fireEvent.keyDown(second, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("client-user");

    fireEvent.keyDown(screen.getByRole("radio", { name: lastName }), {
      key: "Home",
    });
    expect(onChange).toHaveBeenLastCalledWith("employee1");
  });

  it("ignores keys that are not part of the radiogroup navigation", () => {
    const onChange = vi.fn();
    renderPicker({ value: "employee1", onChange });

    fireEvent.keyDown(screen.getByRole("radio", { name: "Ana Lima" }), {
      key: "a",
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not move the selection when disabled", () => {
    const onChange = vi.fn();
    renderPicker({ value: "employee1", onChange, disabled: true });

    const first = screen.getByRole("radio", { name: "Ana Lima" });
    expect(first).toBeDisabled();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("radio", { name: "Bruno Dias" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("flags users without a professional profile", () => {
    renderPicker();

    expect(
      screen.getByRole("radio", { name: "Carla Reis (sem perfil de funcionário)" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("radio", { name: "Carla Reis (sem perfil de funcionário)" }),
      ).getByText("(sem perfil de funcionário)"),
    ).toBeInTheDocument();
  });

  it("explains an empty list instead of rendering an empty group", () => {
    renderPicker({ employees: [] });

    expect(screen.getByText("Nenhum funcionário disponível.")).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});
