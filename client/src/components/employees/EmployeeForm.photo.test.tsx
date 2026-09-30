import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeForm from "./EmployeeForm";
import employeesApi from "../../api/endpoints/employees.api";
import type { Employee } from "../../types/employee";

vi.mock("../../api/endpoints/employees.api", () => ({
  default: {
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    uploadEmployeePhoto: vi.fn(),
    removeEmployeePhoto: vi.fn(),
  },
}));

const existingEmployee: Employee = {
  id: "abc123",
  companyId: "507f1f77bcf86cd799439012",
  name: "Ana Silva",
  email: "ana@example.com",
  role: "EMPLOYEE",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  avatar: null,
};

const storedImage = { url: "https://cdn.example.com/ana.jpg", publicId: "ana" };

function makeFile(
  type = "image/png",
  size = 1024,
  filename = "ana.png",
) {
  const file = new File([new Uint8Array([1, 2, 3])], filename, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function renderForm(props: Partial<Parameters<typeof EmployeeForm>[0]> = {}) {
  const onPhotoUpdated = vi.fn();
  render(
    <EmployeeForm
      isOpen
      employee={existingEmployee}
      actorRole="OWNER"
      currentUserId="user-other"
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onPhotoUpdated={onPhotoUpdated}
      {...props}
    />,
  );
  return { onPhotoUpdated };
}

describe("EmployeeForm photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the uploader in create mode", () => {
    renderForm({ employee: null });

    expect(screen.queryByRole("button", { name: "Adicionar foto" })).toBeNull();
    expect(screen.queryByText("AS")).toBeNull();
  });

  it("uploads the photo and notifies the parent", async () => {
    const updated: Employee = {
      ...existingEmployee,
      avatar: storedImage,
    };
    vi.mocked(employeesApi.uploadEmployeePhoto).mockResolvedValue({
      success: true,
      message: "Foto atualizada.",
      data: updated,
    });

    const { onPhotoUpdated } = renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(employeesApi.uploadEmployeePhoto).toHaveBeenCalledTimes(1),
    );
    expect(vi.mocked(employeesApi.uploadEmployeePhoto).mock.calls[0][0]).toBe(
      "abc123",
    );
    expect(
      vi.mocked(employeesApi.uploadEmployeePhoto).mock.calls[0][1],
    ).toBeInstanceOf(File);
    expect(onPhotoUpdated).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Foto atualizada com sucesso.");
  });

  it("removes the photo and notifies the parent with a null avatar", async () => {
    const withPhoto: Employee = { ...existingEmployee, avatar: storedImage };
    const updated: Employee = { ...existingEmployee, avatar: null };
    vi.mocked(employeesApi.removeEmployeePhoto).mockResolvedValue({
      success: true,
      message: "Foto removida.",
      data: updated,
    });

    const { onPhotoUpdated } = renderForm({ employee: withPhoto });

    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));

    await waitFor(() =>
      expect(employeesApi.removeEmployeePhoto).toHaveBeenCalledWith("abc123"),
    );
    expect(onPhotoUpdated).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Foto removida com sucesso.");
  });

  it("rejects an unsupported format without calling the API", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile("image/gif", 1024, "ana.gif")] },
    });

    expect(employeesApi.uploadEmployeePhoto).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Formato não suportado. Utilize JPEG, PNG ou WebP.",
    );
  });

  it("shows an error and keeps the previous photo when the upload fails", async () => {
    vi.mocked(employeesApi.uploadEmployeePhoto).mockRejectedValue(
      new Error("Falha ao enviar a foto"),
    );

    const { onPhotoUpdated } = renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha ao enviar a foto",
    );
    expect(onPhotoUpdated).not.toHaveBeenCalled();
  });
});
