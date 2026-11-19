import FeatureFlagsPage from "./pages/FeatureFlagsPage.jsx";

const featureFlagRoutes = [
  {
    path: "/platform/feature-flags",
    element: <FeatureFlagsPage />,
    platform: true,
  },
];

export default featureFlagRoutes;
