import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ErrorCode } from "../../../constants/error-codes";
import { AppError } from "../../../errors/AppError";
import type { UserDocument } from "../../users/models/User.model";

type UserAccessCheck = Pick<
  UserDocument,
  "isActive" | "companyDeactivationSuspended"
>;

/**
 * Bloqueia utilizadores inactivos, distinguindo suspensão automática
 * pela desactivação da empresa de desactivação individual.
 */
export function assertUserIsActiveForAccess(user: UserAccessCheck): void {
  if (user.isActive) {
    return;
  }

  if (user.companyDeactivationSuspended) {
    throw new AppError(
      HttpMessages.USER_SUSPENDED_BY_COMPANY_DEACTIVATION,
      HttpStatus.FORBIDDEN,
      undefined,
      ErrorCode.USER_SUSPENDED_BY_COMPANY_DEACTIVATION,
    );
  }

  throw new AppError(
    HttpMessages.USER_DISABLED,
    HttpStatus.FORBIDDEN,
    undefined,
    ErrorCode.USER_INACTIVE,
  );
}
