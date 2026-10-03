/**

* ==========================================================
* Arquivo: AppointmentRepository.ts
* ---
* Responsabilidade:
*
* Camada responsável por acessar os dados dos agendamentos.
*
* Nenhuma regra de negócio deve existir aqui.
*
* ==========================================================
  */

import { Types } from "mongoose";
import Appointment, { AppointmentDocument } from "../models/Appointment.model";
import { CreateAppointmentData, UpdateAppointmentData } from "../index";
import { AppointmentStatus } from "../../../constants/appointment-status";

/**
 * Janela opcional de consulta por período. Quando informada, apenas os
 * agendamentos que SObrepõem a janela são devolvidos:
 *
 *   agendamento.startAt < janela.endAt && agendamento.endAt > janela.startAt
 *
 * As datas são instantes UTC (mesmo contrato de startAt/endAt dos
 * agendamentos). A janela é calculada pelo frontend no timezone da empresa
 * e convertida para UTC antes da chamada.
 */
export interface AppointmentListRange {
  startAt?: Date;
  endAt?: Date;
}

/**
 * Campos do documento usados na persistência dos lembretes.
 *
 * Os nomes vêm do enum `ReminderType` (módulo reminders) e são
 * mapeados aqui para os campos correspondentes no modelo.
 */
export interface ReminderFields {
  sentField: string;
  leaseField: string;
}

class AppointmentRepository {
/**
  
* ==========================================================
* Busca um agendamento pelo ID.
  */
  public async findById(
    id: string | Types.ObjectId,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  /**
  
* ==========================================================
* Busca um agendamento pelo HASH do token público.
*
* É o ÚNICO caminho de resolução de acesso público. Não
* aceita `_id`, `clientId` nem e-mail: o token é a credencial.
*
* `deletedAt: null` está no próprio filtro, o que faz um
* agendamento eliminado soft ser indistinguível de um token
* inválido — ambos devolvem `null`.
*
* O campo tem `select: false` no schema, por isso é pedido
* explicitamente; o hash devolvido serve para confirmar a
* correspondência e para Diagnóstico, nunca para resposta HTTP.
  */
  public async findByPublicAccessTokenHash(
    hash: string,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findOne({
      publicAccessTokenHash: hash,
      deletedAt: null,
    }).select("+publicAccessTokenHash");
  }

  /**
  
* ==========================================================
* Busca os agendamentos de uma empresa.
*
* Quando clientId é informado, apenas os agendamentos
* daquele cliente (mesma empresa) são devolvidos.
* ==========================================================
  */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
    range?: AppointmentListRange,
    clientId?: string | Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = {
      companyId,
      deletedAt: null,
    };

    if (clientId) {
      query.clientId = clientId;
    }

    if (range?.startAt) {
      query.endAt = { $gt: range.startAt };
    }
    if (range?.endAt) {
      query.startAt = { $lt: range.endAt };
    }

    return Appointment.find(query).sort({
      startAt: 1,
    });
  }

  /**

* ==========================================================
* Cria um novo agendamento.
* ==========================================================
  */
  public async create(
    data: CreateAppointmentData,
  ): Promise<AppointmentDocument> {
    return Appointment.create(data);
  }

  /**

* ==========================================================
* Atualiza um agendamento.
* ==========================================================
  */
  public async update(
    id: string | Types.ObjectId,
    data: UpdateAppointmentData,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findOneAndUpdate({ _id: id, deletedAt: null }, data, {
      new: true,
      runValidators: true,
    });
  }

  /**

* ==========================================================
* Atualiza o status de um agendamento.
* ==========================================================
  */
  public async updateStatus(
    id: string | Types.ObjectId,
    status: AppointmentStatus,
  ): Promise<AppointmentDocument | null> {
    return Appointment.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { status },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**

* ==========================================================
* Verifica conflito de horário para um funcionário.
*
* Um funcionário não pode possuir dois agendamentos
* sobrepostos.
* ==========================================================
  */
  public async hasEmployeeConflict(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string | Types.ObjectId,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      employeeId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $lt: endAt,
      },
      endAt: {
        $gt: startAt,
      },
    };

    if (excludeAppointmentId) {
      query._id = {
        $ne: excludeAppointmentId,
      };
    }

    const appointment = await Appointment.findOne(query);

    return Boolean(appointment);
  }

  /**

* ==========================================================
* Lista os agendamentos que BLOQUEIAM o horário de um
* profissional dentro de uma janela.
*
* É a mesma consulta de `hasEmployeeConflict`, devolvendo os
* documentos em vez de um booleano. Existe para o catálogo
* público de disponibilidade, que precisa de subtrair os
* horários ocupados do período do dia.
*
* Reutiliza deliberadamente o mesmo bloco de filtro, para que
* a lista de bloqueios e a verificação de conflito nunca
* discordem sobre o que ocupa um horário.
* ==========================================================
  */
  public async findBlockingForEmployee(
    companyId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find({
      companyId,
      employeeId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $lt: windowEnd,
      },
      endAt: {
        $gt: windowStart,
      },
    });
  }

  /**

* ==========================================================
* Verifica conflito de horário para um cliente.
*
* Um cliente não pode possuir dois agendamentos
* sobrepostos, mesmo com funcionários diferentes.
* ==========================================================
  */
  public async hasClientConflict(
    companyId: string | Types.ObjectId,
    clientId: string | Types.ObjectId,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string | Types.ObjectId,
  ): Promise<boolean> {
    const query: Record<string, unknown> = {
      companyId,
      clientId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $lt: endAt,
      },
      endAt: {
        $gt: startAt,
      },
    };

    if (excludeAppointmentId) {
      query._id = {
        $ne: excludeAppointmentId,
      };
    }

    const appointment = await Appointment.findOne(query);

    return Boolean(appointment);
  }

  /**
   * ==========================================================
   * Busca agendamentos futuros aptos a receber lembretes.
   *
   * Retorna apenas agendamentos ativos (scheduled/confirmed),
   * sem soft delete, que começam depois de `now` e até
   * `now + lookaheadMs`. O lookahead cobre a janela mais longa
   * (24h + tolerância) e o serviço de lembretes decide, item a
   * item, qual lembrete está dentro da janela válida.
   *
   * A consulta é global (todas as empresas); o isolamento por
   * empresa acontece nas buscas de company/client do serviço,
   * sempre usando o companyId do próprio agendamento.
   * ==========================================================
   */
  public async findUpcomingForReminders(
    now: Date,
    lookaheadMs: number,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find({
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: {
        $gt: now,
        $lte: new Date(now.getTime() + lookaheadMs),
      },
    })
      .select("+publicAccessTokenCiphertext +publicAccessTokenHash")
      .sort({ startAt: 1 });
  }

  /**
   * ==========================================================
   * Reivindica (claim) um lembrete de forma atômica.
   *
   * Só atualiza se o lembrete ainda não foi enviado
   * (`sentField: null`) e a trava atual está livre ou expirada.
   * Essa condição torna a operação idempotente sob concorrência:
   * apenas uma execução do job consegue fazer o claim de cada
   * lembrete por vez.
   *
   * O status é revalidado para garantir que agendamentos
   * cancelados/no-show/completed/soft-deleted entre a consulta
   * e o claim não recebam lembrete.
   * ==========================================================
   */
  public async claimReminder(
    id: string | Types.ObjectId,
    fields: ReminderFields,
    leaseUntil: Date,
    now: Date,
  ): Promise<{ modifiedCount?: number }> {
    return Appointment.updateOne(
      {
        _id: id,
        deletedAt: null,
        status: {
          $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        [fields.sentField]: null,
        $or: [
          { [fields.leaseField]: null },
          { [fields.leaseField]: { $lte: now } },
        ],
      },
      { $set: { [fields.leaseField]: leaseUntil } },
    );
  }

  /**
   * ==========================================================
   * Marca um lembrete como enviado e libera a trava.
   *
   * Chamado apenas depois do e-mail ser enviado com sucesso.
   * ==========================================================
   */
  public async markReminderSent(
    id: string | Types.ObjectId,
    fields: ReminderFields,
    sentAt: Date,
  ): Promise<{ modifiedCount?: number }> {
    return Appointment.updateOne(
      { _id: id },
      {
        $set: {
          [fields.sentField]: sentAt,
          [fields.leaseField]: null,
        },
      },
    );
  }

  /**
   * ==========================================================
   * Libera a trava de um lembrete sem marcar como enviado.
   *
   * Usado quando o envio falha, para que uma execução posterior
   * tente novamente.
   * ==========================================================
   */
  public async releaseReminderLease(
    id: string | Types.ObjectId,
    leaseField: string,
  ): Promise<{ modifiedCount?: number }> {
    return Appointment.updateOne(
      { _id: id },
      { $set: { [leaseField]: null } },
    );
  }

  /**
   * ==========================================================
   * Cancela agendamentos com status "scheduled" cujo início
   * já passou.
   *
   * Apenas o status "scheduled" é afetado; os demais
   * (confirmed, completed, cancelled, no-show) permanecem.
   * ==========================================================
   */
  public async cancelOverdueScheduled(
    companyId: string | Types.ObjectId,
    now: Date,
  ): Promise<number> {
    const result = await Appointment.updateMany(
      {
        companyId,
        deletedAt: null,
        status: AppointmentStatus.SCHEDULED,
        startAt: { $lt: now },
      },
      { $set: { status: AppointmentStatus.CANCELLED } },
    );

    return result.modifiedCount ?? 0;
  }

  /**

* ==========================================================
* Remove um agendamento.
*
* Soft delete.
* ==========================================================
  */
  public async softDelete(id: string | Types.ObjectId): Promise<void> {
    await Appointment.findOneAndUpdate({ _id: id, deletedAt: null }, {
      deletedAt: new Date(),
    });
  }
}

export default new AppointmentRepository();
