/**
 * ==========================================================
 * Arquivo: Notification.model.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir o schema e o modelo de dados das notificações
 * internas do SchedulerPro.
 *
 * Cada notificação pertence a uma empresa (companyId) e a um
 * utilizador (userId). A leitura é individual: readAt nulo
 * significa "não lida".
 *
 * ==========================================================
 */

import { Document, Schema, Types, model } from "mongoose";
import { NotificationType } from "../index";

/**
 * ==========================================================
 * Interface do documento Notification.
 * ==========================================================
 */
export interface NotificationDocument extends Document {
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date | null;
  metadata?: {
    appointmentId?: Types.ObjectId | null;
    clientId?: Types.ObjectId | null;
    serviceId?: Types.ObjectId | null;
    employeeId?: Types.ObjectId | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ==========================================================
 * Schema da Notification.
 * ==========================================================
 */
const notificationSchema = new Schema<NotificationDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    metadata: {
      appointmentId: {
        type: Schema.Types.ObjectId,
        ref: "Appointment",
        default: null,
      },
      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        default: null,
      },
      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        default: null,
      },
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      _id: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "notifications",
  },
);

/**
 * ==========================================================
 * Índices para consultas da central de notificações.
 * ==========================================================
 */

/**
 * Lista por utilizador (empresa + utilizador antigas primeiro).
 */
notificationSchema.index({
  companyId: 1,
  userId: 1,
  createdAt: -1,
});

/**
 * Contagem de não lidas por utilizador.
 */
notificationSchema.index({
  companyId: 1,
  userId: 1,
  readAt: 1,
});

export default model<NotificationDocument>(
  "Notification",
  notificationSchema,
);