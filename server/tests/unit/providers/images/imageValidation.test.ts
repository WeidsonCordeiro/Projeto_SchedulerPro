import { describe, expect, it } from "vitest";

import {
  assertImageFileFormat,
  assertImageFilePresent,
  assertImageFileSize,
  validateImageFile,
} from "../../../../src/providers/images/imageValidation";
import { IMAGE_LIMITS, type UploadedFile } from "../../../../src/providers/images/types";
import { HttpStatus } from "../../../../src/constants/http-status";

/**
 * Buffers com assinatura binária real.
 *
 * Não são imagens válidas, mas os primeiros bytes são os
 * verdadeiros, que é o que a validação inspeciona.
 */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_BYTES = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
  Buffer.from([0x00, 0x00]),
]);

function makeFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    buffer: PNG_BYTES,
    originalname: "foto.png",
    mimetype: "image/png",
    size: PNG_BYTES.length,
    ...overrides,
  };
}

describe("imageValidation - presença do ficheiro", () => {
  it("rejeita a ausência de ficheiro", () => {
    expect(() => validateImageFile(undefined)).toThrowError(
      expect.objectContaining({ statusCode: HttpStatus.BAD_REQUEST }),
    );
    expect(() => validateImageFile(null)).toThrowError(
      /É necessário enviar um ficheiro de imagem/,
    );
  });

  it("rejeita um buffer vazio", () => {
    expect(() => assertImageFilePresent(makeFile({ buffer: Buffer.alloc(0) }))).toThrowError(
      /está vazio/,
    );
  });

  it("aceita um ficheiro presente e não vazio", () => {
    expect(() => assertImageFilePresent(makeFile())).not.toThrow();
  });
});

describe("imageValidation - tamanho", () => {
  it("rejeita um ficheiro acima do limite de 5 MB", () => {
    const oversized = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES, 0x00),
    ]);

    expect(oversized.length).toBeGreaterThan(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES);

    expect(() =>
      assertImageFileSize(
        makeFile({ buffer: oversized, size: oversized.length }),
      ),
    ).toThrowError(/excede o tamanho máximo de 5 MB/);
  });

  it("aceita um ficheiro exatamente no limite", () => {
    const atLimit = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES - PNG_BYTES.length, 0x00),
    ]);

    expect(
      atLimit.length,
    ).toBe(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES);

    expect(() =>
      assertImageFileSize(makeFile({ buffer: atLimit, size: atLimit.length })),
    ).not.toThrow();
  });

  it("valida o tamanho antes do formato", () => {
    const oversizedText = Buffer.alloc(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES + 1, 0x41);

    expect(() =>
      validateImageFile(
        makeFile({ buffer: oversizedText, size: oversizedText.length, mimetype: "text/plain" }),
      ),
    ).toThrowError(/tamanho máximo/);
  });
});

describe("imageValidation - formato real (magic bytes)", () => {
  it("deteta PNG, JPEG e WebP pela assinatura binária", () => {
    expect(
      validateImageFile(makeFile({ buffer: PNG_BYTES, mimetype: "application/octet-stream" })),
    ).toBe("image/png");

    expect(
      validateImageFile(makeFile({ buffer: JPEG_BYTES, mimetype: "application/octet-stream" })),
    ).toBe("image/jpeg");

    expect(
      validateImageFile(makeFile({ buffer: WEBP_BYTES, mimetype: "application/octet-stream" })),
    ).toBe("image/webp");
  });

  it("não confia no MIME declarado pelo cliente", () => {
    // O cliente declara PNG, mas o conteúdo é um executável.
    const fakePng = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);

    expect(() =>
      assertImageFileFormat(
        makeFile({ buffer: fakePng, originalname: "foto.png", mimetype: "image/png" }),
      ),
    ).toThrowError(/Formato de imagem não permitido\. \(image\/png\)/);
  });

  it("rejeita um GIF mesmo sendo uma imagem válida", () => {
    const gif = Buffer.from("GIF89a", "ascii");

    expect(() =>
      assertImageFileFormat(makeFile({ buffer: gif, mimetype: "image/gif" })),
    ).toThrowError(/Formato de imagem não permitido/);
  });

  it("rejeita um buffer demasiado curto para ter assinatura", () => {
    expect(() =>
      assertImageFileFormat(makeFile({ buffer: Buffer.from([0xff]), mimetype: "image/jpeg" })),
    ).toThrowError(/Formato de imagem não permitido/);
  });

  it("não aceita um RIFF que não seja WEBP", () => {
    const wav = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x1a, 0x00, 0x00, 0x00]),
      Buffer.from("WAVE", "ascii"),
    ]);

    expect(() =>
      assertImageFileFormat(makeFile({ buffer: wav, mimetype: "image/webp" })),
    ).toThrowError(/Formato de imagem não permitido/);
  });
});
