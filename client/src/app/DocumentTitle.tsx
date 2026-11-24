import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolvePageTitle } from "../config/pageTitles";

export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = resolvePageTitle(pathname);
  }, [pathname]);

  return null;
}