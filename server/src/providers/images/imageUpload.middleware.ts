/**
 * ==========================================================
 * Arquivo: imageUpload.middleware.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Middleware que recebe UM ficheiro de imagem num pedido
 * multipart e deixa-o disponível em `req.file`.
 *
 * Usa `multer.memoryStorage()` (e não
 * `multer-storage-cloudinary`) para que a validação de formato
 * e tamanho seja feita por `imageValidation.ts` ANTES de
 * qualquer chamada ao storage. Se o ficheiro for enviado
 * diretamente para o Cloudinary, um payload inválido já teria
 * ocupado espaço antes de ser rejeitado.
 *
 * Uso previsto nas próximas etapas:
 *
 *   router.post(
 *     "/employees/:id/photo",
 *     uploadSingleImage("photo"),
 *     EmployeeController.uploadPhoto,
 *   );
 *
 * A autorização (RBAC e tenancy) NÃO é feita aqui: continua a
 * pertencer aos middlewares existentes, aplicados antes deste.
 * ==========================================================
 */

import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../errors/AppError";
import { HttpMessages } from "../../constants/http-messages";
import { HttpStatus } from "../../constants/http-status";
import { IMAGE_LIMITS } from "./types";

/**
 * Traduz um erro do multer num AppError.
 *
 * Sem isto, um `MulterError` não é reconhecido pelo
 * `error.middleware.ts` e o utilizador receberia um 500
 * genérico em vez de "imagem demasiado grande".
 */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? HttpMessages.IMAGE_FILE_TOO_LARGE
        : error.code === "LIMIT_UNEXPECTED_FILE"
          ? HttpMessages.IMAGE_FILE_REQUIRED
          : HttpMessages.IMAGE_FILE_REQUIRED;

    return new AppError(message, HttpStatus.BAD_REQUEST, [
      { field: IMAGE_LIMITS.FIELD, message },
    ]);
  }

  return new AppError(
    HttpMessages.IMAGE_FILE_REQUIRED,
    HttpStatus.BAD_REQUEST,
    [{ field: IMAGE_LIMITS.FIELD, message: HttpMessages.IMAGE_FILE_REQUIRED }],
  );
}

/**
 * ==========================================================
 * Cria o middleware para um único ficheiro de imagem.
 * ==========================================================
 *
 * @param fieldName Nome do campo no formulário multipart.
 *                  Ex.: `image`, `photo`, `logo`.
 */
export function uploadSingleImage(fieldName: string) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      /**
       * Defence em profundidade: o multer interrompe o stream
       * assim que ultrapassa o limite, para não fazer o
       * processo carregar um ficheiro gigante em memória.
       * A validação final continua a ser feita no provider.
       */
      fileSize: IMAGE_LIMITS.MAX_FILE_SIZE_BYTES,

      /**
       * Um ficheiro por pedido. Qualquer campo extra é
       * rejeitado, impedindo que um pedido traga vários
       * ficheiros para ocupar espaço.
       */
      files: 1,
      fields: 4,
    },
  }).single(fieldName);

  return function imageUploadMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    upload(req, res, (error: unknown) => {
      if (error) {
        next(toAppError(error));
        return;
      }

      next();
    });
  };
}
