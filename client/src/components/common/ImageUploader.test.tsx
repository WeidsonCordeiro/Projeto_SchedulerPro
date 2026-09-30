import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImageUploader from "./ImageUploader";
import { MAX_IMAGE_SIZE_BYTES } from "../../config/imageUpload";

const storedImage = { url: "https://cdn.example.com/a.jpg", publicId: "a" };

function makeFile(type = "image/png", size = 1024) {
  const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
}

function renderUploader(
  props: Partial<React.ComponentProps<typeof ImageUploader>> = {},
) {
  const upload = vi
    .fn<(file: File) => Promise<void>>()
    .mockResolvedValue(undefined);
  const remove = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const view = render(
    <ImageUploader
      id="photo"
      name="Ana Silva"
      canManage
      upload={upload}
      remove={remove}
      {...props}
    />,
  );
  return { upload, remove, ...view };
}

describe("ImageUploader", () => {
  it("shows the add action and a placeholder when there is no image", () => {
    renderUploader();

    expect(
      screen.getByRole("button", { name: "Adicionar foto" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("hides all actions when the user cannot manage the image", () => {
    renderUploader({ canManage: false });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("ignores a change event without a file", () => {
    const { upload } = renderUploader();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [] },
    });

    expect(upload).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("opens the file picker when the add button is clicked", () => {
    renderUploader();

    const input = screen.getByLabelText("Adicionar foto") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar foto" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("uploads a valid file and reports success", async () => {
    const { upload } = renderUploader();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    await waitFor(() =>
      expect(upload).toHaveBeenCalledTimes(1),
    );
    expect(upload.mock.calls[0][0]).toBeInstanceOf(File);
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Imagem atualizada com sucesso.");
  });

  it("rejects an empty file before calling the API", () => {
    const { upload } = renderUploader();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile("image/png", 0)] },
    });

    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O ficheiro selecionado está vazio.",
    );
  });

  it("rejects an unsupported format before calling the API", () => {
    const { upload } = renderUploader();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile("image/gif")] },
    });

    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Formato não suportado. Utilize JPEG, PNG ou WebP.",
    );
  });

  it("rejects a file over the size limit before calling the API", () => {
    const { upload } = renderUploader();

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: {
        files: [makeFile("image/png", MAX_IMAGE_SIZE_BYTES + 1)],
      },
    });

    expect(upload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A imagem deve ter no máximo 5 MB.",
    );
  });

  it("shows the error when the upload fails", async () => {
    const upload = vi
      .fn<(file: File) => Promise<void>>()
      .mockRejectedValue(new Error("Falha ao enviar a imagem"));

    renderUploader({ upload });

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha ao enviar a imagem",
    );
  });

  it("offers replace and remove actions when an image exists", () => {
    renderUploader({ image: storedImage });

    expect(
      screen.getByRole("button", { name: "Substituir foto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remover foto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Substituir foto"),
    ).toHaveAttribute("type", "file");
  });

  it("removes the image and reports success", async () => {
    const { remove } = renderUploader({ image: storedImage });

    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Imagem removida com sucesso.");
  });

  it("shows the error when the remove fails", async () => {
    const remove = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("Não foi possível remover"));

    renderUploader({ image: storedImage, remove });

    fireEvent.click(screen.getByRole("button", { name: "Remover foto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível remover",
    );
  });

  it("cleans up the preview when unmounted during an upload", () => {
    const upload = vi.fn<(file: File) => Promise<void>>(
      () => new Promise<void>(() => {}),
    );
    const { unmount } = renderUploader({ upload });

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });
    expect(upload).toHaveBeenCalledTimes(1);

    expect(() => unmount()).not.toThrow();
  });

  it("blocks a second upload while one is in flight", async () => {
    let resolveUpload: () => void = () => {};
    const upload = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpload = resolve;
        }),
    );

    renderUploader({ upload });

    fireEvent.change(screen.getByLabelText("Adicionar foto"), {
      target: { files: [makeFile()] },
    });

    const addButton = screen.getByRole("button", { name: "Adicionar foto" });
    expect(addButton).toBeDisabled();
    expect(screen.getByLabelText("Adicionar foto")).toBeDisabled();

    resolveUpload();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Adicionar foto" }),
      ).not.toBeDisabled(),
    );
  });
});
