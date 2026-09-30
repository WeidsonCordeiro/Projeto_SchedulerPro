/**
 * Imagem armazenada no backend (avatar de funcionário/cliente ou logo da
 * empresa). Espelha `StoredImage` do provider de imagens
 * (server/src/providers/images/types.ts).
 *
 * O frontend usa apenas `url` para render. `publicId` faz parte do contrato
 * devolvido pelo backend mas nunca é usado para montar URLs nem exposto na UI.
 */
export interface StoredImage {
  url: string;
  publicId: string;
}
