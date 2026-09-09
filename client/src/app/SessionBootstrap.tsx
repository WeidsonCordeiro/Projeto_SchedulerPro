import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppDispatch } from "../store";
import { clearCredentials, setCredentials } from "../store/slices/authSlice";
import authApi from "../api/endpoints/auth.api";

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
        } else {
          dispatch(clearCredentials());
        }
      } catch {
        if (active) {
          dispatch(clearCredentials());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);

  return <>{children}</>;
}