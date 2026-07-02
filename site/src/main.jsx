import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import { Suspense,lazy } from "react";

const Landing = lazy(()=>import("./pages/Landing.jsx"))
const Leaderboard = lazy(()=>import("./pages/Leaderboard.jsx"))
const PrintersPage = lazy(()=>import("./pages/PrintersPage.jsx"))

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
  <Suspense fallback={<pageSkeleton/>}>
    <RouterProvider router={router} />
  </Suspense>
);
