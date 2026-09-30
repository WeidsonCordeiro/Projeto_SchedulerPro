/**
 * ==========================================================
 * Arquivo: ImageProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir o contrato para o armazenamento de imagens.
 *
 * Segue o mesmo padrão de `EmailProvider`/`ResendProvider`:
 * classe abstrata com o contrato, implementação concreta
 * isolada noutro ficheiro e exportada como instância única.
 * ==========================================================
 */

import type {
  IImageProvider,
  RemoveImageDto,
  ReplaceImageDto,
  StoredImage,
  UploadImageDto,
} from "./types";

export default abstract class ImageProvider implements IImageProvider {
  public abstract upload(data: UploadImageDto): Promise<StoredImage>;

  public abstract remove(data: RemoveImageDto): Promise<void>;

  public abstract replace(data: ReplaceImageDto): Promise<StoredImage>;
}
