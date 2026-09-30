import { describe, expect, it } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

import { uploadSingleImage } from "../../../../src/providers/images/imageUpload.middleware";
import { AppError } from "../../../../src/errors/AppError";
import { HttpStatus } from "../../../../src/constants/http-status";
import { IMAGE_LIMITS } from "../../../../src/providers/images/types";

/**
 * ==========================================================
 * Testes do middleware de receção do ficheiro.
 *
 * Verifica o que o `error.middleware.ts` vai responder: um
 * erro do multer tem de chegar como AppError 400 e nunca
 * como 500 genérico.
 * ==========================================================
 */

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("conteudo", "ascii"),
]);

function buildApp() {
  const app = express();

  app.post(
    "/photo",
    uploadSingleImage("photo"),
    (req: Request, res: Response) => {
      res.status(HttpStatus.OK).json({
        hasFile: Boolean(req.file),
        size: req.file?.size ?? 0,
      });
    },
  );

  /**
   * Réplica local do tratamento de AppError, para não
   * carregar o logger real (que escreve em disco) nos testes.
   */
  app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof AppError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Erro interno" });
  });

  return app;
}

describe("imageUpload.middleware", () => {
  it("aceita um ficheiro de imagem e deixa-o em memória", async () => {
    const response = await request(buildApp())
      .post("/photo")
      .attach("photo", PNG_BYTES, { filename: "foto.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.hasFile).toBe(true);
    expect(response.body.size).toBe(PNG_BYTES.length);
  });

  it("não deixa o ficheiro passar sem ser validado, mas não bloqueia aqui", async () => {
    /**
     * A ausência é tratada pela validação do provider, para
     * que a mensagem de erro seja a mesma em qualquer rota.
     */
    const response = await request(buildApp()).post("/photo");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.hasFile).toBe(false);
  });

  it("responde 400, e não 500, quando o ficheiro excede o limite", async () => {
    const oversized = Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(IMAGE_LIMITS.MAX_FILE_SIZE_BYTES, 0x00),
    ]);

    const response = await request(buildApp())
      .post("/photo")
      .attach("photo", oversized, { filename: "grande.png", contentType: "image/png" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/tamanho máximo/i);
  });

  it("responde 400 quando o campo do formulário é inesperado", async () => {
    const response = await request(buildApp())
      .post("/photo")
      .attach("outroCampo", PNG_BYTES, {
        filename: "foto.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });
});
