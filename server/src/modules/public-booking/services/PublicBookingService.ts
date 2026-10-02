/**

* ==========================================================
* Arquivo: PublicBookingService.ts
* ---
* Responsabilidade:
*
* Regras de negócio do CATÁLOGO PÚBLICO (sem autenticação):
* que serviços a empresa disponibiliza, que profissionais
* atendem, e que horários estão livres.
*
* Este serviço é o ÚNICO ponto que decide o que um visitante
* sem conta pode ver de uma empresa. É também a segunda
* metade da regra que a criação pública já aplicava: o
* catálogo mostra o que existe, e `AppointmentService.schedule`
* revalida tudo no momento de gravar.
*
* ==========================================================
* O QUE ESTE SERVIÇO NÃO FAZ
* ==========================================================
*
* Não duplica o cálculo de slots: delega em
* `AvailableSlotsBuilder`, que implementa as mesmas regras de
* `AvailabilityService.ensureEmployeeAvailable` e
* `AppointmentRepository.hasEmployeeConflict`.
*
* Não resolve serviço/profissional: delega em
* `PublicBookingEligibility`, a mesma definição de "ativo e do
* tenant" usada pela marcação.
*
* NÃO filtra profissionais por serviço, porque não existe
* qualquer relação serviço × profissional no modelo (ver
* `getAvailability`).
* ==========================================================
 */

import { DateTime } from "luxon";

import AppointmentRepository from "../../appointments/repositories/AppointmentRepository";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import UserRepository from "../../users/repositories/UserRepository";
import AvailabilityRepository from "../../availability/repositories/AvailabilityRepository";
import AvailabilityExceptionRepository from "../../availability/repositories/AvailabilityExceptionRepository";
import {
  buildAvailableSlots,
  BusyInterval,
} from "../../availability/services/AvailableSlotsBuilder";

import PublicBookingEligibility from "./PublicBookingEligibility";
import PublicBookingMapper from "../mappers/PublicBookingMapper";
import { PublicAvailabilityDto } from "../dto/PublicAvailability.dto";
import {
  PublicAvailabilityResult,
  PublicEmployeeResult,
  PublicServiceResult,
} from "../index";

import { DEFAULT_TIMEZONE, isValidIanaTimezone } from "../../../utils/timezone";
import { luxonWeekdayToDayOfWeek } from "../../../utils/timezone";

class PublicBookingService {
  private readonly appointmentRepository = AppointmentRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;
  private readonly availabilityRepository = AvailabilityRepository;
  private readonly availabilityExceptionRepository =
    AvailabilityExceptionRepository;

  /**
   * ==========================================================
   * Resolve o timezone a usar.
   *
   * O timezone da EMPRESA é a regra: `Europe/Lisbon` só entra
   * quando a empresa não tem um válido, o que na prática só
   * acontece em registos criados antes do campo existir ou
   * com um valor corrompido.
   * ==========================================================
   */
  private resolveTimezone(companyTimezone: string | undefined | null) {
    return isValidIanaTimezone(companyTimezone ?? "")
      ? (companyTimezone as string)
      : DEFAULT_TIMEZONE;
  }

  /**
   * ==========================================================
   * Serviços ativos da empresa.
   *
   * `requireActiveCompany` primeiro, para que uma empresa
   * inexistente, eliminada ou inativa nunca revele catálogo
   * nenhum — nem devolvendo `[]`, que confirmaria a existência
   * do tenant.
   * ==========================================================
   */
  public async listPublicServices(
    companyId: string,
  ): Promise<PublicServiceResult[]> {
    await PublicBookingEligibility.requireActiveCompany(companyId);

    const services =
      await this.serviceRepository.findActiveByCompanyId(companyId);

    return services.map(PublicBookingMapper.toPublicService);
  }

  /**
   * ==========================================================
   * Profissionais ativos da empresa, excluindo contas de acesso.
   *
   * A mesma regra de `requireBookableEmployee`: qualquer conta
   * que não seja `CLIENT` atende, incluindo dono e gestão,
   * porque `EMPLOYEE` é o valor por omissão no modelo.
   * ==========================================================
   */
  public async listPublicEmployees(
    companyId: string,
  ): Promise<PublicEmployeeResult[]> {
    await PublicBookingEligibility.requireActiveCompany(companyId);

    const employees =
      await this.userRepository.findActiveEmployeesByCompanyId(companyId);

    return employees.map(PublicBookingMapper.toPublicEmployee);
  }

  /**
   * ==========================================================
   * Horários disponíveis.
   *
   * O serviço e o profissional são validados com os mesmos
   * resolvers da marcação, pelo que um serviço desativado ou de
   * outra empresa é recusado com o mesmo código e a mesma
   * mensagem — o catálogo não pode oferecer o que a marcação
   * recusaria.
   *
   * ==========================================================
   * RELAÇÃO SERVIÇO × PROFISSIONAL
   * ==========================================================
   *
   * NÃO existe no modelo. Nenhum campo os liga, não há coleção
   * de ligação e `hasEmployeeConflict` filtra por profissional e
   * tempo, nunca por serviço. A criação pública também os
   * valida de forma independente.
   *
   * Consequência, e é intencional: o endpoint NÃO filtra
   * profissionais por serviço. Filtrar exigiria inventar uma
   * regra que o sistema não tem, e o resultado mentiria sobre o
   * que é possível marcar. Um serviço de 60 minutos apenas não
   * tem slots num período de 30 — é a duração que limita, e a
   * resposta a isso é uma lista vazia, não um erro.
   *
   * ==========================================================
   */
  public async getPublicAvailability(
    companyId: string,
    dto: PublicAvailabilityDto,
    now: Date = new Date(),
  ): Promise<PublicAvailabilityResult> {
    const company =
      await PublicBookingEligibility.requireActiveCompany(companyId);

    const service = await PublicBookingEligibility.requireActiveService(
      dto.serviceId,
      companyId,
    );

    const employee = await PublicBookingEligibility.requireBookableEmployee(
      dto.employeeId,
      companyId,
    );

    /**
     * A partir daqui tudo é filtrado pelo PROFISSIONAL pedido.
     * O serviço entra apenas pela duração, que define o passo
     * e o tamanho de cada slot.
     */
    const employeeId = employee._id;

    const timezone = this.resolveTimezone(company.timezone);

    /**
     * ------------------------------------------------------
     * Dia da semana no calendário LOCAL da empresa.
     *
     * O dia vem em texto e o dia da semana depende do fuso: em
     * Lisboa, "2026-10-05T23:30Z" já é dia 6. É por isso que o
     * `DateTime` é construído com a zona da empresa e não em
     * UTC.
     * ------------------------------------------------------
     */
    const day = DateTime.fromISO(dto.date, { zone: timezone });

    const dayOfWeek = luxonWeekdayToDayOfWeek(day.weekday);

    /**
     * ------------------------------------------------------
     * Disponibilidade semanal: a primeira consulta.
     *
     * É a que decide se o dia está aberto. Se não houver
     * período configurado para o dia da semana, o dia está
     * FECHADO e o resto das consultas é trabalho inútil — e dia
     * fechado é comum (fins de semana, folgas), num endpoint
     * público que qualquer visitor pode percorrer data a data.
     *
     * Por isso a disponibilidade vem primeiro e o resto é
     * procurado a seguir. A alternativa seria `Promise.all` com
     * as três, que poupa uma ida ao banco nos dias abertos ao
     * custo de pagar duas consultas nos dias fechados.
     * ------------------------------------------------------
     */
    const availability =
      await this.availabilityRepository.findByEmployeeAndDay(
        companyId,
        employeeId,
        dayOfWeek,
      );

    /**
     * Dia fechado: resposta normal de calendário, não um erro.
     */
    if (!availability) {
      return { date: dto.date, timezone, slots: [] };
    }

    /**
     * Exceções e agendamentos só interessam a um dia aberto.
     * As duas consultas correm em paralelo: são independentes e
     * é o que mantém a resposta num único tempo de ida ao banco.
     */
    const [exceptions, blocking] = await Promise.all([
      this.availabilityExceptionRepository.findByEmployeeAndDate(
        companyId,
        employeeId,
        dto.date,
      ),
      /**
       * Janela do dia local inteiro. Um slot nunca atravessa a
       * meia-noite, porque o próprio construtor o recusa.
       */
      this.appointmentRepository.findBlockingForEmployee(
        companyId,
        employeeId,
        day.startOf("day").toJSDate(),
        day.endOf("day").toJSDate(),
      ),
    ]);

    const slots = buildAvailableSlots({
      dateKey: dto.date,
      timezone,
      durationMinutes: service.duration,
      periods: {
        morningStart: availability.morningStart,
        morningEnd: availability.morningEnd,
        afternoonStart: availability.afternoonStart,
        afternoonEnd: availability.afternoonEnd,
      },
      exceptions: exceptions.map((exception) => ({
        allDay: exception.allDay,
        startTime: exception.startTime,
        endTime: exception.endTime,
      })),
      busy: blocking.map(
        (appointment): BusyInterval => ({
          startAt: appointment.startAt,
          endAt: appointment.endAt,
        }),
      ),
      now,
    });

    return { date: dto.date, timezone, slots };
  }
}

export default new PublicBookingService();