import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/core/utils/cn.js";

const trendStyles = {
  positive: "text-green-700",
  negative: "text-red-700",
  neutral: "text-slate-500",
};

export default function KpiCard({
  title,
  value,
  description,
  change,
  trend = "positive",
  icon,
  className,
}) {
  const TrendIcon = trend === "negative" ? ArrowDownRight : ArrowUpRight;

  return (
    <article
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {(change || description) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          {change && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trendStyles[trend] ?? trendStyles.neutral,
              )}
            >
              {trend !== "neutral" && (
                <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {change}
            </span>
          )}
          {description && <span className="text-slate-500">{description}</span>}
        </div>
      )}
    </article>
  );
}
