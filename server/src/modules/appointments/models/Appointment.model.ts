/**

* ==========================================================
* Arquivo: Appointment.model.ts
* ---
* Responsabilidade:
*
* Definir o schema e o modelo de dados dos agendamentos.
*
* Um agendamento pertence a uma empresa e relaciona:
*
* • Um cliente
* • Um serviço
* • Um funcionário responsável
*
* ==========================================================
  */

import { Document, Schema, Types, model } from "mongoose";
import { AppointmentStatus } from "../../../constants/appointment-status";

/**

* ==========================================================
* Interface do documento Appointment.
* ==========================================================
  */
export interface AppointmentDocument extends Document {
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceId: Types.ObjectId;
  employeeId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**

* ==========================================================
* Schema do Appointment.
* ==========================================================
  */
const appointmentSchema = new Schema<AppointmentDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.SCHEDULED,
      required: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
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
    collection: "appointments",
  },
);

/**

* ==========================================================
* Índices para consultas e verificação de conflitos.
* ==========================================================
  */

/**

* Utilizado para buscar agendamentos de um funcionário
* em determinado período.
  */
appointmentSchema.index({
  companyId: 1,
  employeeId: 1,
  startAt: 1,
});

/**

* Utilizado para consultas de agendamentos de clientes.
  */
appointmentSchema.index({
  companyId: 1,
  clientId: 1,
  startAt: 1,
});

export default model<AppointmentDocument>("Appointment", appointmentSchema);
