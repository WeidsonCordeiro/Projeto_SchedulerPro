import { BrowserRouter } from "react-router-dom";
import SessionBootstrap from "./SessionBootstrap";
import DocumentTitle from "./DocumentTitle";
import AppRoutes from "../routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <DocumentTitle />
      <SessionBootstrap>
        <AppRoutes />
      </SessionBootstrap>
    </BrowserRouter>
  );
}
