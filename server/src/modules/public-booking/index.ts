/**

* ==========================================================
* Arquivo: index.ts
* ---
* Responsabilidade:
*
* Tipagens do CONTRATO PÚBLICO de catálogo e disponibilidade
* (sem autenticação), da Stage 31 Parte 4.
*
* Estas interfaces são a fronteira pública: o que sai daqui é
* o que o frontend público pode ver. São deliberadamente mais
* estreitas do que `ServiceMapper` e `UserMapper`, que expõem
* `companyId`, `isActive` e timestamps para a interface
* administrativa.
*
* ==========================================================
* O QUE NÃO SAI
* ==========================================================
*
* • `companyId` — vem da URL; devolvê-lo confirmaria o tenant.
* • `_id` cru — o contrato usa `id`, como no agendamento público.
* • `isActive`, `deletedAt`, `createdAt`, `updatedAt` — estado
*   interno e auditoria.
* • `email`, `passwordHash`, `phone`, `role`, `permissions`,
*   `failedLoginAttempts`, `lockUntil`, `mustChangePassword` —
*   autenticação e segurança.
* • `avatar.publicId` — identificador do storage; a URL chega,
*   a chave nunca.
* • `notes`, `clientEmail`, `clientPhone` do agendamento — o
*   `Client` é um cadastro partilhado pela empresa e um link
*   público não pode reidentificar quem marca.
* ==========================================================
 */

/**
* ==========================================================
* Serviço no catálogo público.
* ==========================================================
*/
export interface PublicServiceResult {
  id: string;
  name: string;
  /** Descrição opcional; `null` quando a empresa não a preencheu. */
  description: string | null;
  /**
  * Duração em minutos.
  *
  * O modelo chama-lhe `duration`. O contrato público diz
  * `durationMinutes` porque é o que o consumidor precisa
  * distinguir, e é o mesmo nome usado internamente em
  * `ScheduleAppointmentInput.durationMinutes`.
  */
  durationMinutes: number;
  /** Preço de tabela da empresa. Não inclui moeda: o modelo não a tem. */
  price: number;
}

/**
* ==========================================================
* Profissional no catálogo público.
* ==========================================================
*/
export interface PublicEmployeeResult {
  id: string;
  name: string;
  /**
  * Foto do profissional, ou `null`.
  *
  * Apenas a `url`. O `publicId` do storage nunca sai do
  * backend num pedido público.
  */
  avatarUrl: string | null;
}

/**
* ==========================================================
* Horário disponível.
*
* Os instantes vão em ISO 8601 COM o offset da empresa, e não
* em `Z`: o frontend público tem de os renderizar no fuso da
* empresa e não no do browser de quem agendou.
* ==========================================================
*/
export interface PublicAvailabilitySlotResult {
  startAt: string;
  endAt: string;
}

/**
* ==========================================================
* Disponibilidade de um profissional para um serviço e uma data.
* ==========================================================
*/
export interface PublicAvailabilityResult {
  /** Data local da empresa pedida ("AAAA-MM-DD"), tal como foi pedida. */
  date: string;
  /**
  * Timezone IANA usado no cálculo.
  *
  * É devolvido porque o `POST` público exige `startAt` com
  * offset explícito: sem saber qual é, o frontend não consegue
  * montar um instante que o servidor vai interpretar da mesma
  * forma.
  */
  timezone: string;
  slots: PublicAvailabilitySlotResult[];
}