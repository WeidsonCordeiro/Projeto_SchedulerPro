/**
 * Regras de validação de imagem no frontend.
 *
 * Espelham os limites do backend (server/src/providers/images/types.ts) para
 * dar feedback imediato ao utilizador. O backend continua a ser a autoridade
 * final: valida formato real (assinatura binária) e tamanho.
 */

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Valor do atributo `accept` do <input type="file">. */
export const IMAGE_FILE_ACCEPT = ACCEPTED_IMAGE_MIME_TYPES.join(",");

export const IMAGE_FORMAT_HINT =
  "Formatos aceitos: JPEG, PNG ou WebP. Tamanho máximo: 5 MB.";

export const IMAGE_ERRORS = {
  empty: "O ficheiro selecionado está vazio.",
  format: "Formato não suportado. Utilize JPEG, PNG ou WebP.",
  tooLarge: "A imagem deve ter no máximo 5 MB.",
} as const;

/**
 * Valida um ficheiro antes do upload. Devolve a mensagem de erro ou `null`
 * quando o ficheiro é aceite. É validação de UX: nunca substitui a do backend.
 */
export function validateImageFile(file: Pick<File, "type" | "size">): string | null {
  if (!file.size) {
    return IMAGE_ERRORS.empty;
  }

  if (
    !ACCEPTED_IMAGE_MIME_TYPES.includes(file.type as AcceptedImageMimeType)
  ) {
    return IMAGE_ERRORS.format;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return IMAGE_ERRORS.tooLarge;
  }

  return null;
}
