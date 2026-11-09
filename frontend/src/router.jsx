import { createBrowserRouter } from "react-router-dom";
import ComingSoon from "@/components/feedback/ComingSoon.jsx";
import PermissionRoute from "@/components/layout/PermissionRoute.jsx";
import PlatformRoute from "@/components/layout/PlatformRoute.jsx";
import ProtectedRoute from "@/components/layout/ProtectedRoute.jsx";
import RouteFallback from "@/components/layout/RouteFallback.jsx";

const routeModules = import.meta.glob("./apps/**/features/**/routes.jsx", {
  eager: true,
});

const discoveredRoutes = Object.entries(routeModules).flatMap(
  ([modulePath, routeModule]) => {
    if (!Array.isArray(routeModule.default)) {
      throw new TypeError(
        `Le module ${modulePath} doit exporter par défaut un tableau de routes.`,
      );
    }

    return routeModule.default.map((route) => ({
      ...route,
      public: route.public ?? modulePath.startsWith("./apps/public/"),
    }));
  },
);

function createRoute(route) {
  if (!route || typeof route.path !== "string" || !route.element) {
    throw new TypeError(
      "Chaque route doit définir un chemin et un élément React.",
    );
  }

  let element = route.element;

  if (route.permission) {
    element = (
      <PermissionRoute permission={route.permission}>
        {element}
      </PermissionRoute>
    );
  }

  if (route.platform) {
    element = <PlatformRoute>{element}</PlatformRoute>;
  } else if (route.public !== true) {
    element = <ProtectedRoute>{element}</ProtectedRoute>;
  }

  return { path: route.path, element };
}

export const router = createBrowserRouter([
  ...discoveredRoutes.map(createRoute),
  { path: "/coming-soon", element: <ComingSoon /> },
  { path: "*", element: <RouteFallback /> },
]);

export default router;
