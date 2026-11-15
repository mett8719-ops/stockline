import PosRoute from "./PosRoute.jsx";
import MobilePosPage from "./pages/MobilePosPage.jsx";
import SalesHistoryPage from "./pages/SalesHistoryPage.jsx";

const routes = [
  {
    path: "/pos",
    element: <PosRoute />,
    permission: "pos",
  },
  {
    path: "/pos/mobile",
    element: <MobilePosPage />,
    permission: "pos",
  },
  {
    path: "/pos/history",
    element: <SalesHistoryPage />,
    permission: "pos",
  },
];

export default routes;
