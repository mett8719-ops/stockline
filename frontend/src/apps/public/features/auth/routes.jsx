import ForgotPasswordPage from "@/apps/public/pages/ForgotPasswordPage.jsx";
import LoginPage from "@/apps/public/pages/LoginPage.jsx";
import ResetPasswordPage from "@/apps/public/pages/ResetPasswordPage.jsx";

const authRoutes = [
  { path: "/login", element: <LoginPage />, public: true },
  { path: "/forgot-password", element: <ForgotPasswordPage />, public: true },
  { path: "/reset-password", element: <ResetPasswordPage />, public: true },
];

export default authRoutes;
