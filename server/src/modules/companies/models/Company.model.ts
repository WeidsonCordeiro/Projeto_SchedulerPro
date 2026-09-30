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
import { StoredImage } from "../../../providers/images/types";

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
  logo?: StoredImage | null;
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

    /**
     * Logo da empresa.
     *
     * Formato único persistido: `StoredImage` ({ url, publicId }),
     * seguindo o mesmo padrão de `User.avatar` e `Client.avatar`.
     *
     * A imagem é gerida exclusivamente pelo `imageProvider`; a
     * empresa nunca envia uma URL arbitrária.
     */
    logo: {
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
