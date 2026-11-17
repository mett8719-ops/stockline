import InventoryPage from "./pages/InventoryPage.jsx";

const inventoryRoutes = [
  {
    path: "/inventories",
    element: <InventoryPage />,
    permission: "inventory",
  },
];

export default inventoryRoutes;
