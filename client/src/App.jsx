//Hooks
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

//Hooks
import { useContext } from "react";

//Context
import { AuthContext } from "./context/AuthContext";

//Css
import "./App.css";

//Pages
import Home from "./pages/Home/Home";
import Register from "./pages/Register/Register";
import Login from "./pages/login/Login";
import Profile from "./pages/Profile/Profile";

function App() {
  const { user } = useContext(AuthContext);

  return (
    <>
      {/* <LoadingSpinner /> */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Home /> : <Register />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" /> : <Register />}
          />
          <Route
            path="/profile/:username"
            element={user ? <Profile /> : <Navigate to="/" />}
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
