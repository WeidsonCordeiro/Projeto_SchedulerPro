import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientForm from "./ClientForm";
import clientsApi from "../../api/endpoints/clients.api";
import type { Client } from "../../types/client";

vi.mock("../../api/endpoints/clients.api", () => ({
  default: {
    createClient: vi.fn(),
    updateClient: vi.fn(),
    uploadClientPhoto: vi.fn(),
    removeClientPhoto: vi.fn(),
  },
}));

const existingClient: Client = {
  id: "abc123",
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "912345678",
  companyId: "company1",
  notes: "Cliente antigo",
  isActive: true,
  portalAccess: { exists: false, isActive: false },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  avatar: null,
};

const storedImage = { url: "https://cdn.example.com/ana.jpg", publicId: "ana" };

function makeFile(type = "image/png", size = 1024, filename = "ana.png") {
  const file = new File([new Uint8Array([1, 2, 3])], filename, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function renderForm(props: Partial<Parameters<typeof ClientForm>[0]> = {}) {
  const onPhotoUpdated = vi.fn();
  render(
    <ClientForm
      isOpen
      client={existingClient}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onPhotoUpdated={onPhotoUpdated}
      {...props}
    />,
  );
  return { onPhotoUpdated };
}

describe("ClientForm photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show the uploader in create mode", () => {
    renderForm({ client: null });

    expect(screen.queryByRole("button", { name: "Adicionar foto" })).toBeNull();
  });

  it("uploads the photo and notifies the parent", async () => {
    const updated: Client = { ...existingClient, avatar: storedImage };
    vi.mocked(clientsApi.uploadClientPhoto).mockResolvedValue({
      success: true,
      message: "Foto atualizada.",
      data: updated,
    });

    const { onPhotoUpdated } = renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(clientsApi.uploadClientPhoto).toHaveBeenCalledTimes(1),
    );
    expect(vi.mocked(clientsApi.uploadClientPhoto).mock.calls[0][0]).toBe(
      "abc123",
    );
    expect(onPhotoUpdated).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Foto atualizada com sucesso.");
  });

  it("removes the photo and notifies the parent", async () => {
    const withPhoto: Client = { ...existingClient, avatar: storedImage };
    const updated: Client = { ...existingClient, avatar: null };
    vi.mocked(clientsApi.removeClientPhoto).mockResolvedValue({
      success: true,
      message: "Foto removida.",
      data: updated,
    });

    const { onPhotoUpdated } = renderForm({ client: withPhoto });

    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));

    await waitFor(() =>
      expect(clientsApi.removeClientPhoto).toHaveBeenCalledWith("abc123"),
    );
    expect(onPhotoUpdated).toHaveBeenCalledWith(updated);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Foto removida com sucesso.");
  });

  it("rejects an over-sized file without calling the API", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile("image/png", 6 * 1024 * 1024)] },
    });

    expect(clientsApi.uploadClientPhoto).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A imagem deve ter no máximo 5 MB.",
    );
  });
});
