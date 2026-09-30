/**
 * ==========================================================
 * Arquivo: CloudinaryImageProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar o armazenamento de imagens através do Cloudinary.
 *
 * Decisões importantes:
 *
 * 1. Este é o ÚNICO ficheiro do projeto que importa o SDK do
 *    Cloudinary. Controllers, services, models e routes nunca
 *    falam com o fornecedor diretamente.
 *
 * 2. O SDK já estava declarado em `package.json`
 *    (`cloudinary`, `multer`, `multer-storage-cloudinary`) mas
 *    não era importado em lado nenhum. Esta implementação
 *    passa a usar a dependência já existente, em vez de criar
 *    uma integração paralela.
 *
 * 3. Não é usado `multer-storage-cloudinary`: essa engine
 *    envia o ficheiro diretamente para o storage, o que
 *    impediria validar o formato antes do upload e não
 *    expõe uma forma limpa de `destroy()` para
 *    remover/substituir. O ficheiro chega em memória
 *    (`multer.memoryStorage`) e é validado por
 *    `validateImageFile` antes de qualquer chamada remota.
 *
 * 4. A configuração é validada a cada operação, e não no
 *    arranque da aplicação: nesta etapa a functionality é
 *    opcional, e exigir as variáveis em `validateEnv()`
 *    quebraria o arranque de instalações que ainda não usam
 *    imagens.
 * ==========================================================
 */

import { v2 as cloudinary } from "cloudinary";

import ImageProvider from "./ImageProvider";
import { validateImageFile } from "./imageValidation";
import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { HttpMessages } from "../../constants/http-messages";
import { HttpStatus } from "../../constants/http-status";
import logger from "../logger";
import type {
  AllowedImageMimeType,
  ImageEntityType,
  RemoveImageDto,
  ReplaceImageDto,
  StoredImage,
  UploadedFile,
  UploadImageDto,
} from "./types";

/**
 * Prefixo de pasta por entidade.
 *
 * Organiza os ficheiros no Cloudinary e permite localizar
 * todos os recursos de uma entidade (por exemplo, para uma
 * limpeza futura quando um funcionário é eliminado).
 *
 * O `public_id` devolvido pelo Cloudinary JÁ inclui a pasta
 * (ex.: `schedulerpro/employee/abc123`), pelo que o mesmo
 * valor serve para `destroy()`.
 */
const FOLDERS: Record<ImageEntityType, string> = {
  employee: "schedulerpro/employee",
  client: "schedulerpro/client",
  company: "schedulerpro/company",
};

/**
 * Converte o buffer num data URI.
 *
 * O `mimetype` usado é o detetado pela assinatura binária
 * em `validateImageFile`, nunca o declarado pelo cliente.
 */
function toDataUri(file: { buffer: Buffer }, mimeType: string): string {
  return `data:${mimeType};base64,${file.buffer.toString("base64")}`;
}

/**
 * Normaliza um erro desconhecido para algo que o logger aceite.
 */
function toLoggable(error: unknown): Error | string {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return HttpMessages.INTERNAL_ERROR;
  }
}

/**
 * Normaliza os erros do SDK num AppError.
 */
function toAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const detail =
    error instanceof Error ? error.message : HttpMessages.INTERNAL_ERROR;

  return new AppError(
    `${fallbackMessage} (${detail})`,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

class CloudinaryImageProvider extends ImageProvider {
  /**
   * Garante que as credenciais existem.
   *
   * Sem credenciais, a aplicação não tem como enviar imagens.
   * É um erro de configuração do ambiente, não do pedido do
   * utilizador, por isso responde 500 e não 400.
   */
  private assertConfigured(): void {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
      env.cloudinary;

    if (
      !CLOUDINARY_CLOUD_NAME ||
      !CLOUDINARY_API_KEY ||
      !CLOUDINARY_API_SECRET
    ) {
      logger.error(new Error(HttpMessages.IMAGE_NOT_CONFIGURED));

      throw new AppError(
        HttpMessages.IMAGE_NOT_CONFIGURED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    /**
     * Configurado de forma idempotente: o SDK é um singleton
     * partilhado, mas registar a configuração a cada operação
     * mantém o provider independente da ordem de importação.
     */
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  /**
   * ==========================================================
   * Envia a imagem.
   *
   * Valida o ficheiro ANTES de tocar na rede: formato real,
   * tamanho e presença.
   * ==========================================================
   */
  public async upload({ file, entity }: UploadImageDto): Promise<StoredImage> {
    const mimeType = validateImageFile(file);

    return this.send({ file, entity, mimeType });
  }

  /**
   * ==========================================================
   * Executa o upload propriamente dito.
   *
   * Separado de `upload()` para que `replace()` possa validar
   * o novo ficheiro uma única vez e só depois destruir a
   * imagem anterior.
   * ==========================================================
   */
  private async send({
    file,
    entity,
    mimeType,
  }: {
    file: UploadedFile;
    entity: ImageEntityType;
    mimeType: AllowedImageMimeType;
  }): Promise<StoredImage> {
    this.assertConfigured();

    logger.upload("A enviar imagem para o storage", {
      entity,
      originalName: file.originalname,
      size: file.size,
    });

    try {
      const result = await cloudinary.uploader.upload(
        toDataUri(file, mimeType),
        {
          resource_type: "image",
          folder: FOLDERS[entity],
          /**
           * Cada upload gera um public_id novo. `overwrite` e
           * `unique_filename` ficam explícitos para que uma
           * repetição do pedido nunca destrua silenciosamente
           * uma imagem já associada a outra entidade.
           */
          overwrite: false,
          unique_filename: true,
        },
      );

      if (!result?.secure_url || !result?.public_id) {
        throw new AppError(
          HttpMessages.IMAGE_UPLOAD_FAILED,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      logger.upload("Imagem enviada com sucesso", {
        entity,
        publicId: result.public_id,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error(toLoggable(error), { operation: "upload" });

      throw toAppError(error, HttpMessages.IMAGE_UPLOAD_FAILED);
    }
  }

  /**
   * ==========================================================
   * Remove a imagem.
   *
   * Idempotente: se o recurso já não existir no Cloudinary
   * (`not found`), considera concluído. Sem isto, limpar um
   * registo cuja imagem já tinha sido removida devolveria 500.
   * ==========================================================
   */
  public async remove({ image }: RemoveImageDto): Promise<void> {
    this.assertConfigured();

    try {
      const result = await cloudinary.uploader.destroy(image.publicId, {
        resource_type: "image",
        invalidate: true,
      });

      if (result?.result !== "ok" && result?.result !== "not found") {
        throw new AppError(
          HttpMessages.IMAGE_REMOVE_FAILED,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      logger.upload("Imagem removida do storage", {
        publicId: image.publicId,
        result: result?.result,
      });
    } catch (error) {
      logger.error(toLoggable(error), { operation: "remove" });

      throw toAppError(error, HttpMessages.IMAGE_REMOVE_FAILED);
    }
  }

  /**
   * ==========================================================
   * Substitui a imagem.
   *
   * Remove a anterior e envia a nova, devolvendo apenas os
   * dados da nova imagem (o `publicId` antigo deixa de ser
   * válido e não pode continuar no model).
   *
   * ORDEM IMPORTANTE: o ficheiro novo é validado ANTES de
   * destruir o anterior. Caso contrário, um upload inválido
   * deixaria a entidade sem imagem nenhuma.
   *
   * Se a remoção falhar, o upload continua: perder a imagem
   * antiga é preferível a deixar a entidade sem imagem. O
   * `publicId` órfão fica registado no log para limpeza.
   * ==========================================================
   */
  public async replace({
    file,
    entity,
    previous,
  }: ReplaceImageDto): Promise<StoredImage> {
    const mimeType = validateImageFile(file);

    if (previous) {
      try {
        await this.remove({ image: previous });
      } catch (error) {
        logger.error(toLoggable(error), {
          operation: "replace",
          orphanPublicId: previous.publicId,
        });
      }
    }

    return this.send({ file, entity, mimeType });
  }
}

export default new CloudinaryImageProvider();
