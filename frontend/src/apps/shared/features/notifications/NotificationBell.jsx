import { Bell } from "lucide-react";

export default function NotificationBell() {
  return (
    <button
      aria-label="Notifications"
      className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      title="Notifications"
      type="button"
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
