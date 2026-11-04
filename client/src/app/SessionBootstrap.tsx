import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppDispatch } from "../store";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import { clearCompany } from "../store/slices/companySlice";
import authApi from "../api/endpoints/auth.api";
import { loadSessionCompany, reconcileCompanySliceWithSession } from "./loadSessionCompany";

export default function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await authApi.getMe();
        if (!active) return;
        if (response.data) {
          dispatch(setCredentials(response.data));
          reconcileCompanySliceWithSession(dispatch, response.data);
          await loadSessionCompany(dispatch, response.data);
        } else {
          dispatch(clearCredentials());
          if (active) {
            dispatch(clearCompany());
          }
        }
      } catch {
        if (active) {
          dispatch(clearCredentials());
          dispatch(clearCompany());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}
