import PosRoute from "./PosRoute.jsx";

const routes = [
  {
    path: "/pos",
    element: <PosRoute />,
    permission: "pos",
  },
];

export default routes;
