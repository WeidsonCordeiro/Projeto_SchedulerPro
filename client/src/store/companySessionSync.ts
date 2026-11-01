import type { Company } from "../types/company";
import type { AppDispatch } from "./index";
import { setUserCompanyName } from "./slices/authSlice";
import { setCompany } from "./slices/companySlice";

export function commitCompanyToStore(company: Company) {
  return (dispatch: AppDispatch) => {
    dispatch(setCompany(company));
    dispatch(setUserCompanyName(company.name));
  };
}
