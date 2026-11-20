import { cn } from "@/core/utils/cn.js";

const variants = {
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-slate-100 text-slate-700",
  platform: "bg-platform-100 text-platform-700",
};

export default function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variants[variant] ?? variants.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
