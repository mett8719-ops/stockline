import SettingsPage from "./pages/SettingsPage.jsx";

const settingsRoutes = [
  {
    path: "/settings",
    element: <SettingsPage />,
    permission: "settings",
  },
];

export default settingsRoutes;
