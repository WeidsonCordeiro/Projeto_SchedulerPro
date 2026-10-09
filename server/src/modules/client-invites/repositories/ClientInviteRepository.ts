/**

* ==========================================================
* Arquivo: ClientInviteRepository.ts
* ----------------------------------------------------------
* Responsabilidade:
*
* Camada responsável por acessar os dados dos convites de
* conta CLIENT.
*
* Nenhuma regra de negócio deve existir aqui.
* ==========================================================
  */

import { Types } from "mongoose";
import ClientInvite, { ClientInviteDocument } from "../models/ClientInvite.model";

class ClientInviteRepository {
  /**
   * ==========================================================
   * Cria um convite novo.
   * ==========================================================
   */
  public async create(data: {
    tokenHash: string;
    companyId: Types.ObjectId;
    clientId: Types.ObjectId;
    expiresAt: Date;
    createdBy: Types.ObjectId | null;
  }): Promise<ClientInviteDocument> {
    return ClientInvite.create(data);
  }

  /**
   * ==========================================================
   * Localiza um convite pelo hash do token.
   *
   * `tokenHash` tem `select: false` no schema: sem o `+` o
   * documento volta sem o campo e o serviço não conseguiria
   * registar o diagnóstico. O lookup em si funciona de
   * qualquer forma — o filtro da query não é afetado pelo
   * select.
   * ==========================================================
   */
  public async findByTokenHash(
    tokenHash: string,
  ): Promise<ClientInviteDocument | null> {
    return ClientInvite.findOne({ tokenHash }).select("+tokenHash");
  }

  /**
   * ==========================================================
   * Reclama (consome) um convite de forma atómica.
   *
   * Só transita de `usedAt: null` para preenchido se ainda
   * estiver pendente e dentro da expiração. Duas tentativas
   * concorrentes nunca consumem o mesmo convite: só a
   * primeira encontra o filtro.
   * ==========================================================
   */
  public async claim(id: string | Types.ObjectId): Promise<ClientInviteDocument | null> {
    return ClientInvite.findOneAndUpdate(
      {
        _id: id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
  }

  /**
   * ==========================================================
   * Devolve um convite ao estado pendente.
   *
   * Usado apenas quando o consumo foi seguido de uma falha
   * (ex.: o `User` não pôde ser criado) — sem isto, o cliente
   * ficaria sem conta e sem convite utilizável.
   * ==========================================================
   */
  public async release(
    id: string | Types.ObjectId,
    usedAt: Date,
  ): Promise<void> {
    await ClientInvite.updateOne(
      { _id: id, usedAt },
      { $set: { usedAt: null } },
    );
  }

  /**
   * ==========================================================
   * Revoga os convites pendentes de um cliente.
   *
   * Emitir um convite novo invalida os anteriores: fica no
   * máximo um link utilizável por cliente, o que limita o
   * espaço de tokens vivos e evita "convites zumbis" que
   * continuam válidos depois de um reenvio.
   * ==========================================================
   */
  public async revokePendingForClient(
    clientId: string | Types.ObjectId,
  ): Promise<void> {
    await ClientInvite.updateMany(
      { clientId, usedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }
}

export default new ClientInviteRepository();
