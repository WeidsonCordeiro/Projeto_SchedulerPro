/**
 * ==========================================================
 * Arquivo: Service.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir a estrutura dos serviços oferecidos
 * por uma empresa no SchedulerPro.
 *
 * ==========================================================
 */

import { Document, Schema, model, Types } from "mongoose";

export interface ServiceDocument extends Document {
  _id: Types.ObjectId;

  companyId: Types.ObjectId;

  name: string;
  description?: string;

  duration: number;
  price: number;

  isActive: boolean;

  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<ServiceDocument>(
  {
    /**
     * ==========================================================
     * Empresa proprietária do serviço
     * ==========================================================
     */
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    /**
     * ==========================================================
     * Nome do serviço
     * ==========================================================
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    /**
     * ==========================================================
     * Descrição
     * ==========================================================
     */
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    /**
     * ==========================================================
     * Duração em minutos
     *
     * Exemplo:
     * 30 = 30 minutos
     * 60 = 1 hora
     * ==========================================================
     */
    duration: {
      type: Number,
      required: true,
      min: 5,
    },

    /**
     * ==========================================================
     * Preço do serviço
     * ==========================================================
     */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * ==========================================================
     * Estado do serviço
     * ==========================================================
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    /**
     * ==========================================================
     * Data de exclusão lógica do serviço
     * ==========================================================
     */
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "services",
  },
);

const Service = model<ServiceDocument>("Service", serviceSchema);

export default Service;
