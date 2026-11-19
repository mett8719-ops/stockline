import PlatformSettingsPage from "./pages/PlatformSettingsPage.jsx";

const platformSettingsRoutes = [
  {
    path: "/platform/settings",
    element: <PlatformSettingsPage />,
    platform: true,
  },
];

export default platformSettingsRoutes;
