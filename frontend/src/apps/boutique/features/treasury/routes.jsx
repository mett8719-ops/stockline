import TreasuryRoute from "./TreasuryRoute.jsx";

const routes = [
  {
    path: "/treasury",
    element: <TreasuryRoute />,
    permission: "treasury",
  },
];

export default routes;
