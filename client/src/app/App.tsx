import { BrowserRouter } from "react-router-dom";
import SessionBootstrap from "./SessionBootstrap";
import AppRoutes from "../routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <SessionBootstrap>
        <AppRoutes />
      </SessionBootstrap>
    </BrowserRouter>
  );
}
