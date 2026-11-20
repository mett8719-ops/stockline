import PlatformLogsPage from "./pages/PlatformLogsPage.jsx";

const platformLogsRoutes = [
  {
    path: "/platform/logs",
    element: <PlatformLogsPage />,
    platform: true,
  },
];

export default platformLogsRoutes;
