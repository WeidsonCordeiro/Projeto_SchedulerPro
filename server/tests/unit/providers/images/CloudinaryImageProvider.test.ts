import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ==========================================================
 * Testes do CloudinaryImageProvider.
 *
 * O SDK do Cloudinary é totalmente mockado: nenhum teste
 * exige credenciais, rede ou conta real.
 * ==========================================================
 */

const { cloudinaryMock, loggerMock, envMock } = vi.hoisted(() => {
  const upload = vi.fn();
  const destroy = vi.fn();
  const config = vi.fn();

  return {
    cloudinaryMock: { upload, destroy, config },
    loggerMock: { upload: vi.fn(), error: vi.fn() },
    envMock: {
      cloudinary: {
        CLOUDINARY_CLOUD_NAME: "empresa-demo",
        CLOUDINARY_API_KEY: "key_demo",
        CLOUDINARY_API_SECRET: "secret_demo",
      },
    },
  };
});

vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMock.config,
    uploader: {
      upload: cloudinaryMock.upload,
      destroy: cloudinaryMock.destroy,
    },
  },
}));

vi.mock("../../../../src/config/env", () => ({ env: envMock }));

vi.mock("../../../../src/providers/logger", () => ({
  default: loggerMock,
}));

import imageProvider from "../../../../src/providers/images/CloudinaryImageProvider";
import { HttpStatus } from "../../../../src/constants/http-status";
import {
  IMAGE_LIMITS,
  ImageEntity,
  type StoredImage,
  type UploadedFile,
} from "../../../../src/providers/images/types";

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("conteudo", "ascii"),
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

const stored: StoredImage = {
  url: "https://res.cloudinary.com/empresa-demo/image/upload/v1/schedulerpro/employee/abc123",
  publicId: "schedulerpro/employee/abc123",
};

beforeEach(() => {
  vi.clearAllMocks();
  cloudinaryMock.upload.mockResolvedValue({
    secure_url: stored.url,
    public_id: stored.publicId,
  });
  cloudinaryMock.destroy.mockResolvedValue({ result: "ok" });
});

describe("CloudinaryImageProvider - upload", () => {
  it("devolve url e publicId para persistir no model", async () => {
    const result = await imageProvider.upload({
      file: makeFile(),
      entity: ImageEntity.EMPLOYEE,
    });

    expect(result).toEqual(stored);
    expect(typeof result.url).toBe("string");
    expect(typeof result.publicId).toBe("string");
  });

  it("configura o SDK com as credenciais do ambiente e HTTPS", async () => {
    await imageProvider.upload({ file: makeFile(), entity: ImageEntity.CLIENT });

    expect(cloudinaryMock.config).toHaveBeenCalledWith({
      cloud_name: "empresa-demo",
      api_key: "key_demo",
      api_secret: "secret_demo",
      secure: true,
    });
  });

  it("organiza o ficheiro numa pasta por entidade", async () => {
    await imageProvider.upload({ file: makeFile(), entity: ImageEntity.COMPANY });

    const [, options] = cloudinaryMock.upload.mock.calls[0];
    expect(options.folder).toBe("schedulerpro/company");
    expect(options.resource_type).toBe("image");
  });

  it("envia um data URI com o MIME detetado, não o declarado", async () => {
    await imageProvider.upload({
      file: makeFile({ mimetype: "application/octet-stream" }),
      entity: ImageEntity.EMPLOYEE,
    });

    const [payload] = cloudinaryMock.upload.mock.calls[0];
    expect(payload.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("não deixa uma repetição do pedido destruir a imagem de outra entidade", async () => {
    await imageProvider.upload({ file: makeFile(), entity: ImageEntity.EMPLOYEE });

    const [, options] = cloudinaryMock.upload.mock.calls[0];
    expect(options.overwrite).toBe(false);
    expect(options.unique_filename).toBe(true);
  });

  it("lança AppError quando o provider falha", async () => {
    cloudinaryMock.upload.mockRejectedValue(new Error("Upload failed"));

    await expect(
      imageProvider.upload({ file: makeFile(), entity: ImageEntity.EMPLOYEE }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
  });

  it("lança AppError quando a resposta vem incompleta", async () => {
    cloudinaryMock.upload.mockResolvedValue({ secure_url: stored.url });

    await expect(
      imageProvider.upload({ file: makeFile(), entity: ImageEntity.EMPLOYEE }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
  });

  it("regista a falha sem expor a mensagem técnica ao cliente", async () => {
    cloudinaryMock.upload.mockRejectedValue(new Error("File size too large"));

    await expect(
      imageProvider.upload({ file: makeFile(), entity: ImageEntity.EMPLOYEE }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("Falha ao enviar a imagem"),
    });

    expect(loggerMock.error).toHaveBeenCalled();
  });
});

describe("CloudinaryImageProvider - validação antes do upload", () => {
  it("não chama o provider quando o ficheiro está ausente", async () => {
    await expect(
      imageProvider.upload({
        file: undefined as unknown as UploadedFile,
        entity: ImageEntity.EMPLOYEE,
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });

    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it("não chama o provider quando o formato não é uma imagem", async () => {
    await expect(
      imageProvider.upload({
        file: makeFile({
          buffer: Buffer.from("MZ executavel", "ascii"),
          originalname: "malware.png",
          mimetype: "image/png",
          size: 11,
        }),
        entity: ImageEntity.EMPLOYEE,
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });

    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it("não chama o provider quando o ficheiro excede o limite", async () => {
    const oversized = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES, 0x00),
    ]);

    await expect(
      imageProvider.upload({
        file: makeFile({ buffer: oversized, size: oversized.length }),
        entity: ImageEntity.EMPLOYEE,
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });

    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});

describe("CloudinaryImageProvider - remove", () => {
  it("remove a imagem pelo publicId", async () => {
    await imageProvider.remove({ image: stored });

    expect(cloudinaryMock.destroy).toHaveBeenCalledWith(stored.publicId, {
      resource_type: "image",
      invalidate: true,
    });
  });

  it("é idempotente quando a imagem já não existe no storage", async () => {
    cloudinaryMock.destroy.mockResolvedValue({ result: "not found" });

    await expect(imageProvider.remove({ image: stored })).resolves.toBeUndefined();
  });

  it("lança AppError quando a remoção falha", async () => {
    cloudinaryMock.destroy.mockRejectedValue(new Error("Permission denied"));

    await expect(imageProvider.remove({ image: stored })).rejects.toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it("lança AppError quando o provider devolve um estado inesperado", async () => {
    cloudinaryMock.destroy.mockResolvedValue({ result: "error" });

    await expect(imageProvider.remove({ image: stored })).rejects.toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});

describe("CloudinaryImageProvider - replace", () => {
  it("remove a anterior e devolve apenas os dados da nova", async () => {
    const next: StoredImage = {
      url: "https://res.cloudinary.com/empresa-demo/image/upload/v1/schedulerpro/employee/novo",
      publicId: "schedulerpro/employee/novo",
    };
    cloudinaryMock.upload.mockResolvedValue({
      secure_url: next.url,
      public_id: next.publicId,
    });

    const result = await imageProvider.replace({
      file: makeFile(),
      entity: ImageEntity.EMPLOYEE,
      previous: stored,
    });

    expect(cloudinaryMock.destroy).toHaveBeenCalledWith(
      stored.publicId,
      expect.anything(),
    );
    expect(result).toEqual(next);
    /**
     * O publicId antigo não pode continuar no model: já não
     * existe no storage.
     */
    expect(result.publicId).not.toBe(stored.publicId);
  });

  it("aceita a primeira imagem de uma entidade que ainda não tinha nenhuma", async () => {
    const result = await imageProvider.replace({
      file: makeFile(),
      entity: ImageEntity.CLIENT,
      previous: null,
    });

    expect(cloudinaryMock.destroy).not.toHaveBeenCalled();
    expect(cloudinaryMock.upload).toHaveBeenCalledTimes(1);
    expect(result).toEqual(stored);
  });

  it("mantém o upload quando a remoção da anterior falha, e regista o órfão", async () => {
    cloudinaryMock.destroy.mockRejectedValue(new Error("Timeout"));

    const result = await imageProvider.replace({
      file: makeFile(),
      entity: ImageEntity.EMPLOYEE,
      previous: stored,
    });

    expect(cloudinaryMock.upload).toHaveBeenCalledTimes(1);
    expect(result).toEqual(stored);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ orphanPublicId: stored.publicId }),
    );
  });

  it("valida a nova imagem antes de apagar a anterior", async () => {
    await expect(
      imageProvider.replace({
        file: makeFile({ buffer: Buffer.from("nao sou imagem"), size: 13 }),
        entity: ImageEntity.EMPLOYEE,
        previous: stored,
      }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });

    /**
     * Não se pode destruir a imagem atual do utilizador se a
     * substituição vai falhar na validação.
     */
    expect(cloudinaryMock.destroy).not.toHaveBeenCalled();
    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });
});

describe("CloudinaryImageProvider - configuração em falta", () => {
  it("devolve erro de configuração, sem Tentativas de rede", async () => {
    envMock.cloudinary.CLOUDINARY_API_SECRET = "";

    await expect(
      imageProvider.upload({ file: makeFile(), entity: ImageEntity.EMPLOYEE }),
    ).rejects.toMatchObject({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR });

    expect(cloudinaryMock.upload).not.toHaveBeenCalled();
  });

  it("não lança na importação do módulo, mesmo sem credenciais", () => {
    expect(imageProvider).toBeDefined();
  });
});
