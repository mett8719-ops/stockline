import UsersPage from "./pages/UsersPage.jsx";

const userRoutes = [
  {
    path: "/users",
    element: <UsersPage />,
    permission: "users",
  },
];

export default userRoutes;
