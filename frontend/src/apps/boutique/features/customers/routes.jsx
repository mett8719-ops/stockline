import CustomerDetailPage from "./pages/CustomerDetailPage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";

const customerRoutes = [
  {
    path: "/customers",
    element: <CustomersPage />,
    permission: "customers",
  },
  {
    path: "/customers/:customerId",
    element: <CustomerDetailPage />,
    permission: "customers",
  },
];

export default customerRoutes;
