import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TimezonePicker from "./TimezonePicker";
import { formatTimezoneOptionLabel } from "../../config/timezones";

const mockZones = ["America/New_York", "Europe/Lisbon", "Asia/Tokyo"];

vi.mock("../../config/timezones", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../config/timezones")>();
  return {
    ...actual,
    getIanaTimezones: vi.fn(() => mockZones),
  };
});

function mockViewportMobile(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobile && query.includes("767.98"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof TimezonePicker>> = {},
) {
  const onChange = vi.fn<(iana: string) => void>();
  render(
    <TimezonePicker
      id="company-timezone"
      label="Fuso horário"
      value="Europe/Lisbon"
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange };
}

function getCombobox() {
  return screen.getByRole("combobox", { name: "Fuso horário" });
}

function openPicker() {
  fireEvent.click(getCombobox());
}

describe("TimezonePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewportMobile(false);
  });

  describe("desktop", () => {

  it("renders the label", () => {
    renderPicker();
    expect(screen.getByText("Fuso horário")).toBeInTheDocument();
  });

  it("renders the selected IANA value as a readable label", () => {
    renderPicker();
    expect(getCombobox()).toHaveTextContent(
      formatTimezoneOptionLabel("Europe/Lisbon"),
    );
  });

  it("opens the dropdown with search and listbox", () => {
    renderPicker();
    openPicker();

    expect(getCombobox()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Pesquisar fuso horário…"),
    ).toBeInTheDocument();
  });

  it("filters options when searching for Europe/Lisbon", () => {
    renderPicker();
    openPicker();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Europe/Lisbon" },
    });

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByRole("option")).toHaveTextContent(
      formatTimezoneOptionLabel("Europe/Lisbon"),
    );
  });

  it("filters case-insensitively", () => {
    renderPicker();
    openPicker();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "tokyo" },
    });

    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(
      1,
    );
    expect(screen.getByRole("option")).toHaveTextContent(
      formatTimezoneOptionLabel("Asia/Tokyo"),
    );
  });

  it("shows a message when search has no results", () => {
    renderPicker();
    openPicker();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Antartica/Nowhere" },
    });

    expect(
      screen.getByText("Nenhum fuso horário encontrado."),
    ).toBeInTheDocument();
  });

  it("calls onChange with the IANA id when an option is selected", () => {
    const { onChange } = renderPicker();
    openPicker();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "America/New_York" },
    });
    fireEvent.click(screen.getByRole("option"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("America/New_York");
  });

  it("closes the dropdown after selection", () => {
    renderPicker();
    openPicker();

    fireEvent.click(
      within(screen.getByRole("listbox")).getByRole("option", {
        name: formatTimezoneOptionLabel("Asia/Tokyo"),
      }),
    );

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(getCombobox()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows invalid state and error message", () => {
    renderPicker({
      invalid: true,
      errorMessage: "Timezone inválido.",
    });

    expect(getCombobox()).toHaveClass("is-invalid");
    expect(screen.getByText("Timezone inválido.")).toBeInTheDocument();
  });

  it("does not open when disabled", () => {
    renderPicker({ disabled: true });

    expect(getCombobox()).toBeDisabled();
    openPicker();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("includes ensureOption when it is missing from the runtime list", () => {
    renderPicker({
      value: "Legacy/Custom_Zone",
      ensureOption: "Legacy/Custom_Zone",
    });
    openPicker();

    expect(
      screen.getByRole("option", {
        name: formatTimezoneOptionLabel("Legacy/Custom_Zone"),
      }),
    ).toBeInTheDocument();
  });

  it("does not duplicate ensureOption when it already exists in the list", () => {
    renderPicker({ ensureOption: "Europe/Lisbon" });
    openPicker();

    const lisbonOptions = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .filter((option) => option.textContent?.includes("Europe/Lisbon"));
    expect(lisbonOptions).toHaveLength(1);
  });

  it("updates the active option with arrow keys", () => {
    renderPicker();
    openPicker();

    const combobox = getCombobox();
    const search = screen.getByRole("searchbox");

    fireEvent.keyDown(search, { key: "ArrowDown" });

    expect(combobox.getAttribute("aria-activedescendant")).toMatch(
      /company-timezone-option-2/,
    );
  });

  it("selects the active option with Enter", () => {
    const { onChange } = renderPicker();
    openPicker();

    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
  });

  it("closes on Escape from the search field", () => {
    renderPicker();
    openPicker();

    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(getCombobox()).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes essential accessibility attributes", () => {
    renderPicker();
    const combobox = getCombobox();

    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox.getAttribute("aria-controls")).toContain("listbox");

    openPicker();
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  });

  it("renders helper text when provided and not invalid", () => {
    renderPicker({ helperText: "Escolha o fuso IANA da empresa." });
    expect(screen.getByText("Escolha o fuso IANA da empresa.")).toBeInTheDocument();
  });
  });

  describe("mobile", () => {
    beforeEach(() => {
      mockViewportMobile(true);
    });

    it("opens a fullscreen dialog when the trigger is activated", () => {
      renderPicker();
      openPicker();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Selecionar fuso horário" }),
      ).toBeInTheDocument();
      expect(getCombobox()).toHaveAttribute("aria-expanded", "true");
    });

    it("shows search and filters zones inside the modal", () => {
      renderPicker();
      openPicker();

      fireEvent.change(screen.getByRole("searchbox"), {
        target: { value: "Europe/Lisbon" },
      });

      expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(
        1,
      );
    });

    it("selects a zone and calls onChange with the IANA id", () => {
      const { onChange } = renderPicker();
      openPicker();

      fireEvent.click(
        screen.getByRole("option", {
          name: formatTimezoneOptionLabel("America/New_York"),
        }),
      );

      expect(onChange).toHaveBeenCalledWith("America/New_York");
    });

    it("closes the modal after selection", () => {
      renderPicker();
      openPicker();

      fireEvent.click(
        screen.getByRole("option", {
          name: formatTimezoneOptionLabel("Asia/Tokyo"),
        }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes the modal with Escape and returns focus to the trigger", () => {
      renderPicker();
      const combobox = getCombobox();
      openPicker();

      fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(combobox);
    });

    it("locks body scroll while the modal is open", () => {
      renderPicker();
      openPicker();
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
      expect(document.body.style.overflow).toBe("");
    });

    it("keeps Tab focus within the modal", () => {
      renderPicker();
      openPicker();

      const dialog = screen.getByRole("dialog");
      const closeButton = screen.getByRole("button", { name: "Fechar" });
      const options = within(dialog).getAllByRole("option");
      options[options.length - 1].focus();

      fireEvent.keyDown(document, { key: "Tab" });

      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(closeButton);
    });

    it("includes ensureOption in the mobile modal list", () => {
      renderPicker({
        value: "Legacy/Custom_Zone",
        ensureOption: "Legacy/Custom_Zone",
      });
      openPicker();

      expect(
        screen.getByRole("option", {
          name: formatTimezoneOptionLabel("Legacy/Custom_Zone"),
        }),
      ).toBeInTheDocument();
    });

    it("uses dialog popup semantics on the combobox trigger", () => {
      renderPicker();
      expect(getCombobox()).toHaveAttribute("aria-haspopup", "dialog");
    });
  });
});
