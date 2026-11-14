import StockPage from "./pages/StockPage.jsx";

const stockRoutes = [
  {
    path: "/stock",
    element: <StockPage />,
    permission: "stock",
  },
];

export default stockRoutes;
