import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import {
  IMAGE_FILE_ACCEPT,
  IMAGE_FORMAT_HINT,
  validateImageFile,
} from "../../config/imageUpload";
import type { StoredImage } from "../../types/image";
import ImageAvatar from "./ImageAvatar";
import type { ImageAvatarKind, ImageAvatarSize } from "./ImageAvatar";

interface ImageUploaderProps {
  /** Id único do input (evita colisões entre vários uploaders na mesma página). */
  id: string;
  name: string;
  image?: StoredImage | null;
  kind?: ImageAvatarKind;
  size?: ImageAvatarSize;
  /** Quando `false`, apenas mostra a imagem/placeholder, sem ações. */
  canManage: boolean;
  /** Executa o upload; deve lançar em caso de erro. Atualiza o estado do pai. */
  upload: (file: File) => Promise<void>;
  /** Remove a imagem; deve lançar em caso de erro. */
  remove: () => Promise<void>;
  uploadLabel?: string;
  replaceLabel?: string;
  removeLabel?: string;
  successUploadMessage?: string;
  successRemoveMessage?: string;
}

/**
 * Bloco de imagem com ações de upload/substituição/remoção.
 *
 * - Valida o ficheiro no cliente (UX) antes de enviar.
 * - Mostra pré-visualização instantânea via `URL.createObjectURL`, sempre
 *   revogada no fim (sucesso, erro ou desmontagem).
 * - Bloqueia ações duplicadas enquanto uma operação está em curso.
 * - Feedback de sucesso/erro inline. O backend continua a ser a autoridade.
 */
export default function ImageUploader({
  id,
  name,
  image,
  kind = "person",
  size = "lg",
  canManage,
  upload,
  remove,
  uploadLabel = "Adicionar foto",
  replaceLabel = "Substituir foto",
  removeLabel = "Remover foto",
  successUploadMessage = "Imagem atualizada com sucesso.",
  successRemoveMessage = "Imagem removida com sucesso.",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isUploading || isRemoving;
  const hasImage = Boolean(image?.url);
  const displayImage: StoredImage | null = previewUrl
    ? { url: previewUrl, publicId: "" }
    : image ?? null;

  function revokePreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }

  useEffect(() => revokePreview, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite voltar a escolher o mesmo ficheiro numa próxima tentativa.
    event.target.value = "";
    if (!file) {
      return;
    }

    setSuccessMessage(null);
    const validationError = validateImageFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    const objectUrl = URL.createObjectURL(file);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      await upload(file);
      setSuccessMessage(successUploadMessage);
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      revokePreview();
      setPreviewUrl(null);
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsRemoving(true);
    try {
      await remove();
      setSuccessMessage(successRemoveMessage);
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="image-uploader">
      <ImageAvatar
        image={displayImage}
        name={name}
        kind={kind}
        size={size}
        alt=""
        className="image-uploader-preview"
      />

      {canManage && (
        <div className="image-uploader-body">
          <div className="image-uploader-actions">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
            >
              {isUploading && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  aria-hidden="true"
                />
              )}
              {hasImage ? replaceLabel : uploadLabel}
            </button>

            {hasImage && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => void handleRemove()}
                disabled={isBusy}
              >
                {isRemoving && (
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    aria-hidden="true"
                  />
                )}
                {removeLabel}
              </button>
            )}
          </div>

          <p className="image-uploader-hint">{IMAGE_FORMAT_HINT}</p>

          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={IMAGE_FILE_ACCEPT}
            className="visually-hidden"
            aria-label={hasImage ? replaceLabel : uploadLabel}
            onChange={handleFileChange}
            disabled={isBusy}
          />

          {successMessage && (
            <p className="image-uploader-success" role="status">
              {successMessage}
            </p>
          )}

          {errorMessage && (
            <p className="image-uploader-error" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
