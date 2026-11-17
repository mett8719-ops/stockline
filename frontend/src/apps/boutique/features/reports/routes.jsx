import ReportsPage from "./pages/ReportsPage.jsx";

const routes = [
  {
    path: "/reports",
    element: <ReportsPage />,
    permission: "dashboard",
  },
];

export default routes;
