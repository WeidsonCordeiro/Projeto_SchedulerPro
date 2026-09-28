/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Contrato e tipos do provider de imagens.
 *
 * Esta camada é agnóstica ao fornecedor: nada aqui importa o
 * SDK do Cloudinary. Trocar de CDN/storage no futuro obriga
 * apenas a reimplementar `ImageProvider`, sem tocar em
 * controllers, services ou models.
 * ==========================================================
 */

/**
 * Entidades do sistema que podem ter imagem.
 *
 * Usado para organizar os ficheiros por pasta no storage e
 * para deixar explícito que a infraestrutura é reutilizável
 * por funcionários, clientes e empresa — sem duplicar código.
 */
export const ImageEntity = {
  EMPLOYEE: "employee",
  CLIENT: "client",
  COMPANY: "company",
} as const;

export type ImageEntityType = (typeof ImageEntity)[keyof typeof ImageEntity];

/**
 * Imagem efetivamente persistida.
 *
 * Esta é a ÚNICA estrutura a guardar nos models. Não criar
 * formatos diferentes para employee/client/company.
 *
 * `url` é o que o frontend consome. `publicId` é o que o
 * provider precisa para remover/substituir mais tarde — sem
 * ele, o ficheiro no Cloudinary tornava-se órfão.
 */
export interface StoredImage {
  /**
   * URL segura (https) do ficheiro, pronta para `<img src>`.
   */
  url: string;

  /**
   * Identificador do recurso no storage.
   *
   * Nunca expor ao cliente nem usar para montar URLs.
   */
  publicId: string;
}

/**
 * Ficheiro recebido num pedido multipart.
 *
 * Compatível com o objeto devolvido pelo multer, para que os
 * controllers não dependam de `Express.Multer.File`.
 */
export interface UploadedFile {
  /**
   * Conteúdo binário em memória.
   */
  buffer: Buffer;

  /**
   * Nome original enviado pelo cliente.
   *
   * NÃO é usado para validar o formato nem para decidir a
   * extensão no storage: serve apenas para mensagens de log.
   */
  originalname: string;

  /**
   * MIME type declarado pelo cliente no cabeçalho do pedido.
   *
   * Não é confiável. A validação real é feita por assinatura
   * binária (magic bytes) em `validateImageFile`.
   */
  mimetype: string;

  /**
   * Tamanho em bytes.
   */
  size: number;
}

/**
 * Entrada de upload.
 */
export interface UploadImageDto {
  file: UploadedFile;
  entity: ImageEntityType;
}

/**
 * Entrada de remoção.
 */
export interface RemoveImageDto {
  /**
   * Imagem previamente persistida no model.
   */
  image: StoredImage;
}

/**
 * Entrada de substituição.
 *
 * `previous` é opcional para permitir o primeiro upload de uma
 * entidade que ainda não tem imagem (não haveria o que apagar).
 */
export interface ReplaceImageDto extends UploadImageDto {
  previous: StoredImage | null;
}

/**
 * Limites aplicados antes de qualquer chamada ao storage.
 *
 * Definidos aqui (e não em cada rota) para que uploading de
 * avatar e de logo partilhem exatamente as mesmas regras.
 */
export const IMAGE_LIMITS = {
  /**
   * Tamanho máximo: 5 MB.
   *
   * Suficiente para uma foto de perfil ou logo em alta
   * qualidade, e pequeno o suficiente para não abusar do
   * armazenamento nem da memória do processo.
   */
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,

  /**
   * MIME types permitidos.
   *
   * JPEG, PNG e WebP cobrem fotos de perfil e logotipos com
   * boa qualidade e compressão. GIF fica de fora de propósito:
   * não é necessário para avatar/logo e traz custo de
   * armazenamento e superfície de abuso desnecessários.
   */
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,

  /**
   * Campo de texto usado nos erros de validação, para que a
   * resposta siga o mesmo formato de `ValidationError` do resto
   * da API.
   */
  FIELD: "image",
} as const;

export type AllowedImageMimeType = (typeof IMAGE_LIMITS.ALLOWED_MIME_TYPES)[number];

/**
 * Contrato do provider de imagens.
 *
 * Implementado por `CloudinaryImageProvider`. Controllers e
 * services dependem apenas desta interface.
 */
export interface IImageProvider {
  /**
   * Envia uma imagem e devolve os dados a persistir.
   */
  upload(data: UploadImageDto): Promise<StoredImage>;

  /**
   * Remove a imagem do storage.
   *
   * Deve ser idempotente: remover uma imagem já removida não
   * é erro.
   */
  remove(data: RemoveImageDto): Promise<void>;

  /**
   * Remove a imagem anterior e envia a nova, devolvendo
   * apenas os dados da nova.
   */
  replace(data: ReplaceImageDto): Promise<StoredImage>;
}
