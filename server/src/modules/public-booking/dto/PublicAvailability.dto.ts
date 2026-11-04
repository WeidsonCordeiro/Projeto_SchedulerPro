/**

* ==========================================================
* Arquivo: PublicAvailability.dto.ts
* ---
* Responsabilidade:
*
* Tipagem dos parâmetros recebidos na consulta de
* disponibilidade pública.
*
* O `companyId` NÃO entra aqui: o tenant vem da URL
* (`:companyId`) e nunca de um parâmetro do pedido. É essa
* separação que impede que um pedido público consulte a agenda
* de outra empresa.
* ==========================================================
 */

/**
* ==========================================================
* Parâmetros da consulta de horários disponíveis.
* ==========================================================
*/
export interface PublicAvailabilityDto {
  /** Serviço cuja duração define o passo dos slots. */
  serviceId: string;
  /** Profissional a consultar. */
  employeeId: string;
  /** Dia no calendário local da empresa ("AAAA-MM-DD"). */
  date: string;
}