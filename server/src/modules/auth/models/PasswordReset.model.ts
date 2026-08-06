/**
 * ==========================================================
 * Arquivo: PasswordReset.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Armazenar os pedidos de redefinição de palavra-passe.
 *
 * ==========================================================
 */

import { HydratedDocument, model, Schema, Types } from "mongoose";

export interface IPasswordReset {
  userId: string | Types.ObjectId;
  token: string;
  expiresAt: Date;
  usedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    token: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "password_resets",
  }
);

/**
 * ==========================================================
 * Índices
 * ==========================================================
 */

// Índice TTL
PasswordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // Expira automaticamente após a data de expiração
);

// Índice do utilizador
PasswordResetSchema.index({
  userId: 1,
});

// Índice do token
PasswordResetSchema.index({ token: 1 }, { unique: true });

export type PasswordResetDocument = HydratedDocument<IPasswordReset> & {
  _id: Types.ObjectId;
};

const PasswordReset = model<IPasswordReset>(
  "PasswordReset",
  PasswordResetSchema
);

export default PasswordReset;
