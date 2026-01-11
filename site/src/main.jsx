import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";

import PrintersPage from "./pages/PrintersPage.jsx";
import Landing from "./pages/Landing.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Footer from "./components/Footer.jsx";

// actual routing
const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/printers",
    element: <PrintersPage />,
  },
  {
    path: "/leaderboard",
    element: <Leaderboard />,
  },
]);

// dom setup
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Footer />
  </StrictMode>
);
