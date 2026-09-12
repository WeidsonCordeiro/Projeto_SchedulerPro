/**
 * ==========================================================
 * Arquivo: AvailabilityException.model.ts
 * ---
 * Responsabilidade:
 *
 * Representar um período/dia excepcionalmente indisponível,
 * independentemente da disponibilidade semanal recorrente.
 *
 * Exemplos:
 * - férias (VACATION);
 * - feriado (HOLIDAY);
 * - bloqueio manual / ausência excepcional (BLOCK).
 *
 * A data e os horários representam o tempo LOCAL da empresa
 * (mesmo padrão da disponibilidade semanal: strings "HH:mm").
 * Exceções têm prioridade sobre a disponibilidade recorrente.
 *
 * ==========================================================
 */

import { Document, Model, Schema, Types, model } from "mongoose";

/**
 * ==========================================================
 * Tipos de exceção.
 *
 * Na primeira versão o tipo é principalmente identificação/
 * apresentação; o comportamento de bloqueio é idêntico.
 * ==========================================================
 */
export enum AvailabilityExceptionType {
  BLOCK = "BLOCK",
  VACATION = "VACATION",
  HOLIDAY = "HOLIDAY",
}

/**
 * ==========================================================
 * Interface principal da exceção.
 * ==========================================================
 */
export interface AvailabilityException {
  companyId: Types.ObjectId;
  employeeId: Types.ObjectId;

  /** Data local da empresa no calendário "AAAA-MM-DD". */
  date: string;

  /** Indica bloqueio do dia inteiro. */
  allDay: boolean;

  /** Início do bloqueio no horário local ("HH:mm"). */
  startTime?: string | null;

  /** Fim do bloqueio no horário local ("HH:mm"). */
  endTime?: string | null;

  type: AvailabilityExceptionType;

  reason?: string | null;

  deletedAt?: Date | null;
}

/**
 * ==========================================================
 * Documento do Mongoose.
 * ==========================================================
 */
export interface AvailabilityExceptionDocument
  extends AvailabilityException, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ==========================================================
 * Schema da exceção.
 * ==========================================================
 */
const availabilityExceptionSchema = new Schema<AvailabilityExceptionDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    allDay: {
      type: Boolean,
      default: false,
    },

    startTime: {
      type: String,
      default: null,
      trim: true,
    },

    endTime: {
      type: String,
      default: null,
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(AvailabilityExceptionType),
      default: AvailabilityExceptionType.BLOCK,
      required: true,
    },

    reason: {
      type: String,
      default: null,
      trim: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "availability_exceptions",
  },
);

/**
 * ==========================================================
 * Índice para consultas por funcionário/data (verificação
 * de disponibilidade no Smart Scheduling).
 * ==========================================================
 */
availabilityExceptionSchema.index({
  companyId: 1,
  employeeId: 1,
  date: 1,
});

const AvailabilityExceptionModel: Model<AvailabilityExceptionDocument> =
  model<AvailabilityExceptionDocument>(
    "AvailabilityException",
    availabilityExceptionSchema,
  );

export default AvailabilityExceptionModel;