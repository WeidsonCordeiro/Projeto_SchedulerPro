import JwtProvider from "./src/providers/security/JwtProvider";
import { TokenType } from "./src/constants/token-type";
import { Role } from "./src/constants/roles";

const token = JwtProvider.generateEmailVerificationToken({
  userId: "6a7a0415fab736f8ef9dedbd",
  companyId: "6a687c5618c225255bdd7620",
  role: Role.EMPLOYEE,
  type: TokenType.EMAIL_VERIFICATION,
});

console.log(token);
