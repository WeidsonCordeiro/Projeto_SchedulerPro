import { Suspense, type ReactNode } from "react";
import FullPageLoader from "../components/common/FullPageLoader";

export default function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;
}