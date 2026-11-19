import TicketsPage from "./pages/TicketsPage.jsx";

const ticketRoutes = [
  {
    path: "/tickets",
    element: <TicketsPage />,
    permission: "tickets",
  },
  {
    path: "/platform/tickets",
    element: <TicketsPage platform />,
    platform: true,
  },
];

export default ticketRoutes;
