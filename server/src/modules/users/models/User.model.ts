/**
 * ==========================================================
 * Arquivo: User.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Model responsável por representar um usuário do sistema.
 *
 * Este model será utilizado por:
 *
 * • Autenticação
 * • Empresas
 * • Funcionários
 * • Clientes
 * • Agenda
 * • Permissões
 *
 * Todo usuário pertence a uma empresa (multiempresa).
 *
 * ==========================================================
 */

import { Role } from "../../../constants/roles";
import { HydratedDocument, Schema, Types, model } from "mongoose";

/**
 * ==========================================================
 * Interface do Usuário
 * ==========================================================
 */
export interface IUser {
  /**
   * Dados pessoais
   */
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  avatar?: string | null;

  /**
   * Empresa
   */
  companyId: Types.ObjectId;

  /**
   * Permissão
   */
  role: Role;

  /**
   * Status
   */
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;

  /**
   * Segurança
   */
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  lastLogin?: Date | null;
  lastPasswordChange?: Date | null;

  /**
   * Auditoria
   */
  createdAt: Date;
  updatedAt: Date;
  /**
   * Soft Delete
   */
  deletedAt?: Date | null;
}

/**
 * ==========================================================
 * Schema do Usuário
 * ==========================================================
 */

const UserSchema = new Schema<IUser>(
  {
    /**
     * Dados pessoais
     */
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    /**
     * Empresa
     */
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    /**
     * Perfil
     */
    role: {
      type: String,
      enum: [...Object.values(Role)],
      default: Role.EMPLOYEE,
      required: true,
    },

    /**
     * Status
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    /**
     * Segurança
     */
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    lastPasswordChange: {
      type: Date,
      default: null,
    },

    /**
     * Soft Delete
     */
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "users",
  }
);

/**
 * ==========================================================
 * Índices
 * ==========================================================
 *
 * email
 * companyId
 * role
 * deletedAt
 * companyId + isActive
 *
 */

// Multiempresa
UserSchema.index({ companyId: 1 });

// Permissões
UserSchema.index({ role: 1 });

// Soft Delete
UserSchema.index({ deletedAt: 1 });

// Empresa + Status
UserSchema.index({
  companyId: 1,
  isActive: 1,
});

/**
 * ==========================================================
 * Remove informações internas antes de enviar ao cliente.
 *
 * passwordHash
 * __v
 *
 * ==========================================================
 */

UserSchema.set("toJSON", {
  transform(_, returnedObject) {
    const { passwordHash, __v, ...user } = returnedObject;

    return user;
  },
});

export type UserDocument = HydratedDocument<IUser> & {
  _id: Types.ObjectId;
};

const User = model<IUser>("User", UserSchema);

export default User;
