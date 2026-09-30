/**

* ==========================================================
* Arquivo: EmployeeAvailability.model.ts
* ---
* Responsabilidade:
*
* Representar os horários de disponibilidade de um
* funcionário para atendimento.
*
* Cada funcionário possui uma disponibilidade por dia
* da semana, podendo trabalhar no período da manhã,
* da tarde ou em ambos.
*
* ==========================================================
  */

import { Document, Model, Schema, Types, model } from "mongoose";

/**

* ==========================================================
* Dias da semana.
* ==========================================================
  */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

/**

* ==========================================================
* Interface principal da disponibilidade.
* ==========================================================
  */
export interface EmployeeAvailability {
  companyId: Types.ObjectId;
  employeeId: Types.ObjectId;
  dayOfWeek: DayOfWeek;

  morningStart?: string | null;
  morningEnd?: string | null;

  afternoonStart?: string | null;
  afternoonEnd?: string | null;

  deletedAt?: Date | null;
}

/**

* ==========================================================
* Documento do Mongoose.
* ==========================================================
  */
export interface EmployeeAvailabilityDocument
  extends EmployeeAvailability, Document {
  createdAt: Date;
  updatedAt: Date;
}

/**

* ==========================================================
* Schema da disponibilidade.
* ==========================================================
  */
const employeeAvailabilitySchema = new Schema<EmployeeAvailabilityDocument>(
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

    dayOfWeek: {
      type: Number,
      enum: Object.values(DayOfWeek).filter(
        (value) => typeof value === "number",
      ),
      required: true,
    },

    /**

  * ==========================================================
  * Período da manhã.
  * ==========================================================
    */
    morningStart: {
      type: String,
      default: null,
      trim: true,
    },

    morningEnd: {
      type: String,
      default: null,
      trim: true,
    },

    /**

  * ==========================================================
  * Período da tarde.
  * ==========================================================
    */
    afternoonStart: {
      type: String,
      default: null,
      trim: true,
    },

    afternoonEnd: {
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
    collection: "availability",
  },
);

/**

* ==========================================================
* Garante apenas uma disponibilidade por funcionário
* para cada dia da semana.
* ==========================================================
  */
employeeAvailabilitySchema.index(
  {
    companyId: 1,
    employeeId: 1,
    dayOfWeek: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
    },
  },
);

const EmployeeAvailability: Model<EmployeeAvailabilityDocument> =
  model<EmployeeAvailabilityDocument>(
    "EmployeeAvailability",
    employeeAvailabilitySchema,
  );

export default EmployeeAvailability;
