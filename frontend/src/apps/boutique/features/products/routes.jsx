import ProductsPage from "./pages/ProductsPage.jsx";

const productRoutes = [
  {
    path: "/products",
    element: <ProductsPage />,
    permission: "products",
  },
];

export default productRoutes;
