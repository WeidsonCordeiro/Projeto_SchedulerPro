/**
 * ==========================================================
 * Arquivo: imageValidation.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Validar um ficheiro de imagem ANTES de qualquer chamada ao
 * Cloudinary.
 *
 * Regra central: o MIME type declarado pelo cliente e a
 * extensão do nome do ficheiro NÃO são confiáveis. Um
 * atacante pode enviar qualquer conteúdo com
 * `Content-Type: image/png`. Por isso a validação aceite
 * apenas ficheiros cuja assinatura binária (magic bytes)
 * corresponde de facto a uma imagem permitida.
 * ==========================================================
 */

import { AppError } from "../../errors/AppError";
import { HttpMessages } from "../../constants/http-messages";
import { HttpStatus } from "../../constants/http-status";
import { IMAGE_LIMITS, type AllowedImageMimeType, type UploadedFile } from "./types";

/**
 * Assinaturas binárias dos formatos aceites.
 *
 * `mimeType` é o que realmente vai ser enviado ao Cloudinary:
 * não o que o cliente declarou. `extension` é usada para
 * mensagens de erro mais claras para o utilizador.
 */
interface ImageSignature {
  mimeType: AllowedImageMimeType;
  extension: string;
  /**
   * Verifica os primeiros bytes do ficheiro.
   */
  matches(buffer: Buffer): boolean;
}

/**
 * Verifica se `buffer` começa por `bytes`.
 */
function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) {
    return false;
  }

  return bytes.every((byte, index) => buffer[index] === byte);
}

/**
 * WebP tem a assinatura "RIFF" nos primeiros 4 bytes e "WEBP"
 * nos bytes 8..11.
 */
function isWebp(buffer: Buffer): boolean {
  return (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

const SIGNATURES: ImageSignature[] = [
  {
    mimeType: "image/jpeg",
    extension: ".jpg",
    matches: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]),
  },
  {
    mimeType: "image/png",
    extension: ".png",
    matches: (buffer) =>
      startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mimeType: "image/webp",
    extension: ".webp",
    matches: isWebp,
  },
];

/**
 * Formato humano para as mensagens de erro.
 */
const ACCEPTED_LABEL = IMAGE_LIMITS.ALLOWED_MIME_TYPES.map(
  (mime) => mime.replace("image/", "").toUpperCase(),
).join(", ");

/**
 * ==========================================================
 * Valida a presença do ficheiro.
 * ==========================================================
 */
export function assertImageFilePresent(
  file: UploadedFile | undefined | null,
): asserts file is UploadedFile {
  if (!file) {
    throw new AppError(
      HttpMessages.IMAGE_FILE_REQUIRED,
      HttpStatus.BAD_REQUEST,
      [{ field: IMAGE_LIMITS.FIELD, message: HttpMessages.IMAGE_FILE_REQUIRED }],
    );
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new AppError(
      HttpMessages.IMAGE_FILE_EMPTY,
      HttpStatus.BAD_REQUEST,
      [{ field: IMAGE_LIMITS.FIELD, message: HttpMessages.IMAGE_FILE_EMPTY }],
    );
  }
}

/**
 * ==========================================================
 * Valida o tamanho do ficheiro.
 * ==========================================================
 */
export function assertImageFileSize(file: UploadedFile): void {
  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      HttpMessages.IMAGE_FILE_TOO_LARGE,
      HttpStatus.BAD_REQUEST,
      [
        {
          field: IMAGE_LIMITS.FIELD,
          message: HttpMessages.IMAGE_FILE_TOO_LARGE,
        },
      ],
    );
  }
}

/**
 * ==========================================================
 * Valida o formato real do ficheiro.
 *
 * Confere a assinatura binária. O MIME declarado é apenas
 * consultado para devolver um erro mais preciso quando o
 * formato não é nenhum dos permitidos.
 * ==========================================================
 */
export function assertImageFileFormat(file: UploadedFile): void {
  const signature = SIGNATURES.find((candidate) => candidate.matches(file.buffer));

  if (!signature) {
    const declared = file.mimetype?.startsWith("image/")
      ? `${HttpMessages.IMAGE_FORMAT_NOT_ALLOWED} (${file.mimetype})`
      : HttpMessages.IMAGE_FORMAT_NOT_ALLOWED;

    throw new AppError(
      `${declared} ${HttpMessages.IMAGE_FORMAT_ACCEPTED}: ${ACCEPTED_LABEL}.`,
      HttpStatus.BAD_REQUEST,
      [{ field: IMAGE_LIMITS.FIELD, message: HttpMessages.IMAGE_FORMAT_NOT_ALLOWED }],
    );
  }
}

/**
 * ==========================================================
 * Valida o ficheiro inteiro.
 *
 * Devolve o MIME type real (detectado pela assinatura), que
 * é o que deve ser enviado ao storage. Nunca o declarado pelo
 * cliente.
 * ==========================================================
 */
export function validateImageFile(file: UploadedFile | undefined | null): AllowedImageMimeType {
  assertImageFilePresent(file);
  assertImageFileSize(file);
  assertImageFileFormat(file);

  const signature = SIGNATURES.find((candidate) => candidate.matches(file.buffer));

  if (!signature) {
    /**
     * Inalcançável: assertImageFileFormat já teria lançado.
     * Mantido para o TypeScript narrowing.
     */
    throw new AppError(
      HttpMessages.IMAGE_FORMAT_NOT_ALLOWED,
      HttpStatus.BAD_REQUEST,
    );
  }

  return signature.mimeType;
}
