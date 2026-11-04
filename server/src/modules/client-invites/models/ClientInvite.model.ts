/**

* ==========================================================
* Arquivo: ClientInvite.model.ts
* ----------------------------------------------------------
* Responsabilidade:
*
* Representar um convite para criação de conta CLIENT.
*
* O convite associa um `Client` a um token de uso único:
*
* • `tokenHash` — SHA-256 do token puro; o plaintext nunca é
*   persistido (campo `select: false`, fora do retorno
*   padrão da query);
* • `expiresAt` — expiração obrigatória;
* • `usedAt` — consumo único; depois de aceite, o convite não
*   pode ser reutilizado;
* • `revokedAt` — invalidação administrativa (ex.: um novo
*   convite substitui os pendentes do mesmo cliente).
*
* O `companyId` e o `clientId` vêm do registo confiável do
* `Client` no momento da criação; no aceite, os valores são
* rederivados do `Client` atual e conferidos contra o convite.
* ==========================================================
  */

import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface IClientInvite {
  tokenHash: string;
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientInviteDocument = HydratedDocument<IClientInvite>;

const ClientInviteSchema = new Schema<IClientInvite>(
  {
    /**
     * Hash SHA-256 do token puro. É a credencial de lookup;
     * o token em texto nunca é gravado.
     */
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    /**
     * Empresa do convite — derivada do Client, nunca do
     * frontend.
     */
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    /**
     * Cliente convidado.
     */
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    /**
     * Expiração obrigatória: nenhum convite fica eternamente
     * válido.
     */
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * Preenchido no aceite bem-sucedido (uso único).
     */
    usedAt: {
      type: Date,
      default: null,
    },

    /**
     * Preenchido quando um convite pendente é substituído ou
     * revogado administrativamente.
     */
    revokedAt: {
      type: Date,
      default: null,
    },

    /**
     * Utilizador interno que iniciou o convite (auditoria).
     */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "client_invites",
  },
);

export default model<IClientInvite>("ClientInvite", ClientInviteSchema);
