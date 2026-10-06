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

  /** SHA-256 lookup hash. The raw token is never stored in plaintext. */
  publicAccessTokenHash?: string | null;
  /** AES-256-GCM envelope used only to reproduce links in later reminders. */
  publicAccessTokenCiphertext?: string | null;

  /**
   * Marcas de lembretes automáticos enviados ao cliente.
   *
   * O horário em que o lembrete foi enviado (ou `null` enquanto
   * não enviado). Usadas como guarda de idempotência do job.
   */
  reminder24hSentAt?: Date | null;
  reminder2hSentAt?: Date | null;

  /**
   * Travas (lease) de processamento dos lembretes.
   *
   * Previne que duas execuções concorrentes do job enviem o
   * mesmo lembrete. Um processo que morre durante o envio deixa
   * a trava expirada e outra execução retoma.
   */
  reminder24hLeaseUntil?: Date | null;
  reminder2hLeaseUntil?: Date | null;

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

    /**
     * Hash do token público.
     *
     * `select: false` para que o hash nunca entre numa
     * consulta por omissão: obriga a pedir explicitamente,
     * o que torna cada leitura do hash rastreável no código.
     */
    publicAccessTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    publicAccessTokenCiphertext: {
      type: String,
      default: null,
      select: false,
    },

    reminder24hSentAt: {
      type: Date,
      default: null,
    },

    reminder2hSentAt: {
      type: Date,
      default: null,
    },

    reminder24hLeaseUntil: {
      type: Date,
      default: null,
    },

    reminder2hLeaseUntil: {
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

* ==========================================================
* Utilizado para consultas de agendamentos de clientes.
  */
appointmentSchema.index({
  companyId: 1,
  clientId: 1,
  startAt: 1,
});

/**

* ==========================================================
* Lookup do agendamento pelo token público.
*
* É um índice PARCIAL e não `sparse`:
*
* • `sparse` ignora documentos em que o campo não existe, mas
*   a maioria dos documentos deste schema tem o campo presente
*   com o valor `null` (default). Com `sparse`, todos esses
*   `null` seriam indexados e o índice UNIQUE recusaria a
*   criação do segundo agendamento sem token.
* • `partialFilterExpression` restringe o índice aos documentos
*   em que o hash é uma string, ignorando completamente os
*   `null`. Assim a unicidade só é imposta entre tokens reais.
*
* Consequência pretendida: dois agendamentos podem ter
* `null`, mas dois agendamentos com o mesmo hash nunca
* coexistem.
  */
appointmentSchema.index(
  { publicAccessTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      publicAccessTokenHash: { $type: "string" },
    },
  },
);

export default model<AppointmentDocument>("Appointment", appointmentSchema);
