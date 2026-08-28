/**
 * ==========================================================
 * Arquivo: Company.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Model responsável por representar uma empresa
 * dentro do SchedulerPro.
 *
 * Toda informação da aplicação pertence a uma empresa.
 *
 * ==========================================================
 */

import { HydratedDocument, Schema, model, Types } from "mongoose";
import {
  DEFAULT_TIMEZONE,
  isValidIanaTimezone,
} from "../../../utils/timezone";

/**
 * ==========================================================
 * Interface da Empresa
 * ==========================================================
 */
export interface ICompany {
  name: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * ==========================================================
 * Schema da Empresa
 * ==========================================================
 */
const CompanySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    /**
     * Timezone utilizado pela empresa.
     *
     * Utiliza o padrão IANA Time Zone.
     *
     * Exemplos:
     * Europe/Lisbon
     * America/Sao_Paulo
     * Europe/London
     */
    timezone: {
      type: String,
      required: true,
      default: DEFAULT_TIMEZONE,
      trim: true,
      validate: {
        validator: (value: string) => isValidIanaTimezone(value),
        message: "Timezone IANA inválido.",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "companies",
  },
);

/**
 * ==========================================================
 * Índices
 * ==========================================================
 */

CompanySchema.index({
  deletedAt: 1,
});

CompanySchema.index({
  isActive: 1,
});

/**
 * ==========================================================
 * Remove informações internas antes de enviar ao cliente.
 * ==========================================================
 */

CompanySchema.set("toJSON", {
  transform(_, returnedObject) {
    const { __v, ...company } = returnedObject;

    return company;
  },
});

export type CompanyDocument = HydratedDocument<ICompany> & {
  _id: Types.ObjectId;
};

const Company = model<ICompany>("Company", CompanySchema);

export default Company;
