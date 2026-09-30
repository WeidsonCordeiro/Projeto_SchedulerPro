import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeesPage from "./EmployeesPage";
import employeesApi from "../../api/endpoints/employees.api";
import authReducer from "../../store/slices/authSlice";
import { user } from "../../test/fixtures";
import type { Employee } from "../../types/employee";

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    getEmployees: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    deleteEmployee: vi.fn(),
    activateEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
    uploadEmployeePhoto: vi.fn(),
    removeEmployeePhoto: vi.fn(),
  },
}));

const storedImage = { url: "https://cdn.example.com/ana.jpg", publicId: "ana" };

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "abc123",
    companyId: "507f1f77bcf86cd799439012",
    name: "Ana Silva",
    email: "ana@example.com",
    role: "EMPLOYEE",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user,
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    </Provider>,
  );
}

function listResponse(employees: Employee[]) {
  return {
    success: true,
    message: "ok",
    data: employees,
  };
}

describe("EmployeesPage avatars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the photo for an employee that has an avatar", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue(
      listResponse([makeEmployee({ avatar: storedImage })]),
    );

    const { container } = renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    const img = container.querySelector(".person-cell img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", storedImage.url);
  });

  it("renders the initials placeholder when there is no avatar", async () => {
    vi.mocked(employeesApi.getEmployees).mockResolvedValue(
      listResponse([makeEmployee({ avatar: null })]),
    );

    renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("reflects a newly uploaded photo in the list without reloading", async () => {
    const employee = makeEmployee({ avatar: null });
    vi.mocked(employeesApi.getEmployees).mockResolvedValue(
      listResponse([employee]),
    );
    vi.mocked(employeesApi.uploadEmployeePhoto).mockResolvedValue({
      success: true,
      message: "Foto atualizada.",
      data: { ...employee, avatar: storedImage },
    });

    const { container } = renderPage();

    expect(await screen.findByText("Ana Silva")).toBeInTheDocument();
    expect(container.querySelector(".person-cell img")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    const file = new File([new Uint8Array([1, 2, 3])], "ana.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      const img = container.querySelector(".person-cell img");
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute("src", storedImage.url);
    });
    expect(employeesApi.uploadEmployeePhoto).toHaveBeenCalledWith(
      "abc123",
      file,
    );
    expect(employeesApi.getEmployees).toHaveBeenCalledTimes(1);
  });
});
