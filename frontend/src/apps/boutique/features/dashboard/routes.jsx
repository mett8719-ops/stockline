import DashboardPage from "./pages/DashboardPage.jsx";

const dashboardRoutes = [
  {
    path: "/dashboard",
    element: <DashboardPage />,
    permission: "dashboard",
  },
];

export default dashboardRoutes;
