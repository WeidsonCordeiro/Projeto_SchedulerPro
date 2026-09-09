import { BrowserRouter } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import SessionBootstrap from "./SessionBootstrap";
import AppRoutes from "../routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <SessionBootstrap>
          <AppRoutes />
        </SessionBootstrap>
      </AppLayout>
    </BrowserRouter>
  );
}