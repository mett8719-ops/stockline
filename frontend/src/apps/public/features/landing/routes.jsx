import LandingPage from "../../pages/LandingPage.jsx";
import {
  CguRoutePage,
  LegalNoticeRoutePage,
  PrivacyPolicyRoutePage,
} from "../../components/LegalRoutePages.jsx";

const routes = [
  { path: "/", element: <LandingPage />, public: true },
  { path: "/cgu", element: <CguRoutePage />, public: true },
  {
    path: "/confidentialite",
    element: <PrivacyPolicyRoutePage />,
    public: true,
  },
  {
    path: "/mentions-legales",
    element: <LegalNoticeRoutePage />,
    public: true,
  },
];

export default routes;
