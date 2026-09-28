/**
 * ==========================================================
 * Arquivo: UpdateUser.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para atualizar
 * um utilizador.
 *
 * ==========================================================
 */

import { Role } from "../../../constants/roles";

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: Role;
  /**
   * `avatar` NÃO é aceite aqui de propósito.
   *
   * Aceitar uma URL avulsa permitiria gravar uma imagem
   * sem `publicId` (impossível de remover do storage) e
   * apontar o avatar para um domínio externo. A foto só é
   * alterada pelos endpoints de foto, via `imageProvider`.
   */
  //isActive?: boolean;
}
