import { describe, expect, it } from "vitest";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  IMAGE_FILE_ACCEPT,
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
} from "./imageUpload";

function file(type: string, size: number) {
  return { type, size };
}

describe("validateImageFile", () => {
  it("accepts JPEG, PNG and WebP within the size limit", () => {
    expect(validateImageFile(file("image/jpeg", 1024))).toBeNull();
    expect(validateImageFile(file("image/png", 1024))).toBeNull();
    expect(
      validateImageFile(file("image/webp", MAX_IMAGE_SIZE_BYTES)),
    ).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateImageFile(file("image/png", 0))).toBe(
      "O ficheiro selecionado está vazio.",
    );
  });

  it("rejects unsupported or unknown formats", () => {
    const expected = "Formato não suportado. Utilize JPEG, PNG ou WebP.";
    expect(validateImageFile(file("image/gif", 1024))).toBe(expected);
    expect(validateImageFile(file("application/pdf", 1024))).toBe(expected);
    expect(validateImageFile(file("", 1024))).toBe(expected);
  });

  it("rejects files larger than the 5 MB limit", () => {
    expect(
      validateImageFile(file("image/png", MAX_IMAGE_SIZE_BYTES + 1)),
    ).toBe("A imagem deve ter no máximo 5 MB.");
  });

  it("exposes the accepted formats and the accept attribute", () => {
    expect(ACCEPTED_IMAGE_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(IMAGE_FILE_ACCEPT).toBe("image/jpeg,image/png,image/webp");
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
