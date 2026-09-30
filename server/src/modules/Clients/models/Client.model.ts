/**
 * ==========================================================
 * Arquivo: Client.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os clientes das empresas cadastradas
 * no SchedulerPro.
 *
 * O cliente não é necessariamente um utilizador do sistema.
 * Pode existir apenas como cadastro para agendamentos.
 *
 * ==========================================================
 */

import { Schema, model, Document, Types } from "mongoose";
import { StoredImage } from "../../../providers/images/types";

export interface ClientDocument extends Document {
  name: string;
  email?: string | null;
  phone: string;
  companyId: Types.ObjectId;
  notes?: string | null;
  avatar?: StoredImage | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<ClientDocument>(
  {
    /**
     * Nome do cliente.
     */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * E-mail do cliente.
     */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    /**
     * Número de telefone/telemóvel.
     */
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Empresa à qual o cliente pertence.
     */
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    /**
     * Observações internas sobre o cliente.
     */
    notes: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * Foto do cliente.
     *
     * Formato único persistido: `StoredImage` ({ url, publicId }),
     * seguindo o mesmo padrão de `User.avatar`.
     *
     * A imagem é gerida exclusivamente pelo `imageProvider`; o
     * cliente nunca envia uma URL arbitrária.
     */
    avatar: {
      type: new Schema(
        {
          url: {
            type: String,
            required: true,
          },
          publicId: {
            type: String,
            required: true,
          },
        },
        { _id: false },
      ),
      default: null,
    },

    /**
     * Define se o cliente está ativo.
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * Soft delete.
     */
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "clients",
  },
);

export default model<ClientDocument>("Client", ClientSchema);
