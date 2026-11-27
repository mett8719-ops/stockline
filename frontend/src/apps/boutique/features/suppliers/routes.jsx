import SupplierDetailPage from "./pages/SupplierDetailPage.jsx";
import SuppliersPage from "./pages/SuppliersPage.jsx";

const supplierRoutes = [
  {
    path: "/suppliers",
    element: <SuppliersPage />,
    permission: "suppliers",
  },
  {
    path: "/suppliers/:supplierId",
    element: <SupplierDetailPage />,
    permission: "suppliers",
  },
];

export default supplierRoutes;
