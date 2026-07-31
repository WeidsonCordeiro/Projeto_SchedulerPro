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
 * Este model será utilizado por:
 *
 * • Usuários
 * • Funcionários
 * • Clientes
 * • Serviços
 * • Agenda
 * • Financeiro
 *
 * Neste momento armazenamos apenas as informações
 * necessárias para o funcionamento da autenticação.
 *
 * Novos campos serão adicionados conforme os módulos
 * forem sendo implementados.
 *
 * ==========================================================
 */
import { HydratedDocument, Schema, model, Types } from "mongoose";

/**
 * ==========================================================
 * Interface da Empresa
 * ==========================================================
 */
export interface ICompany {
  name: string;
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
  }
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
 *
 * __v
 *
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
