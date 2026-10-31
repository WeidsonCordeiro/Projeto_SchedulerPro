import { Role } from "../../../constants/roles";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { AppError } from "../../../errors/AppError";
import type { CompanyDocument } from "../../companies/models/Company.model";
import type { UserDocument } from "../../users/models/User.model";

/**
 * Bloqueia autenticação de não-OWNER quando a empresa está desactivada.
 * O OWNER mantém login para consultar e reactivar a empresa.
 */
export function assertUserMayAuthenticateAgainstCompany(
  user: Pick<UserDocument, "role">,
  company: Pick<CompanyDocument, "isActive"> | null,
): void {
  if (!company) {
    throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (company.isActive || user.role === Role.OWNER) {
    return;
  }

  throw new AppError(
    HttpMessages.COMPANY_INACTIVE_ACCESS,
    HttpStatus.FORBIDDEN,
  );
}
