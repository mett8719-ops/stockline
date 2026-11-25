import DocumentsRoute from "./DocumentsRoute.jsx";

const routes = [
  {
    path: "/documents",
    element: <DocumentsRoute />,
    permission: "documents",
  },
];

export default routes;
