/**

* ==========================================================
* Arquivo: PublicBookingMapper.ts
* ---
* Responsabilidade:
*
* Converter documentos Mongoose no contrato PÚBLICO de
* catálogo.
*
* Não existe mapper administrativo reutilizável para isto:
* `ServiceMapper` e `UserMapper` expõem `companyId`, `isActive`
* e timestamps, e `UserMapper` inclui o `publicId` do storage.
* Reutilizá-los seria exatamente o que o contrato público não
* pode fazer.
*
* ==========================================================
 */

import { ServiceDocument } from "../../services/models/Service.model";
import { UserDocument } from "../../users/models/User.model";
import { PublicEmployeeResult, PublicServiceResult } from "../index";

class PublicBookingMapper {
  /**
  * ==========================================================
  * Serviço público.
  *
  * `duration` (minutos) passa a `durationMinutes` e
  * `description` ausente passa a `null`, para que o contrato
  * tenha sempre a mesma forma.
  * ==========================================================
  */
  public toPublicService(service: ServiceDocument): PublicServiceResult {
    return {
      id: service._id.toString(),
      name: service.name,
      description: service.description ?? null,
      durationMinutes: service.duration,
      price: service.price,
    };
  }

  /**
  * ==========================================================
  * Profissional público.
  *
  * Só o `avatar.url`: o `publicId` do storage é a chave que
  * permite apagar a imagem e nunca sai do backend num pedido
  * público. Sem avatar, `null` — o frontend mostra as iniciais.
  * ==========================================================
  */
  public toPublicEmployee(employee: UserDocument): PublicEmployeeResult {
    return {
      id: employee._id.toString(),
      name: employee.name,
      avatarUrl: employee.avatar?.url ?? null,
    };
  }
}

export default new PublicBookingMapper();